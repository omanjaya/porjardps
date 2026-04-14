package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ──────────────────────────────────────────────
// Domain models
// ──────────────────────────────────────────────

type EventPointRule struct {
	ID           uuid.UUID `json:"id"`
	EventID      uuid.UUID `json:"event_id"`
	RankPosition int       `json:"rank_position"`
	Points       int       `json:"points"`
}

type EventRegistration struct {
	ID           uuid.UUID `json:"id"`
	EventID      uuid.UUID `json:"event_id"`
	TeamID       uuid.UUID `json:"team_id"`
	RegisteredAt time.Time `json:"registered_at"`
}

type EventTeamPoints struct {
	ID           uuid.UUID `json:"id"`
	EventID      uuid.UUID `json:"event_id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	TeamID       uuid.UUID `json:"team_id"`
	RankPosition int       `json:"rank_position"`
	Points       int       `json:"points"`
	AwardedAt    time.Time `json:"awarded_at"`
}

type EventUserPoints struct {
	ID           uuid.UUID `json:"id"`
	EventID      uuid.UUID `json:"event_id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	UserID       uuid.UUID `json:"user_id"`
	TeamID       uuid.UUID `json:"team_id"`
	RankPosition int       `json:"rank_position"`
	Points       int       `json:"points"`
	AwardedAt    time.Time `json:"awarded_at"`
}

// ──────────────────────────────────────────────
// Leaderboard DTOs
// ──────────────────────────────────────────────

type TeamLeaderboardEntry struct {
	TeamID      uuid.UUID `json:"team_id"`
	TeamName    string    `json:"team_name"`
	TeamLogoURL *string   `json:"team_logo_url"`
	SchoolName  *string   `json:"school_name"`
	TotalPoints int       `json:"total_points"`
	Rank        int       `json:"rank"`
}

type UserLeaderboardEntry struct {
	UserID      uuid.UUID `json:"user_id"`
	FullName    string    `json:"full_name"`
	AvatarURL   *string   `json:"avatar_url"`
	TotalPoints int       `json:"total_points"`
	Rank        int       `json:"rank"`
}

type SchoolLeaderboardEntry struct {
	SchoolID    uuid.UUID `json:"school_id"`
	SchoolName  string    `json:"school_name"`
	SchoolLogo  *string   `json:"school_logo"`
	TotalPoints int       `json:"total_points"`
	TeamCount   int       `json:"team_count"`
	Rank        int       `json:"rank"`
}

type EventRegistrationWithTeam struct {
	ID           uuid.UUID   `json:"id"`
	EventID      uuid.UUID   `json:"event_id"`
	Team         TeamSummary `json:"team"`
	RegisteredAt time.Time   `json:"registered_at"`
}

// MyEventRegistration is the DTO for user's registered events (enriched with event info).
type MyEventRegistration struct {
	ID               uuid.UUID `json:"id"`
	EventID          uuid.UUID `json:"event_id"`
	EventName        string    `json:"event_name"`
	EventSlug        string    `json:"event_slug"`
	EventStatus      string    `json:"event_status"`
	EventStartDate   *time.Time `json:"event_start_date"`
	TeamID           uuid.UUID `json:"team_id"`
	TeamName         string    `json:"team_name"`
	RegisteredAt     time.Time `json:"registered_at"`
}

// EnrichedUserPoints is the DTO for user points with event and tournament context.
type EnrichedUserPoints struct {
	ID             uuid.UUID `json:"id"`
	EventID        uuid.UUID `json:"event_id"`
	EventName      string    `json:"event_name"`
	TournamentID   uuid.UUID `json:"tournament_id"`
	TournamentName string    `json:"tournament_name"`
	TeamID         uuid.UUID `json:"team_id"`
	TeamName       string    `json:"team_name"`
	RankPosition   int       `json:"rank_position"`
	Points         int       `json:"points"`
	AwardedAt      time.Time `json:"awarded_at"`
}

// ──────────────────────────────────────────────
// Repository interfaces
// ──────────────────────────────────────────────

type EventPointRuleRepository interface {
	ListByEvent(ctx context.Context, eventID uuid.UUID) ([]*EventPointRule, error)
	FindByEventAndRank(ctx context.Context, eventID uuid.UUID, rank int) (*EventPointRule, error)
	BulkUpsert(ctx context.Context, eventID uuid.UUID, rules []*EventPointRule) error
	DeleteByEvent(ctx context.Context, eventID uuid.UUID) error
}

type EventRegistrationRepository interface {
	Create(ctx context.Context, r *EventRegistration) error
	Delete(ctx context.Context, eventID, teamID uuid.UUID) error
	FindByEventAndTeam(ctx context.Context, eventID, teamID uuid.UUID) (*EventRegistration, error)
	FindByEventAndSchool(ctx context.Context, eventID, schoolID uuid.UUID) (*EventRegistration, error)
	ListByEvent(ctx context.Context, eventID uuid.UUID) ([]*EventRegistration, error)
	ListByEventWithTeams(ctx context.Context, eventID uuid.UUID) ([]*EventRegistrationWithTeam, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*MyEventRegistration, error)
	CountByEvent(ctx context.Context, eventID uuid.UUID) (int, error)
}

type EventTeamPointsRepository interface {
	Create(ctx context.Context, p *EventTeamPoints) error
	BulkCreate(ctx context.Context, points []*EventTeamPoints) error
	DeleteByTournament(ctx context.Context, tournamentID uuid.UUID) error
	ListByEvent(ctx context.Context, eventID uuid.UUID) ([]*EventTeamPoints, error)
	TeamLeaderboard(ctx context.Context, eventID uuid.UUID, limit, offset int) ([]*TeamLeaderboardEntry, int, error)
	TeamLeaderboardGlobal(ctx context.Context, limit, offset int) ([]*TeamLeaderboardEntry, int, error)
	SchoolLeaderboard(ctx context.Context, eventID uuid.UUID, limit, offset int) ([]*SchoolLeaderboardEntry, int, error)
	SchoolLeaderboardGlobal(ctx context.Context, limit, offset int) ([]*SchoolLeaderboardEntry, int, error)
}

type EventUserPointsRepository interface {
	BulkCreate(ctx context.Context, points []*EventUserPoints) error
	DeleteByTournament(ctx context.Context, tournamentID uuid.UUID) error
	UserLeaderboard(ctx context.Context, eventID uuid.UUID, limit, offset int) ([]*UserLeaderboardEntry, int, error)
	UserLeaderboardGlobal(ctx context.Context, limit, offset int) ([]*UserLeaderboardEntry, int, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*EventUserPoints, error)
	ListByUserEnriched(ctx context.Context, userID uuid.UUID) ([]*EnrichedUserPoints, error)
}
