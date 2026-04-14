package model

import (
	"time"

	"github.com/google/uuid"
)

type EventAnnouncement struct {
	ID        int64      `json:"id" db:"id"`
	EventID   uuid.UUID  `json:"event_id" db:"event_id"`
	Title     string     `json:"title" db:"title"`
	Message   string     `json:"message" db:"message"`
	Priority  string     `json:"priority" db:"priority"`
	CreatedBy *uuid.UUID `json:"created_by,omitempty" db:"created_by"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt *time.Time `json:"expires_at,omitempty" db:"expires_at"`
}
