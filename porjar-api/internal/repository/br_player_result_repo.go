package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// --- BRPlayerResultRepository ---

type brPlayerResultRepo struct {
	db *pgxpool.Pool
}

func NewBRPlayerResultRepo(db *pgxpool.Pool) model.BRPlayerResultRepository {
	return &brPlayerResultRepo{db: db}
}

func (r *brPlayerResultRepo) Create(ctx context.Context, res *model.BRPlayerResult) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO br_player_results (id, lobby_result_id, user_id, kills, damage, is_mvp, survival_time_seconds, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		res.ID, res.LobbyResultID, res.UserID, res.Kills, res.Damage, res.IsMVP, res.SurvivalTimeSeconds, res.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *brPlayerResultRepo) BulkCreate(ctx context.Context, results []*model.BRPlayerResult) error {
	if len(results) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	for _, res := range results {
		batch.Queue(
			`INSERT INTO br_player_results (id, lobby_result_id, user_id, kills, damage, is_mvp, survival_time_seconds, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
			res.ID, res.LobbyResultID, res.UserID, res.Kills, res.Damage, res.IsMVP, res.SurvivalTimeSeconds, res.CreatedAt)
	}

	br := r.db.SendBatch(ctx, batch)
	defer br.Close()

	for range results {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("BulkCreate: %w", err)
		}
	}

	return nil
}

func (r *brPlayerResultRepo) FindByLobbyResult(ctx context.Context, lobbyResultID uuid.UUID) ([]*model.BRPlayerResult, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, lobby_result_id, user_id, kills, damage, is_mvp, survival_time_seconds, created_at
		 FROM br_player_results WHERE lobby_result_id = $1
		 ORDER BY kills DESC`, lobbyResultID)
	if err != nil {
		return nil, fmt.Errorf("FindByLobbyResult: %w", err)
	}
	defer rows.Close()

	var results []*model.BRPlayerResult
	for rows.Next() {
		res := &model.BRPlayerResult{}
		if err := rows.Scan(&res.ID, &res.LobbyResultID, &res.UserID, &res.Kills, &res.Damage,
			&res.IsMVP, &res.SurvivalTimeSeconds, &res.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByLobbyResult scan: %w", err)
		}
		results = append(results, res)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByLobbyResult rows: %w", err)
	}

	return results, nil
}

func (r *brPlayerResultRepo) FindByUser(ctx context.Context, userID uuid.UUID) ([]*model.BRPlayerResult, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, lobby_result_id, user_id, kills, damage, is_mvp, survival_time_seconds, created_at
		 FROM br_player_results WHERE user_id = $1
		 ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("FindByUser: %w", err)
	}
	defer rows.Close()

	var results []*model.BRPlayerResult
	for rows.Next() {
		res := &model.BRPlayerResult{}
		if err := rows.Scan(&res.ID, &res.LobbyResultID, &res.UserID, &res.Kills, &res.Damage,
			&res.IsMVP, &res.SurvivalTimeSeconds, &res.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByUser scan: %w", err)
		}
		results = append(results, res)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByUser rows: %w", err)
	}

	return results, nil
}
