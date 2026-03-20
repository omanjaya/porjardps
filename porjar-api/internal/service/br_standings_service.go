package service

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// recalculateStandings aggregates all lobby results per team and updates standings
func (s *BRService) recalculateStandings(ctx context.Context, tournamentID uuid.UUID) error {
	// Get all lobbies for this tournament
	lobbies, err := s.lobbyRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return fmt.Errorf("list lobbies: %w", err)
	}

	// Aggregate results per team
	type teamAgg struct {
		totalPoints          int
		totalKills           int
		totalPlacementPoints int
		matchesPlayed        int
		bestPlacement        int
		sumPlacement         int
	}
	agg := make(map[uuid.UUID]*teamAgg)

	for _, lobby := range lobbies {
		results, err := s.resultRepo.ListByLobby(ctx, lobby.ID)
		if err != nil {
			return fmt.Errorf("list lobby results: %w", err)
		}

		for _, r := range results {
			a, ok := agg[r.TeamID]
			if !ok {
				a = &teamAgg{bestPlacement: r.Placement}
				agg[r.TeamID] = a
			}
			a.totalPoints += r.TotalPoints
			a.totalKills += r.Kills
			a.totalPlacementPoints += r.PlacementPoints
			a.matchesPlayed++
			a.sumPlacement += r.Placement
			if r.Placement < a.bestPlacement {
				a.bestPlacement = r.Placement
			}
		}
	}

	// Deduct penalties from standings totals
	if s.penaltyRepo != nil {
		penalties, penErr := s.penaltyRepo.FindByTournament(ctx, tournamentID)
		if penErr != nil {
			return fmt.Errorf("find penalties: %w", penErr)
		}
		for _, p := range penalties {
			a, ok := agg[p.TeamID]
			if ok {
				a.totalPoints -= p.Points
			}
		}
	}

	// Upsert standings for each team
	var standings []*model.Standing
	for teamID, a := range agg {
		bestP := a.bestPlacement
		avgP := float64(a.sumPlacement) / float64(a.matchesPlayed)

		standing := &model.Standing{
			ID:                   uuid.New(),
			TournamentID:         tournamentID,
			TeamID:               teamID,
			MatchesPlayed:        a.matchesPlayed,
			TotalPoints:          a.totalPoints,
			TotalKills:           a.totalKills,
			TotalPlacementPoints: a.totalPlacementPoints,
			BestPlacement:        &bestP,
			AvgPlacement:         &avgP,
		}
		standings = append(standings, standing)
	}

	if err := s.standingsRepo.BulkUpsert(ctx, standings); err != nil {
		return fmt.Errorf("bulk upsert standings: %w", err)
	}

	// Update rank positions
	if err := s.standingsRepo.UpdateRankPositions(ctx, tournamentID); err != nil {
		return fmt.Errorf("update rank positions: %w", err)
	}

	return nil
}

// broadcastResults sends WebSocket updates for results and standings
func (s *BRService) broadcastResults(tournamentID, lobbyID uuid.UUID) {
	room := fmt.Sprintf("tournament:%s", tournamentID.String())

	// Broadcast BR result update
	resultData, err := ws.NewBroadcastData("br_result_update", map[string]interface{}{
		"tournament_id": tournamentID,
		"lobby_id":      lobbyID,
	})
	if err != nil {
		slog.Error("ws broadcast br_result_update marshal error", "error", err)
	} else {
		s.hub.BroadcastToRoom(room, resultData)
	}

	// Broadcast standings update
	standingsData, err := ws.NewBroadcastData("standings_update", map[string]interface{}{
		"tournament_id": tournamentID,
	})
	if err != nil {
		slog.Error("ws broadcast standings_update marshal error", "error", err)
	} else {
		s.hub.BroadcastToRoom(room, standingsData)
	}
}

// CalculateDailyStandings aggregates results for a specific day only
func (s *BRService) CalculateDailyStandings(ctx context.Context, tournamentID uuid.UUID, dayNumber int) error {
	if s.dailyStandingsRepo == nil {
		return apperror.BusinessRule("NOT_CONFIGURED", "Daily standings belum dikonfigurasi")
	}

	// Get all lobbies for this tournament on this day
	lobbies, err := s.lobbyRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list lobbies")
	}

	// Aggregate results per team for this day only
	type teamAgg struct {
		totalPoints int
		totalKills  int
	}
	agg := make(map[uuid.UUID]*teamAgg)

	for _, lobby := range lobbies {
		if lobby.DayNumber != dayNumber {
			continue
		}

		results, err := s.resultRepo.ListByLobby(ctx, lobby.ID)
		if err != nil {
			return apperror.Wrap(err, "list lobby results")
		}

		for _, r := range results {
			a, ok := agg[r.TeamID]
			if !ok {
				a = &teamAgg{}
				agg[r.TeamID] = a
			}
			a.totalPoints += r.TotalPoints
			a.totalKills += r.Kills
		}
	}

	// Upsert daily standings for each team
	for teamID, a := range agg {
		standing := &model.BRDailyStanding{
			ID:           uuid.New(),
			TournamentID: tournamentID,
			TeamID:       teamID,
			DayNumber:    dayNumber,
			TotalPoints:  a.totalPoints,
			TotalKills:   a.totalKills,
		}
		if err := s.dailyStandingsRepo.Upsert(ctx, standing); err != nil {
			return apperror.Wrap(err, "upsert daily standing")
		}
	}

	// Update rank positions for this day
	if err := s.dailyStandingsRepo.UpdateRanks(ctx, tournamentID, dayNumber); err != nil {
		return apperror.Wrap(err, "update daily ranks")
	}

	return nil
}

// GetDailyStandings returns standings for a specific day
func (s *BRService) GetDailyStandings(ctx context.Context, tournamentID uuid.UUID, dayNumber int) ([]*model.BRDailyStanding, error) {
	if s.dailyStandingsRepo == nil {
		return nil, apperror.BusinessRule("NOT_CONFIGURED", "Daily standings belum dikonfigurasi")
	}

	standings, err := s.dailyStandingsRepo.FindByTournamentAndDay(ctx, tournamentID, dayNumber)
	if err != nil {
		return nil, apperror.Wrap(err, "get daily standings")
	}

	return standings, nil
}

// CheckQualification compares total_points against tournament.QualificationThreshold
func (s *BRService) CheckQualification(ctx context.Context, tournamentID uuid.UUID) (qualified []*model.Team, eliminated []*model.Team, err error) {
	if s.tournamentRepo == nil {
		return nil, nil, apperror.BusinessRule("NOT_CONFIGURED", "Tournament repo belum dikonfigurasi")
	}

	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return nil, nil, apperror.NotFound("TOURNAMENT")
	}

	if tournament.QualificationThreshold == nil {
		return nil, nil, apperror.BusinessRule("NO_THRESHOLD", "Turnamen ini belum memiliki batas kualifikasi")
	}

	threshold := *tournament.QualificationThreshold

	// Get overall standings
	standings, err := s.standingsRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, nil, apperror.Wrap(err, "list standings")
	}

	// Get approved teams for team details
	teams, err := s.ttRepo.ListApprovedTeams(ctx, tournamentID)
	if err != nil {
		return nil, nil, apperror.Wrap(err, "list teams")
	}

	teamMap := make(map[uuid.UUID]*model.Team)
	for _, t := range teams {
		teamMap[t.ID] = t
	}

	for _, s := range standings {
		team := teamMap[s.TeamID]
		if team == nil {
			continue
		}

		if s.TotalPoints >= threshold {
			qualified = append(qualified, team)
		} else {
			eliminated = append(eliminated, team)
		}
	}

	return qualified, eliminated, nil
}

// AdvanceToFinals marks qualified teams and eliminates the rest
func (s *BRService) AdvanceToFinals(ctx context.Context, tournamentID uuid.UUID, qualifiedTeamIDs []uuid.UUID) error {
	// Get all standings
	standings, err := s.standingsRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list standings")
	}

	qualifiedSet := make(map[uuid.UUID]bool)
	for _, id := range qualifiedTeamIDs {
		qualifiedSet[id] = true
	}

	// Mark eliminated teams in standings
	for _, standing := range standings {
		if !qualifiedSet[standing.TeamID] {
			standing.IsEliminated = true
			if err := s.standingsRepo.Update(ctx, standing); err != nil {
				return apperror.Wrap(err, "update standing eliminated")
			}
		}
	}

	// Also update daily standings qualification status if available
	if s.dailyStandingsRepo != nil {
		// Get max day number from lobbies
		lobbies, err := s.lobbyRepo.ListByTournament(ctx, tournamentID)
		if err != nil {
			return apperror.Wrap(err, "list lobbies for daily update")
		}

		maxDay := 0
		for _, l := range lobbies {
			if l.DayNumber > maxDay {
				maxDay = l.DayNumber
			}
		}

		if maxDay > 0 {
			dailyStandings, err := s.dailyStandingsRepo.FindByTournamentAndDay(ctx, tournamentID, maxDay)
			if err != nil {
				slog.Error("failed to get daily standings for qualification update", "error", err)
			} else {
				for _, ds := range dailyStandings {
					if qualifiedSet[ds.TeamID] {
						ds.IsQualified = true
						if err := s.dailyStandingsRepo.Upsert(ctx, ds); err != nil {
							slog.Error("failed to update daily standing qualification", "error", err)
						}
					}
				}
			}
		}
	}

	return nil
}

// GetQualification returns teams categorized by qualification threshold
func (s *BRService) GetQualification(ctx context.Context, tournamentID uuid.UUID) (map[string]interface{}, error) {
	if s.tournamentRepo == nil {
		return nil, apperror.BusinessRule("NOT_CONFIGURED", "Tournament repo belum dikonfigurasi")
	}

	tournament, err := s.tournamentRepo.FindByID(ctx, tournamentID)
	if err != nil || tournament == nil {
		return nil, apperror.NotFound("TOURNAMENT")
	}

	standings, err := s.standingsRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list standings")
	}

	threshold := 0
	if tournament.QualificationThreshold != nil {
		threshold = *tournament.QualificationThreshold
	}

	var qualified []*model.Standing
	var notQualified []*model.Standing

	for _, st := range standings {
		if threshold > 0 && st.TotalPoints >= threshold {
			qualified = append(qualified, st)
		} else {
			notQualified = append(notQualified, st)
		}
	}

	return map[string]interface{}{
		"threshold":     threshold,
		"qualified":     qualified,
		"not_qualified": notQualified,
		"total_teams":   len(standings),
	}, nil
}
