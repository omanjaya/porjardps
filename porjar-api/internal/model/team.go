package model

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

type Team struct {
	ID            uuid.UUID  `json:"id"`
	Name          string     `json:"name"`
	SchoolID      *uuid.UUID `json:"school_id"`
	GameID        uuid.UUID  `json:"game_id"`
	CaptainUserID *uuid.UUID `json:"captain_user_id"`
	LogoURL       *string    `json:"logo_url"`
	Status        string     `json:"status"`
	Seed          *int       `json:"seed"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	// Populated by JOIN queries (not a DB column on teams)
	SchoolLogoURL *string `json:"school_logo_url,omitempty"`
}

type TeamSummary struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Seed          *int      `json:"seed,omitempty"`
	LogoURL       *string   `json:"logo_url,omitempty"`
	SchoolLogoURL *string   `json:"school_logo_url,omitempty"`
}

type TeamMember struct {
	ID          uuid.UUID  `json:"id"`
	TeamID      uuid.UUID  `json:"team_id"`
	UserID      *uuid.UUID `json:"user_id"`
	InGameName  string     `json:"in_game_name"`
	InGameID    *string    `json:"in_game_id"`
	Role        string     `json:"role"`
	JerseyNumber *int      `json:"jersey_number"`
	JoinedAt    time.Time  `json:"joined_at"`
}

type TeamFilter struct {
	GameID   *uuid.UUID
	SchoolID *uuid.UUID
	Status   *string
	Search   *string
	Page     int
	Limit    int
}

type TeamRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*Team, error)
	FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*Team, error)
	FindByNameAndGame(ctx context.Context, name string, gameID uuid.UUID) (*Team, error)
	Create(ctx context.Context, t *Team) error
	CreateTx(ctx context.Context, tx pgx.Tx, t *Team) error
	Update(ctx context.Context, t *Team) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	List(ctx context.Context, filter TeamFilter) ([]*Team, int, error)
	FindByUserAndGame(ctx context.Context, userID, gameID uuid.UUID) (*Team, error)
	CountByGame(ctx context.Context, gameID uuid.UUID) (int, error)
	Delete(ctx context.Context, id uuid.UUID) error
	CountActiveTournaments(ctx context.Context, id uuid.UUID) (int, error)
}

type TeamMemberRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*TeamMember, error)
	FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*TeamMember, error)
	FindByTeamAndUser(ctx context.Context, teamID, userID uuid.UUID) (*TeamMember, error)
	FindByUser(ctx context.Context, userID uuid.UUID) ([]*TeamMember, error)
	FindUserTeamsForGame(ctx context.Context, userID, gameID uuid.UUID) ([]*TeamMember, error)
	Create(ctx context.Context, m *TeamMember) error
	CreateTx(ctx context.Context, tx pgx.Tx, m *TeamMember) error
	Delete(ctx context.Context, id uuid.UUID) error
	CountByTeam(ctx context.Context, teamID uuid.UUID) (int, error)
	CountByTeams(ctx context.Context, teamIDs []uuid.UUID) (map[uuid.UUID]int, error)
	CountSubstitutes(ctx context.Context, teamID uuid.UUID) (int, error)
}
