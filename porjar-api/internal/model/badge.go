package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Badge struct {
	ID          int64     `json:"id"`
	Slug        string    `json:"slug"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Icon        string    `json:"icon"`
	Color       string    `json:"color"`
	Category    string    `json:"category"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
}

type UserBadge struct {
	UserID   uuid.UUID `json:"user_id"`
	BadgeID  int64     `json:"badge_id"`
	EarnedAt time.Time `json:"earned_at"`
	Badge    *Badge    `json:"badge,omitempty"`
}

type BadgeRepository interface {
	ListAll(ctx context.Context) ([]*Badge, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]*UserBadge, error)
	FindBySlug(ctx context.Context, slug string) (*Badge, error)
	AwardBadge(ctx context.Context, userID uuid.UUID, badgeID int64) error
	HasBadge(ctx context.Context, userID uuid.UUID, badgeID int64) (bool, error)
}
