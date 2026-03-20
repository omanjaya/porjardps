package model

import (
	"context"

	"github.com/google/uuid"
)

type BRLobbyTeam struct {
	ID      uuid.UUID `json:"id"`
	LobbyID uuid.UUID `json:"lobby_id"`
	TeamID  uuid.UUID `json:"team_id"`
}

type BRDailyStanding struct {
	ID           uuid.UUID `json:"id"`
	TournamentID uuid.UUID `json:"tournament_id"`
	TeamID       uuid.UUID `json:"team_id"`
	DayNumber    int       `json:"day_number"`
	TotalPoints  int       `json:"total_points"`
	TotalKills   int       `json:"total_kills"`
	RankPosition *int      `json:"rank_position"`
	IsQualified  bool      `json:"is_qualified"`
}

type BRLobbyTeamRepository interface {
	AssignTeams(ctx context.Context, lobbyID uuid.UUID, teamIDs []uuid.UUID) error
	FindByLobby(ctx context.Context, lobbyID uuid.UUID) ([]*BRLobbyTeam, error)
	FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*BRLobbyTeam, error)
	RemoveAll(ctx context.Context, lobbyID uuid.UUID) error
}

type BRDailyStandingsRepository interface {
	Upsert(ctx context.Context, s *BRDailyStanding) error
	FindByTournamentAndDay(ctx context.Context, tournamentID uuid.UUID, dayNumber int) ([]*BRDailyStanding, error)
	UpdateRanks(ctx context.Context, tournamentID uuid.UUID, dayNumber int) error
}
