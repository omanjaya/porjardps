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

// --- BRPointRuleRepository ---

type brPointRuleRepo struct {
	db *pgxpool.Pool
}

func NewBRPointRuleRepo(db *pgxpool.Pool) model.BRPointRuleRepository {
	return &brPointRuleRepo{db: db}
}

func (r *brPointRuleRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.BRPointRule, error) {
	rule := &model.BRPointRule{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, placement, points
		 FROM br_point_rules WHERE id = $1`, id).
		Scan(&rule.ID, &rule.TournamentID, &rule.Placement, &rule.Points)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return rule, nil
}

func (r *brPointRuleRepo) Create(ctx context.Context, rule *model.BRPointRule) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO br_point_rules (id, tournament_id, placement, points)
		 VALUES ($1, $2, $3, $4)`,
		rule.ID, rule.TournamentID, rule.Placement, rule.Points)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *brPointRuleRepo) Update(ctx context.Context, rule *model.BRPointRule) error {
	_, err := r.db.Exec(ctx,
		`UPDATE br_point_rules SET placement = $2, points = $3
		 WHERE id = $1`,
		rule.ID, rule.Placement, rule.Points)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *brPointRuleRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM br_point_rules WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *brPointRuleRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRPointRule, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, tournament_id, placement, points
		 FROM br_point_rules WHERE tournament_id = $1
		 ORDER BY placement ASC`, tournamentID)
	if err != nil {
		return nil, fmt.Errorf("ListByTournament: %w", err)
	}
	defer rows.Close()

	var rules []*model.BRPointRule
	for rows.Next() {
		rule := &model.BRPointRule{}
		if err := rows.Scan(&rule.ID, &rule.TournamentID, &rule.Placement, &rule.Points); err != nil {
			return nil, fmt.Errorf("ListByTournament scan: %w", err)
		}
		rules = append(rules, rule)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByTournament rows: %w", err)
	}

	return rules, nil
}

// BulkCreate inserts multiple point rules in a batch
func (r *brPointRuleRepo) BulkCreate(ctx context.Context, rules []*model.BRPointRule) error {
	if len(rules) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	for _, rule := range rules {
		batch.Queue(
			`INSERT INTO br_point_rules (id, tournament_id, placement, points)
			 VALUES ($1, $2, $3, $4)`,
			rule.ID, rule.TournamentID, rule.Placement, rule.Points)
	}

	br := r.db.SendBatch(ctx, batch)
	defer br.Close()

	for range rules {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("BulkCreate: %w", err)
		}
	}

	return nil
}

// FindByPlacement finds a point rule for a specific tournament and placement
func (r *brPointRuleRepo) FindByPlacement(ctx context.Context, tournamentID uuid.UUID, placement int) (*model.BRPointRule, error) {
	rule := &model.BRPointRule{}
	err := r.db.QueryRow(ctx,
		`SELECT id, tournament_id, placement, points
		 FROM br_point_rules WHERE tournament_id = $1 AND placement = $2`, tournamentID, placement).
		Scan(&rule.ID, &rule.TournamentID, &rule.Placement, &rule.Points)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByPlacement: %w", err)
	}
	return rule, nil
}
