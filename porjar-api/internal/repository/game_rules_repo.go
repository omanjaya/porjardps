package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type gameRulesRepo struct {
	db *pgxpool.Pool
}

func NewGameRulesRepo(db *pgxpool.Pool) model.GameRuleRepository {
	return &gameRulesRepo{db: db}
}

func (r *gameRulesRepo) ListByGame(ctx context.Context, gameID uuid.UUID, publishedOnly bool) ([]*model.GameRule, error) {
	query := `SELECT id, game_id, section_name, section_order, content, is_published, updated_at
		FROM game_rules WHERE game_id = $1`
	if publishedOnly {
		query += ` AND is_published = true`
	}
	query += ` ORDER BY section_order ASC, section_name ASC`

	rows, err := r.db.Query(ctx, query, gameID)
	if err != nil {
		return nil, fmt.Errorf("ListByGame: %w", err)
	}
	defer rows.Close()

	var rules []*model.GameRule
	for rows.Next() {
		rule := &model.GameRule{}
		if err := rows.Scan(&rule.ID, &rule.GameID, &rule.SectionName, &rule.SectionOrder, &rule.Content, &rule.IsPublished, &rule.UpdatedAt); err != nil {
			return nil, fmt.Errorf("ListByGame scan: %w", err)
		}
		rules = append(rules, rule)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByGame rows: %w", err)
	}

	return rules, nil
}

func (r *gameRulesRepo) Upsert(ctx context.Context, rule *model.GameRule) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO game_rules (id, game_id, section_name, section_order, content, is_published, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, now())
		ON CONFLICT (game_id, section_name)
		DO UPDATE SET section_order = EXCLUDED.section_order,
		              content = EXCLUDED.content,
		              is_published = EXCLUDED.is_published,
		              updated_at = now()`,
		rule.ID, rule.GameID, rule.SectionName, rule.SectionOrder, rule.Content, rule.IsPublished,
	)
	if err != nil {
		return fmt.Errorf("Upsert: %w", err)
	}
	return nil
}

func (r *gameRulesRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM game_rules WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}
