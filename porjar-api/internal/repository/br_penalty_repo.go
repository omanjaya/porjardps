package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

// --- BRPenaltyRepository ---

type brPenaltyRepo struct {
	db *pgxpool.Pool
}

func NewBRPenaltyRepo(db *pgxpool.Pool) model.BRPenaltyRepository {
	return &brPenaltyRepo{db: db}
}

func (r *brPenaltyRepo) Create(ctx context.Context, p *model.BRPenalty) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO br_penalties (id, tournament_id, team_id, lobby_id, type, points, reason, applied_by, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		p.ID, p.TournamentID, p.TeamID, p.LobbyID, p.Type, p.Points, p.Reason, p.AppliedBy, p.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *brPenaltyRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.BRPenalty, error) {
	p := &model.BRPenalty{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, team_id, lobby_id, type, points, reason, applied_by, created_at
		 FROM br_penalties WHERE id = $1`, id).
		Scan(&p.ID, &p.TournamentID, &p.TeamID, &p.LobbyID, &p.Type, &p.Points, &p.Reason, &p.AppliedBy, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return p, nil
}

func (r *brPenaltyRepo) FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRPenalty, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, lobby_id, type, points, reason, applied_by, created_at
		 FROM br_penalties WHERE tournament_id = $1
		 ORDER BY created_at DESC`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("FindByTournament: %w", err)
	}
	defer rows.Close()

	var penalties []*model.BRPenalty
	for rows.Next() {
		p := &model.BRPenalty{}
		if err := rows.Scan(&p.ID, &p.TournamentID, &p.TeamID, &p.LobbyID, &p.Type, &p.Points,
			&p.Reason, &p.AppliedBy, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByTournament scan: %w", err)
		}
		penalties = append(penalties, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByTournament rows: %w", err)
	}

	return penalties, nil
}

func (r *brPenaltyRepo) FindByTeam(ctx context.Context, tournamentID, teamID uuid.UUID) ([]*model.BRPenalty, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, team_id, lobby_id, type, points, reason, applied_by, created_at
		 FROM br_penalties WHERE tournament_id = $1 AND team_id = $2
		 ORDER BY created_at DESC`, tournamentID, teamID)
	if err != nil {
		return nil, fmt.Errorf("FindByTeam: %w", err)
	}
	defer rows.Close()

	var penalties []*model.BRPenalty
	for rows.Next() {
		p := &model.BRPenalty{}
		if err := rows.Scan(&p.ID, &p.TournamentID, &p.TeamID, &p.LobbyID, &p.Type, &p.Points,
			&p.Reason, &p.AppliedBy, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByTeam scan: %w", err)
		}
		penalties = append(penalties, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByTeam rows: %w", err)
	}

	return penalties, nil
}

func (r *brPenaltyRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM br_penalties WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}
