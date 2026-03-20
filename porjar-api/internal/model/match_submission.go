package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type MatchSubmission struct {
	ID              uuid.UUID  `json:"id"`
	BracketMatchID  *uuid.UUID `json:"bracket_match_id"`
	BRLobbyID       *uuid.UUID `json:"br_lobby_id"`
	SubmittedBy     uuid.UUID  `json:"submitted_by"`
	TeamID          uuid.UUID  `json:"team_id"`
	ClaimedWinnerID *uuid.UUID `json:"claimed_winner_id"`
	ClaimedScoreA   *int       `json:"claimed_score_a"`
	ClaimedScoreB   *int       `json:"claimed_score_b"`
	ClaimedPlacement *int      `json:"claimed_placement"`
	ClaimedKills    *int       `json:"claimed_kills"`
	ScreenshotURLs  []string   `json:"screenshot_urls"`
	Status          string     `json:"status"`
	VerifiedBy      *uuid.UUID `json:"verified_by"`
	VerifiedAt      *time.Time `json:"verified_at"`
	RejectionReason *string    `json:"rejection_reason"`
	AdminNotes      *string    `json:"admin_notes"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// AdminSubmissionDTO is the enriched submission returned by admin list endpoints.
type AdminSubmissionDTO struct {
	MatchSubmission
	TeamAName     string `json:"team_a_name"`
	TeamBName     string `json:"team_b_name"`
	TeamName      string `json:"team_name"`
	GameName      string `json:"game_name"`
	SubmittedByName string `json:"submitted_by_name"`
}

type MatchSubmissionFilter struct {
	BracketMatchID *uuid.UUID
	BRLobbyID      *uuid.UUID
	TeamID         *uuid.UUID
	Status         *string
	Page           int
	Limit          int
}

type MatchSubmissionRepository interface {
	Create(ctx context.Context, s *MatchSubmission) error
	FindByID(ctx context.Context, id uuid.UUID) (*MatchSubmission, error)
	FindByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*MatchSubmission, error)
	FindByBracketMatchIDs(ctx context.Context, matchIDs []uuid.UUID) (map[uuid.UUID][]*MatchSubmission, error)
	FindByLobby(ctx context.Context, brLobbyID uuid.UUID) ([]*MatchSubmission, error)
	FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*MatchSubmission, error)
	FindPending(ctx context.Context, page, limit int) ([]*MatchSubmission, int, error)
	FindPendingByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*MatchSubmission, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, verifiedBy *uuid.UUID, rejectionReason *string, adminNotes *string) error
	List(ctx context.Context, filter MatchSubmissionFilter) ([]*MatchSubmission, int, error)
}

type CoachSchool struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	SchoolID  uuid.UUID `json:"school_id"`
	CreatedAt time.Time `json:"created_at"`
}

type CoachSchoolRepository interface {
	Create(ctx context.Context, cs *CoachSchool) error
	FindByUser(ctx context.Context, userID uuid.UUID) ([]*CoachSchool, error)
	FindBySchool(ctx context.Context, schoolID uuid.UUID) ([]*CoachSchool, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
