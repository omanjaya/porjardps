package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type PushSubscription struct {
	ID        uuid.UUID  `json:"id"`
	UserID    *uuid.UUID `json:"user_id"`
	Endpoint  string     `json:"endpoint"`
	P256dh    string     `json:"p256dh"`
	Auth      string     `json:"auth"`
	CreatedAt time.Time  `json:"created_at"`
}

type PushSubscriptionRepository interface {
	Upsert(ctx context.Context, sub *PushSubscription) error
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*PushSubscription, error)
	DeleteByEndpoint(ctx context.Context, endpoint string) error
	FindAll(ctx context.Context) ([]*PushSubscription, error)
}
