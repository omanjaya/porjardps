package service

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// enrichTournaments populates Game and TeamCount for a list of tournaments.
// Uses batch queries to avoid N+1 problems.
func (s *TournamentService) enrichTournaments(ctx context.Context, tournaments []*model.Tournament) {
	if len(tournaments) == 0 {
		return
	}

	// Collect unique game IDs and tournament IDs
	gameIDSet := make(map[uuid.UUID]struct{})
	tournamentIDs := make([]uuid.UUID, 0, len(tournaments))
	for _, t := range tournaments {
		gameIDSet[t.GameID] = struct{}{}
		tournamentIDs = append(tournamentIDs, t.ID)
	}

	// Batch fetch games
	gameMap := make(map[uuid.UUID]*model.Game)
	if s.gameRepo != nil && len(gameIDSet) > 0 {
		gameIDs := make([]uuid.UUID, 0, len(gameIDSet))
		for id := range gameIDSet {
			gameIDs = append(gameIDs, id)
		}
		if games, err := s.gameRepo.FindByIDs(ctx, gameIDs); err == nil {
			for _, g := range games {
				gameMap[g.ID] = g
			}
		} else {
			slog.Error("failed to batch fetch games for enrichment", "error", err)
		}
	}

	// Batch fetch team counts
	teamCountMap := make(map[uuid.UUID]int)
	if counts, err := s.tournamentRepo.CountTeamsBatch(ctx, tournamentIDs); err == nil {
		teamCountMap = counts
	} else {
		slog.Error("failed to batch fetch team counts for enrichment", "error", err)
	}

	// Apply enrichment
	for _, t := range tournaments {
		if game, ok := gameMap[t.GameID]; ok {
			t.Game = &model.GameSummary{
				ID:       game.ID,
				Name:     game.Name,
				Slug:     game.Slug,
				GameType: game.GameType,
			}
		}
		t.TeamCount = teamCountMap[t.ID]
	}
}
