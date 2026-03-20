package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type School struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Level     string    `json:"level"`
	Address   *string   `json:"address"`
	City      string    `json:"city"`
	LogoURL    *string   `json:"logo_url"`
	CoachPhone *string   `json:"coach_phone"`
	CreatedAt  time.Time `json:"created_at"`
}

type SchoolFilter struct {
	Level  *string
	Search *string
	Page   int
	Limit  int
}

type SchoolRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*School, error)
	FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*School, error)
	FindByNameAndLevel(ctx context.Context, name, level string) (*School, error)
	Create(ctx context.Context, s *School) error
	Update(ctx context.Context, s *School) error
	List(ctx context.Context, filter SchoolFilter) ([]*School, int, error)
	HasTeams(ctx context.Context, id uuid.UUID) (bool, error)
}
