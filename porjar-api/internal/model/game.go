package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Game struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	Slug            string    `json:"slug"`
	MaxTeamMembers  int       `json:"max_team_members"`
	MinTeamMembers  int       `json:"min_team_members"`
	MaxSubstitutes  int       `json:"max_substitutes"`
	GameType        string    `json:"game_type"`
	IconURL         *string   `json:"icon_url"`
	RulesURL        *string   `json:"rules_url"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
}

type GameRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*Game, error)
	FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*Game, error)
	FindBySlug(ctx context.Context, slug string) (*Game, error)
	List(ctx context.Context) ([]*Game, error)
}
