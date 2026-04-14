package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type EventRulesSection struct {
	Section string `json:"section"`
	Content string `json:"content"`
}

type Event struct {
	ID                 uuid.UUID  `json:"id"`
	Slug               string     `json:"slug"`
	Name               string     `json:"name"`
	ShortName          string     `json:"short_name"`
	Description        *string    `json:"description"`
	LogoURL            *string    `json:"logo_url"`
	BannerURL          *string    `json:"banner_url"`
	PrimaryColor       string     `json:"primary_color"`
	SecondaryColor     *string    `json:"secondary_color"`
	Venue              *string    `json:"venue"`
	City               *string    `json:"city"`
	Organizer          *string    `json:"organizer"`
	StartDate          *time.Time `json:"start_date"`
	EndDate            *time.Time `json:"end_date"`
	RegistrationStart  *time.Time `json:"registration_start"`
	RegistrationEnd    *time.Time `json:"registration_end"`
	Status             string     `json:"status"`
	ContactPhone       *string    `json:"contact_phone"`
	ContactEmail       *string    `json:"contact_email"`
	InstagramURL       *string    `json:"instagram_url"`
	WebsiteURL         *string    `json:"website_url"`
	Announcement       *string    `json:"announcement"`
	AnnouncementActive bool       `json:"announcement_active"`
	RegistrationOpen   bool       `json:"registration_open"`
	RulesPublished     bool                `json:"rules_published"`
	RulesContent       []EventRulesSection `json:"rules_content" db:"rules_content"`
	RequiresSchool     bool       `json:"requires_school"`
	SortOrder          int        `json:"sort_order"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type EventFilter struct {
	Status *string
}

type EventRepository interface {
	FindByID(ctx context.Context, id uuid.UUID) (*Event, error)
	FindBySlug(ctx context.Context, slug string) (*Event, error)
	List(ctx context.Context, filter EventFilter) ([]*Event, error)
	ListPublished(ctx context.Context) ([]*Event, error)
	Create(ctx context.Context, e *Event) error
	Update(ctx context.Context, e *Event) error
	Delete(ctx context.Context, id uuid.UUID) error
}
