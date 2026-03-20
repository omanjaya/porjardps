package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestRecalculateBR_Success_Aggregates3Lobbies(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()
	teamA := uuid.New()
	teamB := uuid.New()

	lobbyRepo := new(MockBRLobbyRepository)
	resultRepo := new(MockBRLobbyResultRepository)
	standingsRepo := new(MockStandingsRepository)

	svc := NewStandingsService(standingsRepo, resultRepo, lobbyRepo, nil, nil)

	lobby1 := &model.BRLobby{ID: uuid.New(), TournamentID: tournamentID}
	lobby2 := &model.BRLobby{ID: uuid.New(), TournamentID: tournamentID}
	lobby3 := &model.BRLobby{ID: uuid.New(), TournamentID: tournamentID}

	// All results fetched in a single query via ListByTournament
	resultRepo.On("ListByTournament", ctx, tournamentID).Return([]*model.BRLobbyResult{
		// Lobby 1: TeamA 1st (15pp + 10k = 25), TeamB 3rd (10pp + 5k = 15)
		{ID: uuid.New(), LobbyID: lobby1.ID, TeamID: teamA, Placement: 1, Kills: 10, PlacementPoints: 15, KillPoints: 10, TotalPoints: 25},
		{ID: uuid.New(), LobbyID: lobby1.ID, TeamID: teamB, Placement: 3, Kills: 5, PlacementPoints: 10, KillPoints: 5, TotalPoints: 15},
		// Lobby 2: TeamA 4th (8pp + 3k = 11), TeamB 2nd (12pp + 8k = 20)
		{ID: uuid.New(), LobbyID: lobby2.ID, TeamID: teamA, Placement: 4, Kills: 3, PlacementPoints: 8, KillPoints: 3, TotalPoints: 11},
		{ID: uuid.New(), LobbyID: lobby2.ID, TeamID: teamB, Placement: 2, Kills: 8, PlacementPoints: 12, KillPoints: 8, TotalPoints: 20},
		// Lobby 3: TeamA 2nd (12pp + 7k = 19), TeamB 5th (6pp + 2k = 8)
		{ID: uuid.New(), LobbyID: lobby3.ID, TeamID: teamA, Placement: 2, Kills: 7, PlacementPoints: 12, KillPoints: 7, TotalPoints: 19},
		{ID: uuid.New(), LobbyID: lobby3.ID, TeamID: teamB, Placement: 5, Kills: 2, PlacementPoints: 6, KillPoints: 2, TotalPoints: 8},
	}, nil)

	// Expected aggregates:
	// TeamA: totalPoints=25+11+19=55, totalKills=10+3+7=20, totalPlacementPoints=15+8+12=35, matches=3, bestPlacement=1
	// TeamB: totalPoints=15+20+8=43, totalKills=5+8+2=15, totalPlacementPoints=10+12+6=28, matches=3, bestPlacement=2

	standingsRepo.On("BulkUpsert", ctx, mock.MatchedBy(func(standings []*model.Standing) bool {
		if len(standings) != 2 {
			return false
		}

		standingMap := make(map[uuid.UUID]*model.Standing)
		for _, s := range standings {
			standingMap[s.TeamID] = s
		}

		sA, okA := standingMap[teamA]
		sB, okB := standingMap[teamB]
		if !okA || !okB {
			return false
		}

		return sA.TotalPoints == 55 && sA.TotalKills == 20 && sA.TotalPlacementPoints == 35 &&
			sA.MatchesPlayed == 3 && *sA.BestPlacement == 1 &&
			sB.TotalPoints == 43 && sB.TotalKills == 15 && sB.TotalPlacementPoints == 28 &&
			sB.MatchesPlayed == 3 && *sB.BestPlacement == 2
	})).Return(nil)
	standingsRepo.On("UpdateRankPositions", ctx, tournamentID).Return(nil)

	err := svc.RecalculateBR(ctx, tournamentID)
	assert.NoError(t, err)
	standingsRepo.AssertExpectations(t)
}

func TestRecalculateBR_Success_RankTiebreaker(t *testing.T) {
	// This test verifies that when standings are bulk-upserted, teams with tied
	// total_points are differentiated by total_kills. The actual ranking is done
	// by UpdateRankPositions in the DB, so here we verify the correct aggregated
	// data is passed to BulkUpsert.
	ctx := context.Background()
	tournamentID := uuid.New()
	teamA := uuid.New()
	teamB := uuid.New()

	lobbyRepo := new(MockBRLobbyRepository)
	resultRepo := new(MockBRLobbyResultRepository)
	standingsRepo := new(MockStandingsRepository)

	svc := NewStandingsService(standingsRepo, resultRepo, lobbyRepo, nil, nil)

	lobby1 := &model.BRLobby{ID: uuid.New(), TournamentID: tournamentID}

	// All results fetched in a single query via ListByTournament
	// Both teams have same total points (20) but TeamA has more kills (15 vs 10)
	resultRepo.On("ListByTournament", ctx, tournamentID).Return([]*model.BRLobbyResult{
		{ID: uuid.New(), LobbyID: lobby1.ID, TeamID: teamA, Placement: 3, Kills: 15, PlacementPoints: 5, KillPoints: 15, TotalPoints: 20},
		{ID: uuid.New(), LobbyID: lobby1.ID, TeamID: teamB, Placement: 2, Kills: 10, PlacementPoints: 10, KillPoints: 10, TotalPoints: 20},
	}, nil)

	standingsRepo.On("BulkUpsert", ctx, mock.MatchedBy(func(standings []*model.Standing) bool {
		if len(standings) != 2 {
			return false
		}
		standingMap := make(map[uuid.UUID]*model.Standing)
		for _, s := range standings {
			standingMap[s.TeamID] = s
		}

		sA, okA := standingMap[teamA]
		sB, okB := standingMap[teamB]
		if !okA || !okB {
			return false
		}

		// Both have same total points
		return sA.TotalPoints == 20 && sB.TotalPoints == 20 &&
			// TeamA has more kills - the tiebreaker
			sA.TotalKills == 15 && sB.TotalKills == 10
	})).Return(nil)
	standingsRepo.On("UpdateRankPositions", ctx, tournamentID).Return(nil)

	err := svc.RecalculateBR(ctx, tournamentID)
	assert.NoError(t, err)
	standingsRepo.AssertExpectations(t)
	// UpdateRankPositions is expected to handle the actual ranking in DB
	// using ORDER BY total_points DESC, total_kills DESC
	standingsRepo.AssertCalled(t, "UpdateRankPositions", ctx, tournamentID)
}

func TestUpdateAfterBracketMatch_Success(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()
	winnerID := uuid.New()
	loserID := uuid.New()

	standingsRepo := new(MockStandingsRepository)
	svc := NewStandingsService(standingsRepo, nil, nil, nil, nil)

	// IncrementBracketStats is called atomically — no prior read needed
	standingsRepo.On("IncrementBracketStats", ctx, tournamentID, winnerID, true).Return(nil)
	standingsRepo.On("IncrementBracketStats", ctx, tournamentID, loserID, false).Return(nil)
	standingsRepo.On("UpdateRankPositions", ctx, tournamentID).Return(nil)

	err := svc.UpdateAfterBracketMatch(ctx, tournamentID, winnerID, loserID)
	assert.NoError(t, err)

	standingsRepo.AssertExpectations(t)
}

func TestUpdateAfterBracketMatch_NewStandings(t *testing.T) {
	// IncrementBracketStats handles the insert-or-update case atomically in SQL,
	// so no special handling is needed at the service layer for "new" standings.
	ctx := context.Background()
	tournamentID := uuid.New()
	winnerID := uuid.New()
	loserID := uuid.New()

	standingsRepo := new(MockStandingsRepository)
	svc := NewStandingsService(standingsRepo, nil, nil, nil, nil)

	standingsRepo.On("IncrementBracketStats", ctx, tournamentID, winnerID, true).Return(nil)
	standingsRepo.On("IncrementBracketStats", ctx, tournamentID, loserID, false).Return(nil)
	standingsRepo.On("UpdateRankPositions", ctx, tournamentID).Return(nil)

	err := svc.UpdateAfterBracketMatch(ctx, tournamentID, winnerID, loserID)
	assert.NoError(t, err)
	standingsRepo.AssertExpectations(t)
}
