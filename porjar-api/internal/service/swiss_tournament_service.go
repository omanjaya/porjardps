package service

import (
	"context"
	"fmt"
	"log/slog"
	"sort"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// InitSwissGroup creates a single swiss-mode group for a tournament.
func (s *GroupService) InitSwissGroup(ctx context.Context, tournamentID uuid.UUID, name string, config model.SwissConfig) (*model.TournamentGroup, error) {
	if config.MaxRounds < 1 {
		return nil, apperror.BusinessRule("INVALID_CONFIG", "max_rounds harus minimal 1")
	}
	if config.WinThreshold < 1 {
		return nil, apperror.BusinessRule("INVALID_CONFIG", "win_threshold harus minimal 1")
	}
	if config.LossThreshold < 1 {
		return nil, apperror.BusinessRule("INVALID_CONFIG", "loss_threshold harus minimal 1")
	}

	t, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "find tournament")
	}
	if t == nil {
		return nil, apperror.NotFound("tournament")
	}

	teams, err := s.ttRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list tournament teams")
	}
	if len(teams) < 4 {
		return nil, apperror.BusinessRule("NOT_ENOUGH_TEAMS", "Swiss system membutuhkan minimal 4 tim")
	}

	config.CurrentRound = 0
	g := &model.TournamentGroup{
		TournamentID: tournamentID,
		Name:         name,
		GroupOrder:   1,
		AdvanceCount: 0,
		Legs:         1,
		PairingMode:  "swiss",
		SwissConfig:  &config,
	}
	if err := s.groupRepo.CreateGroup(ctx, g); err != nil {
		return nil, apperror.Wrap(err, "create swiss group")
	}

	// Add all teams to group and initialize standings
	for _, tt := range teams {
		if err := s.groupRepo.AddTeamToGroup(ctx, g.ID, tt.TeamID); err != nil {
			return nil, apperror.Wrap(err, "add team to swiss group")
		}
		st := &model.GroupStanding{
			GroupID: g.ID,
			TeamID:  tt.TeamID,
		}
		if err := s.groupRepo.UpsertStanding(ctx, st); err != nil {
			slog.Error("failed to init swiss standing", "error", err)
		}
	}

	return g, nil
}

// GenerateSwissRound generates the next round of Swiss pairings.
func (s *GroupService) GenerateSwissRound(ctx context.Context, groupID uuid.UUID) ([]*model.GroupMatch, error) {
	g, err := s.groupRepo.FindGroupByID(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "find group")
	}
	if g == nil {
		return nil, apperror.NotFound("group")
	}
	if g.PairingMode != "swiss" {
		return nil, apperror.BusinessRule("NOT_SWISS", "Grup ini bukan mode Swiss")
	}
	if g.SwissConfig == nil {
		return nil, apperror.BusinessRule("NO_CONFIG", "Swiss config tidak ditemukan")
	}

	cfg := g.SwissConfig
	if cfg.CurrentRound >= cfg.MaxRounds {
		return nil, apperror.BusinessRule("MAX_ROUNDS", "Semua ronde Swiss sudah selesai")
	}

	// Check all matches in current round are completed (if not first round)
	if cfg.CurrentRound > 0 {
		matches, err := s.groupRepo.FindMatchesByGroup(ctx, groupID)
		if err != nil {
			return nil, apperror.Wrap(err, "find matches")
		}
		for _, m := range matches {
			if m.Round == cfg.CurrentRound && m.Status != "completed" {
				return nil, apperror.BusinessRule("ROUND_NOT_COMPLETE",
					fmt.Sprintf("Ronde %d masih ada pertandingan belum selesai", cfg.CurrentRound))
			}
		}
	}

	// Load standings sorted by points desc
	standings, err := s.groupRepo.FindStandingsByGroup(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "find standings")
	}
	sort.SliceStable(standings, func(i, j int) bool {
		return standings[i].Points > standings[j].Points
	})

	// Build rematch set from existing matches
	existingMatches, err := s.groupRepo.FindMatchesByGroup(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "find existing matches")
	}
	playedSet := make(map[string]bool)
	for _, m := range existingMatches {
		if m.TeamAID != nil && m.TeamBID != nil {
			key := swissPairKey(*m.TeamAID, *m.TeamBID)
			playedSet[key] = true
		}
	}

	// Filter out qualified and eliminated teams
	var active []*model.GroupStanding
	for _, st := range standings {
		if st.Wins >= cfg.WinThreshold {
			continue // qualified
		}
		if st.Losses >= cfg.LossThreshold {
			continue // eliminated
		}
		active = append(active, st)
	}

	if len(active) < 2 {
		return nil, apperror.BusinessRule("NOT_ENOUGH_ACTIVE", "Tidak cukup tim aktif untuk ronde berikutnya")
	}

	// Pair active teams using slide pairing with rematch avoidance
	pairs := swissPair(active, playedSet)

	// Handle BYE: if odd number of active teams, last unpaired gets BYE
	pairedTeams := make(map[uuid.UUID]bool)
	for _, p := range pairs {
		pairedTeams[p[0]] = true
		pairedTeams[p[1]] = true
	}

	newRound := cfg.CurrentRound + 1
	var newMatches []*model.GroupMatch
	matchNum := 1

	for _, p := range pairs {
		teamA := p[0]
		teamB := p[1]
		m := &model.GroupMatch{
			GroupID:     groupID,
			Round:       newRound,
			MatchNumber: matchNum,
			TeamAID:     &teamA,
			TeamBID:     &teamB,
			Status:      "pending",
		}
		if err := s.groupRepo.CreateMatch(ctx, m); err != nil {
			return nil, apperror.Wrap(err, "create swiss match")
		}
		newMatches = append(newMatches, m)
		matchNum++
	}

	// BYE for unpaired active team
	for _, st := range active {
		if !pairedTeams[st.TeamID] {
			teamID := st.TeamID
			m := &model.GroupMatch{
				GroupID:     groupID,
				Round:       newRound,
				MatchNumber: matchNum,
				TeamAID:     &teamID,
				TeamBID:     nil,
				ScoreA:      1,
				ScoreB:      0,
				Status:      "completed",
			}
			if err := s.groupRepo.CreateMatch(ctx, m); err != nil {
				return nil, apperror.Wrap(err, "create bye match")
			}
			newMatches = append(newMatches, m)
			matchNum++
		}
	}

	// Increment current_round and save swiss_config
	cfg.CurrentRound = newRound
	if err := s.groupRepo.UpdateSwissConfig(ctx, groupID, cfg); err != nil {
		return nil, apperror.Wrap(err, "update swiss config")
	}

	// Recalculate standings (BYE matches are already completed)
	if err := s.recalculateStandings(ctx, groupID); err != nil {
		slog.Error("failed to recalculate standings after swiss round", "group_id", groupID, "error", err)
	}

	s.broadcastGroupUpdate(g.TournamentID, "swiss_round_generated")

	return newMatches, nil
}

// GetSwissStatus returns Swiss tournament progress info.
func (s *GroupService) GetSwissStatus(ctx context.Context, groupID uuid.UUID) (map[string]interface{}, error) {
	g, err := s.groupRepo.FindGroupByID(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "find group")
	}
	if g == nil {
		return nil, apperror.NotFound("group")
	}
	if g.PairingMode != "swiss" || g.SwissConfig == nil {
		return nil, apperror.BusinessRule("NOT_SWISS", "Grup ini bukan mode Swiss")
	}

	standings, err := s.groupRepo.FindStandingsByGroup(ctx, groupID)
	if err != nil {
		return nil, apperror.Wrap(err, "find standings")
	}

	cfg := g.SwissConfig
	qualifiedCount := 0
	eliminatedCount := 0
	activeCount := 0

	for _, st := range standings {
		if st.Wins >= cfg.WinThreshold {
			qualifiedCount++
		} else if st.Losses >= cfg.LossThreshold {
			eliminatedCount++
		} else {
			activeCount++
		}
	}

	isComplete := activeCount == 0 || cfg.CurrentRound >= cfg.MaxRounds
	if isComplete {
		s.maybeCrownStandaloneSwissChampion(ctx, g, standings)
	}

	return map[string]interface{}{
		"current_round":   cfg.CurrentRound,
		"max_rounds":      cfg.MaxRounds,
		"win_threshold":   cfg.WinThreshold,
		"loss_threshold":  cfg.LossThreshold,
		"qualified_count": qualifiedCount,
		"eliminated_count": eliminatedCount,
		"active_count":    activeCount,
		"is_complete":     isComplete,
	}, nil
}

// maybeCrownStandaloneSwissChampion crowns the rank-1 team as champion once a
// STANDALONE swiss tournament (format == "swiss") has all its matches completed.
// Swiss groups inside a multi_stage tournament advance via stage_service instead,
// so this gates strictly on the tournament's own format. Idempotent + best-effort.
func (s *GroupService) maybeCrownStandaloneSwissChampion(ctx context.Context, g *model.TournamentGroup, standings []*model.GroupStanding) {
	if s.tournamentSvc == nil {
		return
	}
	t, err := s.tournamentRepo.FindByID(ctx, g.TournamentID)
	if err != nil || t == nil {
		return
	}
	if t.Format != "swiss" || t.Status == "completed" {
		return
	}
	// is_complete can be true while the final round's matches are still pending —
	// require every match in the group to be completed before crowning.
	matches, err := s.groupRepo.FindMatchesByGroup(ctx, g.ID)
	if err != nil {
		slog.Error("swiss champion: list matches", "group_id", g.ID, "error", err)
		return
	}
	for _, m := range matches {
		if m.Status != "completed" {
			return
		}
	}
	for _, st := range standings {
		if st.RankPosition == 1 {
			if err := s.tournamentSvc.SetChampion(ctx, g.TournamentID, st.TeamID); err != nil {
				slog.Error("swiss champion: set", "tournament_id", g.TournamentID, "error", err)
			}
			break
		}
	}
}

func swissPair(active []*model.GroupStanding, playedSet map[string]bool) [][2]uuid.UUID {
	var pairs [][2]uuid.UUID
	used := make(map[uuid.UUID]bool)

	for i := 0; i < len(active); i++ {
		if used[active[i].TeamID] {
			continue
		}
		paired := false
		for j := i + 1; j < len(active); j++ {
			if used[active[j].TeamID] {
				continue
			}
			key := swissPairKey(active[i].TeamID, active[j].TeamID)
			if !playedSet[key] {
				pairs = append(pairs, [2]uuid.UUID{active[i].TeamID, active[j].TeamID})
				used[active[i].TeamID] = true
				used[active[j].TeamID] = true
				paired = true
				break
			}
		}
		// Fallback: accept rematch if no other option
		if !paired && !used[active[i].TeamID] {
			for j := i + 1; j < len(active); j++ {
				if used[active[j].TeamID] {
					continue
				}
				pairs = append(pairs, [2]uuid.UUID{active[i].TeamID, active[j].TeamID})
				used[active[i].TeamID] = true
				used[active[j].TeamID] = true
				break
			}
		}
	}
	return pairs
}

func swissPairKey(a, b uuid.UUID) string {
	as, bs := a.String(), b.String()
	if as < bs {
		return as + "_" + bs
	}
	return bs + "_" + as
}
