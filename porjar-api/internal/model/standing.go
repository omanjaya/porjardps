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
	PenaltyPoints        int        `json:"penalty_points"`
	WWCDCount            int        `json:"wwcd_count"`
}

// StandingWithTeam is the response DTO for standings with nested team data.
type StandingWithTeam struct {
	ID                   uuid.UUID   `json:"id"`
	TournamentID         uuid.UUID   `json:"tournament_id"`
	Team                 TeamSummary `json:"team"`
	GroupName            *string     `json:"group_name"`
	MatchesPlayed        int         `json:"matches_played"`
	Wins                 int         `json:"wins"`
	Losses               int         `json:"losses"`
	Draws                int         `json:"draws"`
	RoundsWon            int         `json:"rounds_won"`
	RoundsLost           int         `json:"rounds_lost"`
	TotalPoints          int         `json:"total_points"`
	TotalKills           int         `json:"total_kills"`
	TotalPlacementPoints int         `json:"total_placement_points"`
	BestPlacement        *int        `json:"best_placement"`
	AvgPlacement         *float64    `json:"avg_placement"`
	RankPosition         *int        `json:"rank_position"`
	IsEliminated         bool        `json:"is_eliminated"`
	PenaltyPoints        int         `json:"penalty_points"`
	WWCDCount            int         `json:"wwcd_count"`
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
	ListWithTeamsByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*StandingWithTeam, error)
	ListByTournamentAndGroup(ctx context.Context, tournamentID uuid.UUID, groupName string) ([]*Standing, error)
	Upsert(ctx context.Context, s *Standing) error
	BulkUpsert(ctx context.Context, standings []*Standing) error
	UpdateRankPositions(ctx context.Context, tournamentID uuid.UUID, tiebreakerOrder []string) error
	// IncrementBracketStats atomically increments wins or losses using a single SQL statement,
	// avoiding read-modify-write races under concurrent match verification.
	IncrementBracketStats(ctx context.Context, tournamentID, teamID uuid.UUID, isWin bool) error
	// DeleteByTournament removes all standings for a tournament so they can be fully recalculated.
	DeleteByTournament(ctx context.Context, tournamentID uuid.UUID) error
	// BulkMarkEliminated sets is_eliminated = true for all teamIDs in a single UPDATE statement.
	BulkMarkEliminated(ctx context.Context, tournamentID uuid.UUID, teamIDs []uuid.UUID) error
}
