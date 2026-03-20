package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Webhook struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	URL             string     `json:"url"`
	Secret          *string    `json:"secret,omitempty"`
	Events          []string   `json:"events"`
	IsActive        bool       `json:"is_active"`
	CreatedBy       *uuid.UUID `json:"created_by"`
	LastTriggeredAt *time.Time `json:"last_triggered_at"`
	FailureCount    int        `json:"failure_count"`
	CreatedAt       time.Time  `json:"created_at"`
}

type WebhookLog struct {
	ID             uuid.UUID       `json:"id"`
	WebhookID      uuid.UUID       `json:"webhook_id"`
	Event          string          `json:"event"`
	Payload        json.RawMessage `json:"payload"`
	ResponseStatus *int            `json:"response_status"`
	ResponseBody   *string         `json:"response_body"`
	DurationMs     *int            `json:"duration_ms"`
	Success        bool            `json:"success"`
	CreatedAt      time.Time       `json:"created_at"`
}

type WebhookRepository interface {
	FindAll(ctx context.Context) ([]*Webhook, error)
	FindByID(ctx context.Context, id uuid.UUID) (*Webhook, error)
	Create(ctx context.Context, w *Webhook) error
	Update(ctx context.Context, w *Webhook) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindActiveByEvent(ctx context.Context, event string) ([]*Webhook, error)
	UpdateLastTriggered(ctx context.Context, id uuid.UUID) error
	IncrementFailureCount(ctx context.Context, id uuid.UUID) error
	ResetFailureCount(ctx context.Context, id uuid.UUID) error
}

type WebhookLogRepository interface {
	Create(ctx context.Context, l *WebhookLog) error
	FindByWebhook(ctx context.Context, webhookID uuid.UUID, limit int) ([]*WebhookLog, error)
}
