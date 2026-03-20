package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type BRLobby struct {
	ID           uuid.UUID  `json:"id"`
	TournamentID uuid.UUID  `json:"tournament_id"`
	LobbyName    string     `json:"lobby_name"`
	LobbyNumber  int        `json:"lobby_number"`
	DayNumber    int        `json:"day_number"`
	RoomID       *string    `json:"room_id"`
	RoomPassword *string    `json:"room_password"`
	Status       string     `json:"status"`
	ScheduledAt  *time.Time `json:"scheduled_at"`
	StartedAt    *time.Time `json:"started_at"`
	CompletedAt  *time.Time `json:"completed_at"`
}

type BRLobbyResult struct {
	ID              uuid.UUID `json:"id"`
	LobbyID         uuid.UUID `json:"lobby_id"`
	TeamID          uuid.UUID `json:"team_id"`
	Placement       int       `json:"placement"`
	Kills           int       `json:"kills"`
	PlacementPoints int       `json:"placement_points"`
	KillPoints      int       `json:"kill_points"`
	TotalPoints     int       `json:"total_points"`
	Status          string    `json:"status"`
	PenaltyPoints   int       `json:"penalty_points"`
	PenaltyReason   *string   `json:"penalty_reason"`
	DamageDealt     int       `json:"damage_dealt"`
	SurvivalBonus   int       `json:"survival_bonus"`
}

type BRPlayerResult struct {
	ID                  uuid.UUID  `json:"id"`
	LobbyResultID       uuid.UUID  `json:"lobby_result_id"`
	UserID              uuid.UUID  `json:"user_id"`
	Kills               int        `json:"kills"`
	Damage              int        `json:"damage"`
	IsMVP               bool       `json:"is_mvp"`
	SurvivalTimeSeconds *int       `json:"survival_time_seconds"`
	CreatedAt           time.Time  `json:"created_at"`
}

type BRPenalty struct {
	ID           uuid.UUID  `json:"id"`
	TournamentID uuid.UUID  `json:"tournament_id"`
	TeamID       uuid.UUID  `json:"team_id"`
	LobbyID      *uuid.UUID `json:"lobby_id"`
	Type         string     `json:"type"`
	Points       int        `json:"points"`
	Reason       *string    `json:"reason"`
	AppliedBy    uuid.UUID  `json:"applied_by"`
	CreatedAt    time.Time  `json:"created_at"`
}

type BRPointRule struct {
	ID           uuid.UUID `json:"id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	Placement    int       `json:"placement"`
	Points       int       `json:"points"`
}

type BRLobbyRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*BRLobby, error)
	Create(ctx context.Context, l *BRLobby) error
	Update(ctx context.Context, l *BRLobby) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*BRLobby, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	ListScheduledBefore(ctx context.Context, before time.Time) ([]*BRLobby, error)
}

type BRLobbyResultRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*BRLobbyResult, error)
	Create(ctx context.Context, r *BRLobbyResult) error
	Update(ctx context.Context, r *BRLobbyResult) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByLobby(ctx context.Context, lobbyID uuid.UUID) ([]*BRLobbyResult, error)
	ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*BRLobbyResult, error)
	ListByTeam(ctx context.Context, teamID uuid.UUID) ([]*BRLobbyResult, error)
	BulkCreate(ctx context.Context, results []*BRLobbyResult) error
	FindByTeamAndLobby(ctx context.Context, teamID, lobbyID uuid.UUID) (*BRLobbyResult, error)
}

type BRPointRuleRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*BRPointRule, error)
	Create(ctx context.Context, r *BRPointRule) error
	Update(ctx context.Context, r *BRPointRule) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*BRPointRule, error)
	BulkCreate(ctx context.Context, rules []*BRPointRule) error
	FindByPlacement(ctx context.Context, tournamentID uuid.UUID, placement int) (*BRPointRule, error)
}

type BRPlayerResultRepository interface {
	Create(ctx context.Context, r *BRPlayerResult) error
	BulkCreate(ctx context.Context, results []*BRPlayerResult) error
	FindByLobbyResult(ctx context.Context, lobbyResultID uuid.UUID) ([]*BRPlayerResult, error)
	FindByUser(ctx context.Context, userID uuid.UUID) ([]*BRPlayerResult, error)
}

type BRPenaltyRepository interface {
	Create(ctx context.Context, p *BRPenalty) error
	FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*BRPenalty, error)
	FindByTeam(ctx context.Context, tournamentID, teamID uuid.UUID) ([]*BRPenalty, error)
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*BRPenalty, error)
}
