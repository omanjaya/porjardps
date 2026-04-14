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

type eventPointRuleRepo struct {
	db *pgxpool.Pool
}

func NewEventPointRuleRepo(db *pgxpool.Pool) model.EventPointRuleRepository {
	return &eventPointRuleRepo{db: db}
}

func (r *eventPointRuleRepo) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]*model.EventPointRule, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, event_id, rank_position, points
		 FROM event_point_rules WHERE event_id = $1
		 ORDER BY rank_position ASC`, eventID)
	if err != nil {
		return nil, fmt.Errorf("ListByEvent: %w", err)
	}
	defer rows.Close()

	var rules []*model.EventPointRule
	for rows.Next() {
		rule := &model.EventPointRule{}
		if err := rows.Scan(&rule.ID, &rule.EventID, &rule.RankPosition, &rule.Points); err != nil {
			return nil, fmt.Errorf("ListByEvent scan: %w", err)
		}
		rules = append(rules, rule)
	}
	return rules, rows.Err()
}

func (r *eventPointRuleRepo) FindByEventAndRank(ctx context.Context, eventID uuid.UUID, rank int) (*model.EventPointRule, error) {
	rule := &model.EventPointRule{}
	err := r.db.QueryRow(ctx,
		`SELECT id, event_id, rank_position, points
		 FROM event_point_rules WHERE event_id = $1 AND rank_position = $2`,
		eventID, rank).
		Scan(&rule.ID, &rule.EventID, &rule.RankPosition, &rule.Points)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByEventAndRank: %w", err)
	}
	return rule, nil
}

func (r *eventPointRuleRepo) BulkUpsert(ctx context.Context, eventID uuid.UUID, rules []*model.EventPointRule) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("BulkUpsert begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Delete existing rules for this event
	if _, err := tx.Exec(ctx, `DELETE FROM event_point_rules WHERE event_id = $1`, eventID); err != nil {
		return fmt.Errorf("BulkUpsert delete: %w", err)
	}

	// Insert new rules
	for _, rule := range rules {
		rule.ID = uuid.New()
		rule.EventID = eventID
		if _, err := tx.Exec(ctx,
			`INSERT INTO event_point_rules (id, event_id, rank_position, points)
			 VALUES ($1, $2, $3, $4)`,
			rule.ID, rule.EventID, rule.RankPosition, rule.Points); err != nil {
			return fmt.Errorf("BulkUpsert insert: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *eventPointRuleRepo) DeleteByEvent(ctx context.Context, eventID uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM event_point_rules WHERE event_id = $1`, eventID)
	if err != nil {
		return fmt.Errorf("DeleteByEvent: %w", err)
	}
	return nil
}
