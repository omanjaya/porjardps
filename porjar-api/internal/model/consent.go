package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// UserConsent records a user's explicit consent for a data processing purpose (UU PDP Pasal 7).
type UserConsent struct {
	ID          uuid.UUID  `json:"id"`
	UserID      uuid.UUID  `json:"user_id"`
	ConsentType string     `json:"consent_type"` // 'personal_data', 'cookies', 'terms'
	Version     string     `json:"version"`
	GivenAt     time.Time  `json:"given_at"`
	IPAddress   *string    `json:"ip_address,omitempty"`
	UserAgent   *string    `json:"user_agent,omitempty"`
}

// ConsentRepository persists user consent records.
type ConsentRepository interface {
	Record(ctx context.Context, consent *UserConsent) error
}
