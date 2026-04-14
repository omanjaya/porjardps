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

type badgeRepo struct {
	db *pgxpool.Pool
}

func NewBadgeRepo(db *pgxpool.Pool) model.BadgeRepository {
	return &badgeRepo{db: db}
}

func (r *badgeRepo) ListAll(ctx context.Context) ([]*model.Badge, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, slug, name, description, icon, color, category, sort_order, created_at
		 FROM badges ORDER BY sort_order ASC, id ASC`)
	if err != nil {
		return nil, fmt.Errorf("ListAll badges: %w", err)
	}
	defer rows.Close()

	var badges []*model.Badge
	for rows.Next() {
		b := &model.Badge{}
		if err := rows.Scan(&b.ID, &b.Slug, &b.Name, &b.Description, &b.Icon, &b.Color, &b.Category, &b.SortOrder, &b.CreatedAt); err != nil {
			return nil, fmt.Errorf("ListAll badges scan: %w", err)
		}
		badges = append(badges, b)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListAll badges rows: %w", err)
	}
	return badges, nil
}

func (r *badgeRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]*model.UserBadge, error) {
	rows, err := r.db.Query(ctx,
		`SELECT ub.user_id, ub.badge_id, ub.earned_at,
		        b.id, b.slug, b.name, b.description, b.icon, b.color, b.category, b.sort_order, b.created_at
		 FROM user_badges ub
		 JOIN badges b ON b.id = ub.badge_id
		 WHERE ub.user_id = $1
		 ORDER BY b.sort_order ASC, ub.earned_at ASC`, userID)
	if err != nil {
		return nil, fmt.Errorf("ListByUser badges: %w", err)
	}
	defer rows.Close()

	var userBadges []*model.UserBadge
	for rows.Next() {
		ub := &model.UserBadge{}
		b := &model.Badge{}
		if err := rows.Scan(
			&ub.UserID, &ub.BadgeID, &ub.EarnedAt,
			&b.ID, &b.Slug, &b.Name, &b.Description, &b.Icon, &b.Color, &b.Category, &b.SortOrder, &b.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("ListByUser badges scan: %w", err)
		}
		ub.Badge = b
		userBadges = append(userBadges, ub)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ListByUser badges rows: %w", err)
	}
	return userBadges, nil
}

func (r *badgeRepo) FindBySlug(ctx context.Context, slug string) (*model.Badge, error) {
	b := &model.Badge{}
	err := r.db.QueryRow(ctx,
		`SELECT id, slug, name, description, icon, color, category, sort_order, created_at
		 FROM badges WHERE slug = $1`, slug).
		Scan(&b.ID, &b.Slug, &b.Name, &b.Description, &b.Icon, &b.Color, &b.Category, &b.SortOrder, &b.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindBySlug badge: %w", err)
	}
	return b, nil
}

func (r *badgeRepo) AwardBadge(ctx context.Context, userID uuid.UUID, badgeID int64) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO user_badges (user_id, badge_id, earned_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (user_id, badge_id) DO NOTHING`,
		userID, badgeID)
	if err != nil {
		return fmt.Errorf("AwardBadge: %w", err)
	}
	return nil
}

func (r *badgeRepo) HasBadge(ctx context.Context, userID uuid.UUID, badgeID int64) (bool, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM user_badges WHERE user_id = $1 AND badge_id = $2`,
		userID, badgeID).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("HasBadge: %w", err)
	}
	return count > 0, nil
}
