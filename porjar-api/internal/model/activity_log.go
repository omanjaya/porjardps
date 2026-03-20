package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ActivityLog struct {
	ID         uuid.UUID       `json:"id"`
	UserID     *uuid.UUID      `json:"user_id"`
	Action     string          `json:"action"`
	EntityType string          `json:"entity_type"`
	EntityID   *uuid.UUID      `json:"entity_id"`
	Details    json.RawMessage `json:"details"`
	IPAddress  *string         `json:"ip_address"`
	CreatedAt  time.Time       `json:"created_at"`
}

type ActivityLogFilter struct {
	UserID     *uuid.UUID
	Action     *string
	EntityType *string
	EntityID   *uuid.UUID
	Page       int
	Limit      int
}

type ActivityLogRepository interface {
	Create(ctx context.Context, log *ActivityLog) error
	FindByID(ctx context.Context, id uuid.UUID) (*ActivityLog, error)
	List(ctx context.Context, filter ActivityLogFilter) ([]*ActivityLog, int, error)
	ListByUser(ctx context.Context, userID uuid.UUID, page, limit int) ([]*ActivityLog, int, error)
	ListByEntity(ctx context.Context, entityType string, entityID uuid.UUID) ([]*ActivityLog, error)
	FindRecent(ctx context.Context, limit int) ([]*ActivityLog, error)
}
