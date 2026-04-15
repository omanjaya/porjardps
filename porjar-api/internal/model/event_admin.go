package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type EventAdmin struct {
	ID         uuid.UUID  `json:"id"`
	EventID    uuid.UUID  `json:"event_id"`
	UserID     uuid.UUID  `json:"user_id"`
	AssignedBy *uuid.UUID `json:"assigned_by"`
	CreatedAt  time.Time  `json:"created_at"`
	// Enriched
	UserFullName string `json:"user_full_name,omitempty"`
	UserEmail    string `json:"user_email,omitempty"`
}

type EventAdminRepository interface {
	Add(ctx context.Context, ea *EventAdmin) error
	Remove(ctx context.Context, eventID, userID uuid.UUID) error
	ListByEvent(ctx context.Context, eventID uuid.UUID) ([]*EventAdmin, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) // returns eventIDs
	ListEventsByUser(ctx context.Context, userID uuid.UUID) ([]*Event, error)
	IsAdminOfEvent(ctx context.Context, userID, eventID uuid.UUID) (bool, error)
}
