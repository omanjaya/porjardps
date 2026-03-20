package model

import (
	"context"

	"github.com/google/uuid"
)

type Standing struct {
	ID                   uuid.UUID  `json:"id"`
	TournamentID         uuid.UUID  `json:"tournament_id"`
	TeamID               uuid.UUID  `json:"team_id"`
	GroupName            *string    `json:"group_name"`
	MatchesPlayed        int        `json:"matches_played"`
	Wins                 int        `json:"wins"`
	Losses               int        `json:"losses"`
	Draws                int        `json:"draws"`
	RoundsWon            int        `json:"rounds_won"`
	RoundsLost           int        `json:"rounds_lost"`
	TotalPoints          int        `json:"total_points"`
	TotalKills           int        `json:"total_kills"`
	TotalPlacementPoints int        `json:"total_placement_points"`
	BestPlacement        *int       `json:"best_placement"`
	AvgPlacement         *float64   `json:"avg_placement"`
	RankPosition         *int       `json:"rank_position"`
	IsEliminated         bool       `json:"is_eliminated"`
}

type StandingsFilter struct {
	TournamentID *uuid.UUID
	GroupName    *string
}

type StandingsRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*Standing, error)
	Create(ctx context.Context, s *Standing) error
	Update(ctx context.Context, s *Standing) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*Standing, error)
	ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*Standing, error)
	ListByTournamentAndGroup(ctx context.Context, tournamentID uuid.UUID, groupName string) ([]*Standing, error)
	Upsert(ctx context.Context, s *Standing) error
	BulkUpsert(ctx context.Context, standings []*Standing) error
	UpdateRankPositions(ctx context.Context, tournamentID uuid.UUID) error
	// IncrementBracketStats atomically increments wins or losses using a single SQL statement,
	// avoiding read-modify-write races under concurrent match verification.
	IncrementBracketStats(ctx context.Context, tournamentID, teamID uuid.UUID, isWin bool) error
}
