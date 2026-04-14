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

type StandingsService struct {
	standingsRepo model.StandingsRepository
	resultRepo    model.BRLobbyResultRepository
	lobbyRepo     model.BRLobbyRepository
	bracketRepo   model.BracketRepository
	penaltyRepo   model.BRPenaltyRepository
	hub           *ws.Hub
}

func (s *StandingsService) SetHub(h *ws.Hub) { s.hub = h }

func (s *StandingsService) broadcastStandingsUpdate(tournamentID uuid.UUID) {
	if s.hub == nil {
		return
	}
	payload, err := ws.NewBroadcastData("standings_update", map[string]interface{}{
		"tournament_id": tournamentID.String(),
	})
	if err != nil {
		slog.Error("failed to marshal standings broadcast", "error", err)
		return
	}
	s.hub.BroadcastToRoom(fmt.Sprintf("tournament:%s", tournamentID.String()), payload)
}

func NewStandingsService(
	standingsRepo model.StandingsRepository,
	resultRepo model.BRLobbyResultRepository,
	lobbyRepo model.BRLobbyRepository,
	bracketRepo model.BracketRepository,
	penaltyRepo model.BRPenaltyRepository,
) *StandingsService {
	return &StandingsService{
		standingsRepo: standingsRepo,
		resultRepo:    resultRepo,
		lobbyRepo:     lobbyRepo,
		bracketRepo:   bracketRepo,
		penaltyRepo:   penaltyRepo,
	}
}

// GetByTournament returns all standings for a tournament ordered by rank
func (s *StandingsService) GetByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.Standing, error) {
	standings, err := s.standingsRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list standings")
	}
	return standings, nil
}

// GetByTournamentWithTeams returns standings with nested team data for API responses
func (s *StandingsService) GetByTournamentWithTeams(ctx context.Context, tournamentID uuid.UUID) ([]*model.StandingWithTeam, error) {
	standings, err := s.standingsRepo.ListWithTeamsByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "list standings with teams")
	}
	return standings, nil
}

// RecalculateBR aggregates all lobby results per team and updates standings.
// For multi-map lobbies, all maps within a lobby are summed and counted as one "match played".
func (s *StandingsService) RecalculateBR(ctx context.Context, tournamentID uuid.UUID) error {
	// Fetch all results for the tournament in a single query (avoids N+1 per lobby)
	allResults, err := s.resultRepo.ListByTournament(ctx, tournamentID)
	if err != nil {
		return apperror.Wrap(err, "list results for tournament")
	}

	// Aggregate results per team.
	// Track distinct lobby IDs so matchesPlayed = number of lobbies, not individual map results.
	type teamAgg struct {
		totalPoints          int
		totalKills           int
		totalPlacementPoints int
		bestPlacement        int
		sumPlacement         int
		lobbies              map[uuid.UUID]bool
	}
	agg := make(map[uuid.UUID]*teamAgg)

	for _, r := range allResults {
		a, ok := agg[r.TeamID]
		if !ok {
			a = &teamAgg{bestPlacement: r.Placement, lobbies: make(map[uuid.UUID]bool)}
			agg[r.TeamID] = a
		}
		a.totalPoints += r.TotalPoints
		a.totalKills += r.Kills
		a.totalPlacementPoints += r.PlacementPoints
		a.lobbies[r.LobbyID] = true
		a.sumPlacement += r.Placement
		if r.Placement < a.bestPlacement || a.bestPlacement == 0 {
			a.bestPlacement = r.Placement
		}
	}

	// Deduct penalties from standings totals
	if s.penaltyRepo != nil {
		penalties, penErr := s.penaltyRepo.FindByTournament(ctx, tournamentID)
		if penErr != nil {
			return apperror.Wrap(penErr, "find penalties")
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
		matchesPlayed := len(a.lobbies)
		bestP := a.bestPlacement
		avgP := 0.0
		if matchesPlayed > 0 {
			avgP = float64(a.sumPlacement) / float64(matchesPlayed)
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
		}
		standings = append(standings, standing)
	}

	if err := s.standingsRepo.BulkUpsert(ctx, standings); err != nil {
		return apperror.Wrap(err, "bulk upsert standings")
	}

	// Update rank positions
	if err := s.standingsRepo.UpdateRankPositions(ctx, tournamentID, nil); err != nil {
		return apperror.Wrap(err, "update rank positions")
	}

	return nil
}

// UpdateAfterBracketMatch atomically increments wins/losses for the winner and loser of a bracket match.
// Uses IncrementBracketStats to avoid read-modify-write races under concurrent match verification.
func (s *StandingsService) UpdateAfterBracketMatch(ctx context.Context, tournamentID, winnerID, loserID uuid.UUID) error {
	if err := s.standingsRepo.IncrementBracketStats(ctx, tournamentID, winnerID, true); err != nil {
		return apperror.Wrap(err, "increment winner standing")
	}

	if err := s.standingsRepo.IncrementBracketStats(ctx, tournamentID, loserID, false); err != nil {
		return apperror.Wrap(err, "increment loser standing")
	}

	// Update rank positions
	if err := s.standingsRepo.UpdateRankPositions(ctx, tournamentID, nil); err != nil {
		return apperror.Wrap(err, "update rank positions")
	}

	return nil
}
