package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type eventSettingsRepo struct {
	db *pgxpool.Pool
}

func NewEventSettingsRepo(db *pgxpool.Pool) model.EventSettingsRepository {
	return &eventSettingsRepo{db: db}
}

var eventSettingsColumns = `id, event_name, event_description, event_logo_url, event_banner_url, venue, city, start_date::text, end_date::text, organizer, contact_phone, contact_email, instagram_url, announcement, announcement_active, registration_open, rules_published, updated_at`

func scanEventSettings(row pgx.Row) (*model.EventSettings, error) {
	s := &model.EventSettings{}
	err := row.Scan(
		&s.ID, &s.EventName, &s.EventDescription,
		&s.EventLogoURL, &s.EventBannerURL,
		&s.Venue, &s.City, &s.StartDate, &s.EndDate,
		&s.Organizer, &s.ContactPhone, &s.ContactEmail, &s.InstagramURL,
		&s.Announcement, &s.AnnouncementActive,
		&s.RegistrationOpen, &s.RulesPublished, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *eventSettingsRepo) Get(ctx context.Context) (*model.EventSettings, error) {
	row := r.db.QueryRow(ctx,
		`SELECT `+eventSettingsColumns+` FROM event_settings LIMIT 1`)
	result, err := scanEventSettings(row)
	if err != nil {
		return nil, fmt.Errorf("Get event_settings: %w", err)
	}
	return result, nil
}

func (r *eventSettingsRepo) Update(ctx context.Context, s *model.EventSettings) (*model.EventSettings, error) {
	row := r.db.QueryRow(ctx,
		`UPDATE event_settings SET
			event_name = $1,
			event_description = $2,
			event_logo_url = $3,
			event_banner_url = $4,
			venue = $5,
			city = $6,
			start_date = $7,
			end_date = $8,
			organizer = $9,
			contact_phone = $10,
			contact_email = $11,
			instagram_url = $12,
			announcement = $13,
			announcement_active = $14,
			registration_open = $15,
			rules_published = $16,
			updated_at = now()
		WHERE id = $17
		RETURNING `+eventSettingsColumns,
		s.EventName, s.EventDescription,
		s.EventLogoURL, s.EventBannerURL,
		s.Venue, s.City, s.StartDate, s.EndDate,
		s.Organizer, s.ContactPhone, s.ContactEmail, s.InstagramURL,
		s.Announcement, s.AnnouncementActive,
		s.RegistrationOpen, s.RulesPublished,
		s.ID,
	)
	result, err := scanEventSettings(row)
	if err != nil {
		return nil, fmt.Errorf("Update event_settings: %w", err)
	}
	return result, nil
}
