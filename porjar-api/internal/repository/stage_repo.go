package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type stageRepo struct {
	db *pgxpool.Pool
}

func NewStageRepo(db *pgxpool.Pool) model.StageRepository {
	return &stageRepo{db: db}
}

func (r *stageRepo) Create(ctx context.Context, s *model.TournamentStage) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO tournament_stages (tournament_id, stage_order, stage_type, name, config, status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at`,
		s.TournamentID, s.StageOrder, s.StageType, s.Name, s.Config, s.Status,
	).Scan(&s.ID, &s.CreatedAt)
}

func (r *stageRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.TournamentStage, error) {
	s := &model.TournamentStage{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, stage_order, stage_type, name, config, status, created_at
		 FROM tournament_stages WHERE id = $1`, id,
	).Scan(&s.ID, &s.TournamentID, &s.StageOrder, &s.StageType, &s.Name, &s.Config, &s.Status, &s.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return s, nil
}

func (r *stageRepo) FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentStage, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, stage_order, stage_type, name, config, status, created_at
		 FROM tournament_stages WHERE tournament_id = $1
		 ORDER BY stage_order`, tournamentID,
	)
	if err != nil {
		return nil, fmt.Errorf("FindByTournament: %w", err)
	}
	defer rows.Close()

	var stages []*model.TournamentStage
	for rows.Next() {
		s := &model.TournamentStage{}
		if err := rows.Scan(&s.ID, &s.TournamentID, &s.StageOrder, &s.StageType, &s.Name, &s.Config, &s.Status, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByTournament scan: %w", err)
		}
		stages = append(stages, s)
	}
	return stages, rows.Err()
}

func (r *stageRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE tournament_stages SET status = $2 WHERE id = $1`,
		id, status,
	)
	return err
}

func (r *stageRepo) UpdateConfig(ctx context.Context, id uuid.UUID, config json.RawMessage) error {
	_, err := r.db.Exec(ctx,
		`UPDATE tournament_stages SET config = $2 WHERE id = $1`,
		id, config,
	)
	return err
}

func (r *stageRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM tournament_stages WHERE id = $1`, id)
	return err
}
