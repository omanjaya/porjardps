package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Tournament struct {
	ID                uuid.UUID  `json:"id"`
	GameID            uuid.UUID  `json:"game_id"`
	Name              string     `json:"name"`
	Format            string     `json:"format"`
	Stage             string     `json:"stage"`
	BestOf            int        `json:"best_of"`
	MaxTeams          *int       `json:"max_teams"`
	Status            string     `json:"status"`
	RegistrationStart *time.Time `json:"registration_start"`
	RegistrationEnd   *time.Time `json:"registration_end"`
	StartDate         *time.Time `json:"start_date"`
	EndDate           *time.Time `json:"end_date"`
	Rules                  *string    `json:"rules"`
	KillPointValue         float64    `json:"kill_point_value"`
	WWCDBonus              int        `json:"wwcd_bonus"`
	QualificationThreshold *int       `json:"qualification_threshold"`
	MaxLobbyTeams          *int       `json:"max_lobby_teams"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`

	// Enriched fields (not stored in DB, populated by handler)
	Game      *GameSummary `json:"game,omitempty"`
	TeamCount int          `json:"team_count"`
}

type GameSummary struct {
	ID       uuid.UUID `json:"id"`
	Name     string    `json:"name"`
	Slug     string    `json:"slug"`
	GameType string    `json:"game_type"`
}

type TournamentSummary struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type TournamentTeam struct {
	ID           uuid.UUID  `json:"id"`
	TournamentID uuid.UUID  `json:"tournament_id"`
	TeamID       uuid.UUID  `json:"team_id"`
	GroupName    *string    `json:"group_name"`
	Seed         *int       `json:"seed"`
	Status       string     `json:"status"`
}

type TournamentFilter struct {
	GameID *uuid.UUID
	Status *string
	Page   int
	Limit  int
}

type TournamentRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*Tournament, error)
	Create(ctx context.Context, t *Tournament) error
	Update(ctx context.Context, t *Tournament) error
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	List(ctx context.Context, filter TournamentFilter) ([]*Tournament, int, error)
	CountTeams(ctx context.Context, tournamentID uuid.UUID) (int, error)
	CountTeamsBatch(ctx context.Context, tournamentIDs []uuid.UUID) (map[uuid.UUID]int, error)
}

type TournamentTeamRepository interface {
	FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*TournamentTeam, error)
	Create(ctx context.Context, tt *TournamentTeam) error
	Delete(ctx context.Context, tournamentID, teamID uuid.UUID) error
	ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*TournamentTeam, error)
	ListApprovedTeams(ctx context.Context, tournamentID uuid.UUID) ([]*Team, error)
}
