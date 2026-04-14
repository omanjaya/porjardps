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
	GroupMatchID    *uuid.UUID `json:"group_match_id"`
	SubmittedBy     uuid.UUID  `json:"submitted_by"`
	TeamID          uuid.UUID  `json:"team_id"`
	ClaimedWinnerID *uuid.UUID `json:"claimed_winner_id"`
	ClaimedScoreA   *int       `json:"claimed_score_a"`
	ClaimedScoreB   *int       `json:"claimed_score_b"`
	ClaimedPlacement *int      `json:"claimed_placement"`
	ClaimedKills    *int       `json:"claimed_kills"`
	KillsP1         int        `json:"kills_p1"`
	KillsP2         int        `json:"kills_p2"`
	KillsP3         int        `json:"kills_p3"`
	KillsP4         int        `json:"kills_p4"`
	ScreenshotURLs  []string   `json:"screenshot_urls"`
	Status          string     `json:"status"`
	GameNumber      int        `json:"game_number"`
	MapNumber       int        `json:"map_number"`
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
	TeamAID         *uuid.UUID `json:"team_a_id,omitempty"`
	TeamBID         *uuid.UUID `json:"team_b_id,omitempty"`
	TeamAName       string     `json:"team_a_name"`
	TeamBName       string     `json:"team_b_name"`
	TeamName        string     `json:"team_name"`
	GameName        string     `json:"game_name"`
	GameSlug        string     `json:"game_slug"`
	SubmittedByName string     `json:"submitted_by_name"`
}

// SubmissionWithNames is a lightweight enrichment adding team/winner names to a submission.
type SubmissionWithNames struct {
	MatchSubmission
	TeamName         string `json:"team_name,omitempty"`
	ClaimedWinnerName string `json:"claimed_winner_name,omitempty"`
	SubmitterName    string `json:"submitter_name,omitempty"`
}

// PlayerSubmissionDTO is the enriched submission for the player's submission history.
type PlayerSubmissionDTO struct {
	ID               uuid.UUID  `json:"id"`
	MatchID          string     `json:"match_id"`
	MatchType        string     `json:"match_type"`
	TeamAName        string     `json:"team_a_name"`
	TeamBName        string     `json:"team_b_name"`
	GameName         string     `json:"game_name"`
	GameSlug         string     `json:"game_slug"`
	ClaimedScoreA    *int       `json:"claimed_score_a"`
	ClaimedScoreB    *int       `json:"claimed_score_b"`
	ClaimedWinner    string     `json:"claimed_winner,omitempty"`
	ClaimedPlacement *int       `json:"claimed_placement"`
	ClaimedKills     *int       `json:"claimed_kills"`
	KillsP1          int        `json:"kills_p1"`
	KillsP2          int        `json:"kills_p2"`
	KillsP3          int        `json:"kills_p3"`
	KillsP4          int        `json:"kills_p4"`
	Screenshots      []string   `json:"screenshots"`
	Status           string     `json:"status"`
	SubmittedBy      string     `json:"submitted_by"`
	SubmittedTeam    string     `json:"submitted_team"`
	SubmittedAt      time.Time  `json:"submitted_at"`
	RejectionReason  *string    `json:"rejection_reason,omitempty"`
}

type MatchSubmissionFilter struct {
	BracketMatchID *uuid.UUID
	BRLobbyID      *uuid.UUID
	GroupMatchID   *uuid.UUID
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
	FindApprovedByLobbyTeamMap(ctx context.Context, lobbyID, teamID uuid.UUID, mapNumber int) (*MatchSubmission, error)
	FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*MatchSubmission, error)
	FindPending(ctx context.Context, page, limit int) ([]*MatchSubmission, int, error)
	FindPendingByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*MatchSubmission, error)
	FindByGroupMatch(ctx context.Context, groupMatchID uuid.UUID) ([]*MatchSubmission, error)
	FindPendingByGroupMatch(ctx context.Context, groupMatchID uuid.UUID) ([]*MatchSubmission, error)
	FindApprovedByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*MatchSubmission, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, verifiedBy *uuid.UUID, rejectionReason *string, adminNotes *string) error
	Update(ctx context.Context, s *MatchSubmission) error
	UpdateScreenshots(ctx context.Context, id uuid.UUID, urls []string) error
	DeleteScreenshot(ctx context.Context, id uuid.UUID, url string) error
	List(ctx context.Context, filter MatchSubmissionFilter) ([]*MatchSubmission, int, error)
	DeleteByBracketMatch(ctx context.Context, bracketMatchID uuid.UUID) error
	DeleteByGroupMatch(ctx context.Context, groupMatchID uuid.UUID) error
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
