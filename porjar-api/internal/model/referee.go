package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type TournamentPenaltyConfig struct {
	ID                 uuid.UUID `json:"id"`
	TournamentID       uuid.UUID `json:"tournament_id"`
	CardType           string    `json:"card_type"`
	PointDeduction     int       `json:"point_deduction"`
	IsDisqualification bool      `json:"is_disqualification"`
	Description        *string   `json:"description"`
	UpdatedAt          time.Time `json:"updated_at"`
}

// LiveMatch is a unified view of any match currently live across all match types.
type LiveMatch struct {
	Type           string     `json:"type"` // bracket, br, group
	MatchID        uuid.UUID  `json:"match_id"`
	TournamentID   uuid.UUID  `json:"tournament_id"`
	TournamentName string     `json:"tournament_name"`
	TeamAID        *uuid.UUID `json:"team_a_id,omitempty"`
	TeamAName      string     `json:"team_a_name"`
	TeamBID        *uuid.UUID `json:"team_b_id,omitempty"`
	TeamBName      string     `json:"team_b_name"`
	Status         string     `json:"status"`
	Round          *int       `json:"round,omitempty"`
	MatchNumber    *int       `json:"match_number,omitempty"`
	LobbyName      *string    `json:"lobby_name,omitempty"`
}

type AssignmentMatchInfo struct {
	Type        string     `json:"type"`
	TeamAID     *uuid.UUID `json:"team_a_id,omitempty"`
	TeamAName   string     `json:"team_a_name"`
	TeamBID     *uuid.UUID `json:"team_b_id,omitempty"`
	TeamBName   string     `json:"team_b_name"`
	Status      string     `json:"status"`
	Round       *int       `json:"round,omitempty"`
	MatchNumber *int       `json:"match_number,omitempty"`
	LobbyName   *string    `json:"lobby_name,omitempty"`
}

type RefereeAssignment struct {
	ID             uuid.UUID            `json:"id"`
	RefereeID      uuid.UUID            `json:"referee_id"`
	TournamentID   uuid.UUID            `json:"tournament_id"`
	BracketMatchID *uuid.UUID           `json:"bracket_match_id"`
	BRLobbyID      *uuid.UUID           `json:"br_lobby_id"`
	GroupMatchID   *uuid.UUID           `json:"group_match_id"`
	AssignedAt     time.Time            `json:"assigned_at"`
	MatchInfo      *AssignmentMatchInfo `json:"match_info,omitempty"`
}

type MatchCard struct {
	ID             uuid.UUID  `json:"id"`
	TournamentID   uuid.UUID  `json:"tournament_id"`
	TeamID         uuid.UUID  `json:"team_id"`
	IssuedBy       uuid.UUID  `json:"issued_by"`
	CardType       string     `json:"card_type"`
	PointDeduction int        `json:"point_deduction"`
	Reason         string     `json:"reason"`
	BracketMatchID *uuid.UUID `json:"bracket_match_id"`
	BRLobbyID      *uuid.UUID `json:"br_lobby_id"`
	GroupMatchID   *uuid.UUID `json:"group_match_id"`
	IsRevoked      bool       `json:"is_revoked"`
	RevokedBy      *uuid.UUID `json:"revoked_by"`
	RevokedAt      *time.Time `json:"revoked_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

type TournamentPenaltyConfigRepository interface {
	Upsert(ctx context.Context, c *TournamentPenaltyConfig) error
	FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*TournamentPenaltyConfig, error)
	FindByTournamentAndType(ctx context.Context, tournamentID uuid.UUID, cardType string) (*TournamentPenaltyConfig, error)
}

type RefereeAssignmentRepository interface {
	Create(ctx context.Context, a *RefereeAssignment) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*RefereeAssignment, error)
	FindByReferee(ctx context.Context, refereeID uuid.UUID) ([]*RefereeAssignment, error)
	FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*RefereeAssignment, error)
	IsAssigned(ctx context.Context, refereeID uuid.UUID, bracketMatchID, brLobbyID, groupMatchID *uuid.UUID) (bool, error)
}

type MatchCardRepository interface {
	Create(ctx context.Context, c *MatchCard) error
	FindByID(ctx context.Context, id uuid.UUID) (*MatchCard, error)
	Revoke(ctx context.Context, id uuid.UUID, revokedBy uuid.UUID) error
	ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*MatchCard, error)
	ListByTeam(ctx context.Context, teamID uuid.UUID) ([]*MatchCard, error)
	ListByMatch(ctx context.Context, bracketMatchID, brLobbyID, groupMatchID *uuid.UUID) ([]*MatchCard, error)
	ListByIssuedBy(ctx context.Context, issuedBy uuid.UUID) ([]*MatchCard, error)
	SumByTeamAndTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error)
}
