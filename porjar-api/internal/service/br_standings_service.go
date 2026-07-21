package service

import (
	"context"
	"fmt"
	"log/slog"
	"math"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

// recalculateStandings aggregates all lobby results per team and updates standings.
// For multi-map lobbies, all maps within a lobby are summed and counted as one "match played".
func (s *BRService) recalculateStandings(ctx context.Context, tournamentID uuid.UUID) error {
	// Fetch all results for the tournament in a single query (avoids N+1 per lobby).
	allResults, err := s.resultRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return fmt.Errorf("list lobby results for tournament: %w", err)
	}

	// Aggregate results per team.
	// For multi-map: sum all maps within a lobby, count each lobby as one match.
	type teamAgg struct {
		totalPoints          int
		totalKills           int
		totalPlacementPoints int
		bestPlacement        int
		sumPlacement         int
		mapCount             int               // count of individual map results for avg placement
		wwcdCount            int               // placement == 1 per map game
		lobbies              map[uuid.UUID]bool // track distinct lobbies for matchesPlayed
	}
	agg := make(map[uuid.UUID]*teamAgg)

	for _, r := range allResults {
		a, ok := agg[r.TeamID]
		if !ok {
			a = &teamAgg{bestPlacement: math.MaxInt32, lobbies: make(map[uuid.UUID]bool)}
			agg[r.TeamID] = a
		}
		a.totalPoints += r.TotalPoints
		a.totalKills += r.Kills
		a.totalPlacementPoints += r.PlacementPoints
		a.lobbies[r.LobbyID] = true
		a.mapCount++
		if r.Placement == 1 {
			a.wwcdCount++
		}
		// For best/avg placement, track per-map placements
		if r.Placement < a.bestPlacement {
			a.bestPlacement = r.Placement
		}
		a.sumPlacement += r.Placement
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
		matchesPlayed := len(a.lobbies) // count distinct lobbies, not individual map results
		bestP := a.bestPlacement
		avgP := 0.0
		if a.mapCount > 0 {
			avgP = float64(a.sumPlacement) / float64(a.mapCount)
		}

		standing := &model.Standing{
			ID:                   uuid.New(),
			TournamentID:         tournamentID,
			TeamID:               teamID,
			MatchesPlayed:        matchesPlayed,
			TotalPoints:          a.totalPoints,
			TotalKills:           a.totalKills,
			TotalPlacementPoints: a.totalPlacementPoints,
			BestPlacement:        &bestP,
			AvgPlacement:         &avgP,
			WWCDCount:            a.wwcdCount,
		}
		standings = append(standings, standing)
	}

	// Delete all existing standings for the tournament first so that teams
	// whose results have been fully removed do not retain stale standings rows.
	if err := s.standingsRepo.DeleteByTournament(ctx, tournamentID); err != nil {
		return fmt.Errorf("delete existing standings: %w", err)
	}

	if err := s.standingsRepo.BulkUpsert(ctx, standings); err != nil {
		return fmt.Errorf("bulk upsert standings: %w", err)
	}

	// Fetch tiebreaker order from tournament config
	var tiebreakerOrder []string
	if s.tournamentRepo != nil {
		if t, err := s.tournamentRepo.FindByID(ctx, tournamentID); err == nil && t != nil {
			tiebreakerOrder = t.TiebreakerOrder
		}
	}

	// Update rank positions with tournament-specific tiebreaker
	if err := s.standingsRepo.UpdateRankPositions(ctx, tournamentID, tiebreakerOrder); err != nil {
		return fmt.Errorf("update rank positions: %w", err)
	}

	return nil
}

// broadcastResults sends WebSocket updates for results and standings
func (s *BRService) broadcastResults(tournamentID, lobbyID uuid.UUID) {
	if s.hub == nil {
		return
	}
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
		// Mirror to the public global live-scores channel so public pages
		// (matches/live, schedule, landing) receive BR result updates too.
		s.hub.BroadcastToAll(resultData)
	}

	// Broadcast standings update
	standingsData, err := ws.NewBroadcastData("standings_update", map[string]interface{}{
		"tournament_id": tournamentID,
	})
	if err != nil {
		slog.Error("ws broadcast standings_update marshal error", "error", err)
	} else {
		s.hub.BroadcastToRoom(room, standingsData)
		// Mirror to the public global live-scores channel so public pages
		// (matches/live, schedule, landing) receive standings updates too.
		s.hub.BroadcastToAll(standingsData)
	}
}

// CalculateDailyStandings aggregates results for a specific day only
func (s *BRService) CalculateDailyStandings(ctx context.Context, tournamentID uuid.UUID, dayNumber int) error {
	if s.dailyStandingsRepo == nil {
		return apperror.BusinessRule("NOT_CONFIGURED", "Daily standings belum dikonfigurasi")
	}

	// Get all lobbies for this tournament to filter by day and build a lobby-day index.
	lobbies, err := s.lobbyRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list lobbies")
	}

	// Build a set of lobby IDs that belong to the requested day.
	dayLobbySet := make(map[uuid.UUID]struct{})
	for _, lobby := range lobbies {
		if lobby.DayNumber == dayNumber {
			dayLobbySet[lobby.ID] = struct{}{}
		}
	}

	// Fetch all results for the tournament in one query (avoids N+1 per lobby).
	allResults, err := s.resultRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list lobby results for tournament")
	}

	// Aggregate results per team for this day only.
	type teamAgg struct {
		totalPoints int
		totalKills  int
	}
	agg := make(map[uuid.UUID]*teamAgg)

	for _, r := range allResults {
		if _, onDay := dayLobbySet[r.LobbyID]; !onDay {
			continue
		}
		a, ok := agg[r.TeamID]
		if !ok {
			a = &teamAgg{}
			agg[r.TeamID] = a
		}
		a.totalPoints += r.TotalPoints
		a.totalKills += r.Kills
	}

	// Deduct penalties from daily standings totals (mirrors recalculateStandings logic)
	if s.penaltyRepo != nil {
		penalties, penErr := s.penaltyRepo.FindByTournament(ctx, tournamentID)
		if penErr != nil {
			return apperror.Wrap(penErr, "find penalties for daily standings")
		}
		for _, p := range penalties {
			// Only apply lobby-specific penalties if they belong to a lobby on this day.
			// Tournament-wide penalties (no lobby) are skipped — they only apply to overall standings.
			if p.LobbyID == nil {
				continue // Tournament-wide penalties only apply to overall standings
			}
			if _, onDay := dayLobbySet[*p.LobbyID]; !onDay {
				continue
			}
			a, ok := agg[p.TeamID]
			if ok {
				a.totalPoints -= p.Points
			}
		}
	}

	// Bulk-upsert daily standings for all teams in a single pgx batch.
	standingsToUpsert := make([]*model.BRDailyStanding, 0, len(agg))
	for teamID, a := range agg {
		standingsToUpsert = append(standingsToUpsert, &model.BRDailyStanding{
			ID:           uuid.New(),
			TournamentID: tournamentID,
			TeamID:       teamID,
			DayNumber:    dayNumber,
			TotalPoints:  a.totalPoints,
			TotalKills:   a.totalKills,
		})
	}
	if err := s.dailyStandingsRepo.BulkUpsert(ctx, standingsToUpsert); err != nil {
		return apperror.Wrap(err, "bulk upsert daily standings")
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

	// Collect team IDs to eliminate, then update in a single batch query.
	var eliminatedIDs []uuid.UUID
	for _, standing := range standings {
		if !qualifiedSet[standing.TeamID] {
			eliminatedIDs = append(eliminatedIDs, standing.TeamID)
		}
	}
	if len(eliminatedIDs) > 0 {
		if err := s.standingsRepo.BulkMarkEliminated(ctx, tournamentID, eliminatedIDs); err != nil {
			return apperror.Wrap(err, "bulk mark eliminated standings")
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
				// Mark qualified teams in a single batch upsert instead of one-by-one.
				var toUpdate []*model.BRDailyStanding
				for _, ds := range dailyStandings {
					if qualifiedSet[ds.TeamID] {
						ds.IsQualified = true
						toUpdate = append(toUpdate, ds)
					}
				}
				if len(toUpdate) > 0 {
					if err := s.dailyStandingsRepo.BulkUpsert(ctx, toUpdate); err != nil {
						slog.Error("failed to bulk update daily standing qualification", "error", err)
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
