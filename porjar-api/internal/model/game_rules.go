package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type GameRule struct {
	ID           uuid.UUID `json:"id"`
	GameID       uuid.UUID `json:"game_id"`
	SectionName  string    `json:"section_name"`
	SectionOrder int       `json:"section_order"`
	Content      string    `json:"content"`
	IsPublished  bool      `json:"is_published"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type GameRuleRepository interface {
	ListByGame(ctx context.Context, gameID uuid.UUID, publishedOnly bool) ([]*GameRule, error)
	Upsert(ctx context.Context, rule *GameRule) error
	Delete(ctx context.Context, id uuid.UUID) error
}
