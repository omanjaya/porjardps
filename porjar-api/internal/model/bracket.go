package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type BracketMatch struct {
	ID               uuid.UUID  `json:"id"`
	TournamentID     uuid.UUID  `json:"tournament_id"`
	Round            int        `json:"round"`
	MatchNumber      int        `json:"match_number"`
	BracketPosition  *string    `json:"bracket_position"`
	TeamAID          *uuid.UUID `json:"team_a_id"`
	TeamBID          *uuid.UUID `json:"team_b_id"`
	WinnerID         *uuid.UUID `json:"winner_id"`
	LoserID          *uuid.UUID `json:"loser_id"`
	ScoreA           *int       `json:"score_a"`
	ScoreB           *int       `json:"score_b"`
	Status           string     `json:"status"`
	ScheduledAt      *time.Time `json:"scheduled_at"`
	StartedAt        *time.Time `json:"started_at"`
	CompletedAt      *time.Time `json:"completed_at"`
	NextMatchID      *uuid.UUID `json:"next_match_id"`
	LoserNextMatchID *uuid.UUID `json:"loser_next_match_id"`
	StreamURL        *string    `json:"stream_url"`
	Notes            *string    `json:"notes"`

	// Enriched fields (not stored in DB, populated by service)
	TeamA   *TeamSummary `json:"team_a,omitempty"`
	TeamB   *TeamSummary `json:"team_b,omitempty"`
	Winner  *TeamSummary `json:"winner,omitempty"`
	BestOf  int          `json:"best_of,omitempty"`
}

type MatchGame struct {
	ID              uuid.UUID       `json:"id"`
	BracketMatchID  uuid.UUID       `json:"bracket_match_id"`
	GameNumber      int             `json:"game_number"`
	WinnerID        *uuid.UUID      `json:"winner_id"`
	ScoreA          *int            `json:"score_a"`
	ScoreB          *int            `json:"score_b"`
	DurationMinutes *int            `json:"duration_minutes"`
	MvpUserID       *uuid.UUID      `json:"mvp_user_id"`
	MapName         *string         `json:"map_name"`
	HeroBans        json.RawMessage `json:"hero_bans"`
	Notes           *string         `json:"notes"`
}

type BracketMatchFilter struct {
	TournamentID *uuid.UUID
	Round        *int
	Status       *string
}

type BracketRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*BracketMatch, error)
	FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*BracketMatch, error)
	Create(ctx context.Context, m *BracketMatch) error
	Update(ctx context.Context, m *BracketMatch) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*BracketMatch, error)
	ListByTournamentAndRound(ctx context.Context, tournamentID uuid.UUID, round int) ([]*BracketMatch, error)
	ListByTeam(ctx context.Context, teamID uuid.UUID) ([]*BracketMatch, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	UpdateResult(ctx context.Context, id uuid.UUID, winnerID, loserID uuid.UUID, scoreA, scoreB int) error
	UpdateBestOf(ctx context.Context, id uuid.UUID, bestOf int) error
	ListScheduledBefore(ctx context.Context, before time.Time) ([]*BracketMatch, error)
	FindLiveAcrossAllTournaments(ctx context.Context, limit int) ([]*BracketMatch, error)
	FindRecentCompleted(ctx context.Context, limit int) ([]*BracketMatch, error)
}

type MatchGameRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*MatchGame, error)
	Create(ctx context.Context, g *MatchGame) error
	Update(ctx context.Context, g *MatchGame) error
	Delete(ctx context.Context, id uuid.UUID) error
	ListByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*MatchGame, error)
}
