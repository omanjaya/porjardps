package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Schedule struct {
	ID             uuid.UUID  `json:"id"`
	TournamentID   uuid.UUID  `json:"tournament_id"`
	BracketMatchID *uuid.UUID `json:"bracket_match_id"`
	BRLobbyID      *uuid.UUID `json:"br_lobby_id"`
	Title          string     `json:"title"`
	Description    *string    `json:"description"`
	Venue          *string    `json:"venue"`
	ScheduledAt    time.Time  `json:"scheduled_at"`
	EndAt          *time.Time `json:"end_at"`
	Status         string     `json:"status"`

	// Enriched fields (populated via JOIN)
	Tournament *TournamentSummary `json:"tournament,omitempty"`
	Game       *GameSummary       `json:"game,omitempty"`
	TeamA      *ScheduleTeam      `json:"team_a,omitempty"`
	TeamB      *ScheduleTeam      `json:"team_b,omitempty"`
}

type ScheduleTeam struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	SchoolName *string   `json:"school_name,omitempty"`
}

type ScheduleFilter struct {
	TournamentID *uuid.UUID
	Status       *string
	From         *time.Time
	To           *time.Time
	Page         int
	Limit        int
}

type ScheduleRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*Schedule, error)
	Create(ctx context.Context, s *Schedule) error
	Update(ctx context.Context, s *Schedule) error
	Delete(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, filter ScheduleFilter) ([]*Schedule, int, error)
	ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*Schedule, error)
	FindToday(ctx context.Context) ([]*Schedule, error)
	FindUpcoming(ctx context.Context, limit int) ([]*Schedule, error)
}
