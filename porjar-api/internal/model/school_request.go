package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type SchoolRequest struct {
	ID            uuid.UUID  `json:"id"`
	Name          string     `json:"name"`
	Level         string     `json:"level"`
	RequestedBy   uuid.UUID  `json:"requested_by"`
	Status        string     `json:"status"`
	RejectReason  *string    `json:"reject_reason"`
	SchoolID      *uuid.UUID `json:"school_id"`
	CreatedAt     time.Time  `json:"created_at"`
	ReviewedAt    *time.Time `json:"reviewed_at"`
	RequesterName *string    `json:"requester_name,omitempty"`
}

type SchoolRequestFilter struct {
	Status *string
	Page   int
	Limit  int
}

type SchoolRequestRepository interface {
	Create(ctx context.Context, sr *SchoolRequest) error
	FindByID(ctx context.Context, id uuid.UUID) (*SchoolRequest, error)
	FindPendingByUser(ctx context.Context, userID uuid.UUID) (*SchoolRequest, error)
	List(ctx context.Context, filter SchoolRequestFilter) ([]*SchoolRequest, int, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string, rejectReason *string, schoolID *uuid.UUID, reviewedAt time.Time) error
}
