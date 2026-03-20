package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type brLobbyTeamRepo struct {
	db *pgxpool.Pool
}

func NewBRLobbyTeamRepo(db *pgxpool.Pool) model.BRLobbyTeamRepository {
	return &brLobbyTeamRepo{db: db}
}

func (r *brLobbyTeamRepo) AssignTeams(ctx context.Context, lobbyID uuid.UUID, teamIDs []uuid.UUID) error {
	if len(teamIDs) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	for _, teamID := range teamIDs {
		batch.Queue(
			`INSERT INTO br_lobby_teams (id, lobby_id, team_id)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (lobby_id, team_id) DO NOTHING`,
			uuid.New(), lobbyID, teamID)
	}

	br := r.db.SendBatch(ctx, batch)
	defer br.Close()

	for range teamIDs {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("AssignTeams: %w", err)
		}
	}

	return nil
}

func (r *brLobbyTeamRepo) FindByLobby(ctx context.Context, lobbyID uuid.UUID) ([]*model.BRLobbyTeam, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, lobby_id, team_id FROM br_lobby_teams WHERE lobby_id = $1`, lobbyID)
	if err != nil {
		return nil, fmt.Errorf("FindByLobby: %w", err)
	}
	defer rows.Close()

	var items []*model.BRLobbyTeam
	for rows.Next() {
		item := &model.BRLobbyTeam{}
		if err := rows.Scan(&item.ID, &item.LobbyID, &item.TeamID); err != nil {
			return nil, fmt.Errorf("FindByLobby scan: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByLobby rows: %w", err)
	}

	return items, nil
}

func (r *brLobbyTeamRepo) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.BRLobbyTeam, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, lobby_id, team_id FROM br_lobby_teams WHERE team_id = $1`, teamID)
	if err != nil {
		return nil, fmt.Errorf("FindByTeam: %w", err)
	}
	defer rows.Close()

	var items []*model.BRLobbyTeam
	for rows.Next() {
		item := &model.BRLobbyTeam{}
		if err := rows.Scan(&item.ID, &item.LobbyID, &item.TeamID); err != nil {
			return nil, fmt.Errorf("FindByTeam scan: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByTeam rows: %w", err)
	}

	return items, nil
}

func (r *brLobbyTeamRepo) RemoveAll(ctx context.Context, lobbyID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM br_lobby_teams WHERE lobby_id = $1`, lobbyID)
	if err != nil {
		return fmt.Errorf("RemoveAll: %w", err)
	}
	return nil
}
