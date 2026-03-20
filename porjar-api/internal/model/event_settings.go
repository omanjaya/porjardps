package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type EventSettings struct {
	ID                 uuid.UUID `json:"id"`
	EventName          string    `json:"event_name"`
	EventDescription   string    `json:"event_description"`
	EventLogoURL       *string   `json:"event_logo_url"`
	EventBannerURL     *string   `json:"event_banner_url"`
	Venue              string    `json:"venue"`
	City               string    `json:"city"`
	StartDate          *string   `json:"start_date"`
	EndDate            *string   `json:"end_date"`
	Organizer          string    `json:"organizer"`
	ContactPhone       *string   `json:"contact_phone"`
	ContactEmail       *string   `json:"contact_email"`
	InstagramURL       *string   `json:"instagram_url"`
	Announcement       *string   `json:"announcement"`
	AnnouncementActive bool      `json:"announcement_active"`
	RegistrationOpen   bool      `json:"registration_open"`
	RulesPublished     bool      `json:"rules_published"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type EventSettingsRepository interface {
	Get(ctx context.Context) (*EventSettings, error)
	Update(ctx context.Context, s *EventSettings) (*EventSettings, error)
}
