package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type EventSection struct {
	ID          uuid.UUID       `json:"id"`
	EventID     uuid.UUID       `json:"event_id"`
	SectionType string          `json:"section_type"`
	SortOrder   int             `json:"sort_order"`
	Enabled     bool            `json:"enabled"`
	Config      json.RawMessage `json:"config"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type EventSectionRepository interface {
	ListByEvent(ctx context.Context, eventID uuid.UUID, enabledOnly bool) ([]*EventSection, error)
	FindByID(ctx context.Context, id uuid.UUID) (*EventSection, error)
	Create(ctx context.Context, s *EventSection) error
	Update(ctx context.Context, s *EventSection) error
	Delete(ctx context.Context, id uuid.UUID) error
	Reorder(ctx context.Context, eventID uuid.UUID, orderedIDs []uuid.UUID) error
}
