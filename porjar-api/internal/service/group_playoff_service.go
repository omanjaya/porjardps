package service

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"sort"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// ResetGroupResults resets all match results, submissions, and standings for all groups in a tournament.
func (s *GroupService) ResetGroupResults(ctx context.Context, tournamentID uuid.UUID) error {
	groups, err := s.groupRepo.FindGroupsByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "find groups")
	}
	for _, g := range groups {
		if err := s.groupRepo.ResetMatchResultsByGroup(ctx, g.ID); err != nil {
			return apperror.Wrap(err, fmt.Sprintf("reset group %s", g.Name))
		}
		// Recalculate (empty) standings
		if err := s.recalculateStandings(ctx, g.ID); err != nil {
			slog.Error("failed to recalculate standings after reset", "group_id", g.ID, "error", err)
		}
	}
	return nil
}

// ResetSingleGroupResults resets match results for a single group.
func (s *GroupService) ResetSingleGroupResults(ctx context.Context, groupID uuid.UUID) error {
	if err := s.groupRepo.ResetMatchResultsByGroup(ctx, groupID); err != nil {
		return apperror.Wrap(err, "reset group results")
	}
	if err := s.recalculateStandings(ctx, groupID); err != nil {
		slog.Error("failed to recalculate standings after reset", "group_id", groupID, "error", err)
	}
	return nil
}

// CheckAndAdvanceToPlayoff checks if all group matches are complete, then generates a bracket.
func (s *GroupService) CheckAndAdvanceToPlayoff(ctx context.Context, tournamentID uuid.UUID) (bool, error) {
	groups, err := s.groupRepo.FindGroupsByTournament(ctx, tournamentID)
	if err != nil {
		return false, apperror.Wrap(err, "find groups")
	}
	if len(groups) == 0 {
		return false, apperror.BusinessRule("NO_GROUPS", "Turnamen belum memiliki grup")
	}

	for _, g := range groups {
		matches, err := s.groupRepo.FindMatchesByGroup(ctx, g.ID)
		if err != nil {
			return false, apperror.Wrap(err, "find group matches")
		}
		for _, m := range matches {
			if m.Status != "completed" {
				return false, apperror.BusinessRule("MATCHES_NOT_COMPLETE",
					fmt.Sprintf("Grup %s masih ada pertandingan belum selesai", g.Name))
			}
		}
	}

	// Validate advance_count vs actual team count per group
	for _, g := range groups {
		standings, err := s.groupRepo.FindStandingsByGroup(ctx, g.ID)
		if err != nil {
			return false, apperror.Wrap(err, "find standings for validation")
		}
		if g.AdvanceCount > len(standings) {
			return false, apperror.BusinessRule("ADVANCE_COUNT_EXCEEDS_TEAMS",
				fmt.Sprintf("Grup %s: jumlah lolos (%d) melebihi jumlah tim (%d)", g.Name, g.AdvanceCount, len(standings)))
		}
	}

	// Collect advancing teams grouped by rank position for cross-group seeding
	byPosition := make(map[int][]uuid.UUID) // position (1-based) -> team IDs in group order
	maxAdvance := 0
	for _, g := range groups {
		standings, _ := s.groupRepo.FindStandingsByGroup(ctx, g.ID)
		sort.Slice(standings, func(i, j int) bool {
			return standings[i].RankPosition < standings[j].RankPosition
		})
		for i, st := range standings {
			if i >= g.AdvanceCount {
				break
			}
			pos := i + 1
			byPosition[pos] = append(byPosition[pos], st.TeamID)
			if pos > maxAdvance {
				maxAdvance = pos
			}
		}
	}

	// Build seeded bracket order: interleave 1st place vs reversed 2nd place
	// so teams from the same group meet as late as possible.
	var advancingTeams []uuid.UUID
	numGroups := len(groups)

	if maxAdvance >= 2 && numGroups >= 2 {
		firsts := byPosition[1]  // [A1, B1, C1, D1]
		seconds := byPosition[2] // [A2, B2, C2, D2]

		// Reverse seconds for cross-matching
		reversedSeconds := make([]uuid.UUID, len(seconds))
		for i, t := range seconds {
			reversedSeconds[len(seconds)-1-i] = t
		}

		// Interleave: A1, D2, B1, C2, ...
		for i := 0; i < numGroups; i++ {
			if i < len(firsts) {
				advancingTeams = append(advancingTeams, firsts[i])
			}
			if i < len(reversedSeconds) {
				advancingTeams = append(advancingTeams, reversedSeconds[i])
			}
		}

		// Append remaining positions (3rd, 4th, etc.) if advanceCount > 2
		for pos := 3; pos <= maxAdvance; pos++ {
			advancingTeams = append(advancingTeams, byPosition[pos]...)
		}
	} else {
		// Fallback: single group or single advance — just collect sequentially
		for pos := 1; pos <= maxAdvance; pos++ {
			advancingTeams = append(advancingTeams, byPosition[pos]...)
		}
	}

	if len(advancingTeams) < 2 {
		return false, apperror.BusinessRule("NOT_ENOUGH_ADVANCING", "Minimal 2 tim lolos")
	}

	// Pad to power of 2
	bracketSize := 1
	for bracketSize < len(advancingTeams) {
		bracketSize *= 2
	}

	if s.bracketRepo == nil {
		return false, apperror.ErrInternal
	}

	// Delete existing bracket
	existing, _ := s.bracketRepo.ListByTournament(ctx, tournamentID)
	for _, m := range existing {
		_ = s.bracketRepo.Delete(ctx, m.ID)
	}

	// Generate single elimination
	winnersRounds := int(math.Log2(float64(bracketSize)))
	allIDs := make([]uuid.UUID, bracketSize-1)
	for i := range allIDs {
		allIDs[i] = uuid.New()
	}
	n := len(advancingTeams)
	var allMatches []*model.BracketMatch
	matchIdx := 0

	// Round 1
	r1Count := bracketSize / 2
	for i := 0; i < r1Count; i++ {
		pos := "winners"
		m := &model.BracketMatch{
			ID: allIDs[matchIdx], TournamentID: tournamentID,
			Round: 1, MatchNumber: i + 1, BracketPosition: &pos,
			Status: "pending", BestOf: 1,
		}
		seedA, seedB := i*2, i*2+1
		if seedA < n {
			m.TeamAID = &advancingTeams[seedA]
		}
		if seedB < n {
			m.TeamBID = &advancingTeams[seedB]
		}
		if m.TeamAID != nil && m.TeamBID == nil {
			m.Status = "bye"
			m.WinnerID = m.TeamAID
		} else if m.TeamAID == nil && m.TeamBID != nil {
			m.Status = "bye"
			m.WinnerID = m.TeamBID
		} else if m.TeamAID == nil && m.TeamBID == nil {
			m.Status = "bye"
		}
		allMatches = append(allMatches, m)
		matchIdx++
	}

	// Subsequent rounds
	prevStart, prevCount := 0, r1Count
	for round := 2; round <= winnersRounds; round++ {
		roundCount := prevCount / 2
		for i := 0; i < roundCount; i++ {
			pos := "winners"
			m := &model.BracketMatch{
				ID: allIDs[matchIdx], TournamentID: tournamentID,
				Round: round, MatchNumber: i + 1, BracketPosition: &pos,
				Status: "pending", BestOf: 1,
			}
			nextID := m.ID
			allMatches[prevStart+i*2].NextMatchID = &nextID
			allMatches[prevStart+i*2+1].NextMatchID = &nextID

			f1, f2 := allMatches[prevStart+i*2], allMatches[prevStart+i*2+1]
			if f1.Status == "bye" && f1.WinnerID != nil {
				m.TeamAID = f1.WinnerID
			}
			if f2.Status == "bye" && f2.WinnerID != nil {
				m.TeamBID = f2.WinnerID
			}
			if m.TeamAID != nil && m.TeamBID == nil && f2.Status == "bye" && f2.WinnerID == nil {
				m.Status = "bye"
				m.WinnerID = m.TeamAID
			}
			allMatches = append(allMatches, m)
			matchIdx++
		}
		prevStart += prevCount
		prevCount = roundCount
	}

	// Set the final round matches to tournament.BestOf (if > 1)
	t, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err == nil && t != nil && t.BestOf > 1 {
		maxRound := 0
		for _, m := range allMatches {
			if m.Round > maxRound {
				maxRound = m.Round
			}
		}
		for _, m := range allMatches {
			if m.Round == maxRound {
				m.BestOf = t.BestOf
			}
		}
	}

	for _, m := range allMatches {
		if err := s.bracketRepo.Create(ctx, m); err != nil {
			return false, apperror.Wrap(err, "create bracket match")
		}
	}

	slog.Info("playoff bracket generated", "tournament", tournamentID, "teams", n, "bracket_size", bracketSize)
	return true, nil
}
