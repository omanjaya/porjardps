package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type SwissConfig struct {
	MaxRounds     int `json:"max_rounds"`
	WinThreshold  int `json:"win_threshold"`
	LossThreshold int `json:"loss_threshold"`
	CurrentRound  int `json:"current_round"`
}

type TournamentGroup struct {
	ID           uuid.UUID `json:"id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	Name         string    `json:"name"`
	GroupOrder   int       `json:"group_order"`
	AdvanceCount int       `json:"advance_count"`
	Legs         int          `json:"legs"`
	PairingMode  string       `json:"pairing_mode"`
	SwissConfig  *SwissConfig `json:"swiss_config,omitempty"`
	StageID      *uuid.UUID   `json:"stage_id,omitempty"`
	CreatedAt    time.Time    `json:"created_at"`

	// Enriched fields
	Teams    []TeamSummary    `json:"teams,omitempty"`
	Matches  []*GroupMatch    `json:"matches,omitempty"`
	Standing []*GroupStanding `json:"standings,omitempty"`
}

type GroupMatch struct {
	ID          uuid.UUID  `json:"id"`
	GroupID     uuid.UUID  `json:"group_id"`
	Round       int        `json:"round"`
	MatchNumber int        `json:"match_number"`
	TeamAID     *uuid.UUID `json:"team_a_id"`
	TeamBID     *uuid.UUID `json:"team_b_id"`
	ScoreA      int        `json:"score_a"`
	ScoreB      int        `json:"score_b"`
	Status      string     `json:"status"`
	ScheduledAt *time.Time `json:"scheduled_at"`
	CompletedAt *time.Time `json:"completed_at"`
	CreatedAt   time.Time  `json:"created_at"`

	// Enriched fields
	TeamA *TeamSummary `json:"team_a,omitempty"`
	TeamB *TeamSummary `json:"team_b,omitempty"`
}

type GroupStanding struct {
	ID             uuid.UUID `json:"id"`
	GroupID        uuid.UUID `json:"group_id"`
	TeamID         uuid.UUID `json:"team_id"`
	MatchesPlayed  int       `json:"matches_played"`
	Wins           int       `json:"wins"`
	Draws          int       `json:"draws"`
	Losses         int       `json:"losses"`
	GoalsFor       int       `json:"goals_for"`
	GoalsAgainst   int       `json:"goals_against"`
	GoalDifference int       `json:"goal_difference"`
	Points         int       `json:"points"`
	PenaltyPoints  int       `json:"penalty_points" db:"penalty_points"`
	RankPosition   int       `json:"rank_position"`

	// Enriched fields
	Team *TeamSummary `json:"team,omitempty"`
}

type GroupRepository interface {
	// Groups
	CreateGroup(ctx context.Context, g *TournamentGroup) error
	FindGroupByID(ctx context.Context, id uuid.UUID) (*TournamentGroup, error)
	FindGroupsByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*TournamentGroup, error)
	DeleteGroup(ctx context.Context, id uuid.UUID) error
	UpdateGroup(ctx context.Context, id uuid.UUID, name string, advanceCount int) error

	// Group teams
	AddTeamToGroup(ctx context.Context, groupID, teamID uuid.UUID) error
	RemoveTeamFromGroup(ctx context.Context, groupID, teamID uuid.UUID) error
	FindTeamsByGroup(ctx context.Context, groupID uuid.UUID) ([]uuid.UUID, error)

	// Group matches
	CreateMatch(ctx context.Context, m *GroupMatch) error
	FindMatchesByGroup(ctx context.Context, groupID uuid.UUID) ([]*GroupMatch, error)
	FindMatchByID(ctx context.Context, id uuid.UUID) (*GroupMatch, error)
	FindMatchByIDs(ctx context.Context, ids []uuid.UUID) ([]*GroupMatch, error)
	UpdateMatchScore(ctx context.Context, id uuid.UUID, scoreA, scoreB int, scheduledAt *time.Time) error
	MarkMatchCompleted(ctx context.Context, id uuid.UUID) error
	DeleteMatchesByGroup(ctx context.Context, groupID uuid.UUID) error

	// Match status
	UpdateMatchStatus(ctx context.Context, id uuid.UUID, status string) error
	FindLiveMatches(ctx context.Context, limit int) ([]*GroupMatch, error)
	FindLiveMatchesByTeam(ctx context.Context, teamID uuid.UUID) ([]*GroupMatch, error)
	FindScheduledMatches(ctx context.Context, limit int) ([]*GroupMatch, error)

	// Reset
	ResetMatchResultsByGroup(ctx context.Context, groupID uuid.UUID) error

	// Standings
	UpsertStanding(ctx context.Context, s *GroupStanding) error
	FindStandingsByGroup(ctx context.Context, groupID uuid.UUID) ([]*GroupStanding, error)
	DeleteStandingsByGroup(ctx context.Context, groupID uuid.UUID) error
	UpdatePenaltyPoints(ctx context.Context, groupID, teamID uuid.UUID, penaltyPoints int) error

	// Swiss
	UpdateSwissConfig(ctx context.Context, groupID uuid.UUID, config *SwissConfig) error
}
