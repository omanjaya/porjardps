package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uuid.UUID       `json:"id"`
	UserID    uuid.UUID       `json:"user_id"`
	Type      string          `json:"type"` // "team_approved", "team_rejected", "match_starting", "score_update", "registration_confirmed"
	Title     string          `json:"title"`
	Message   string          `json:"message"`
	Data      json.RawMessage `json:"data,omitempty"` // flexible payload
	IsRead    bool            `json:"is_read"`
	CreatedAt time.Time       `json:"created_at"`
}

type NotificationRepository interface {
	Create(ctx context.Context, n *Notification) error
	FindByID(ctx context.Context, id uuid.UUID) (*Notification, error)
	FindByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*Notification, int, error)
	MarkRead(ctx context.Context, id uuid.UUID) error
	MarkAllRead(ctx context.Context, userID uuid.UUID) error
	CountUnread(ctx context.Context, userID uuid.UUID) (int, error)
}
