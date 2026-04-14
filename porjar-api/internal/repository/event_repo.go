package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type eventRepo struct {
	db *pgxpool.Pool
}

func NewEventRepo(db *pgxpool.Pool) model.EventRepository {
	return &eventRepo{db: db}
}

const eventColumns = `id, slug, name, short_name, description, logo_url, banner_url,
	primary_color, secondary_color, venue, city, organizer,
	start_date, end_date, registration_start, registration_end,
	status, contact_phone, contact_email, instagram_url, website_url,
	announcement, announcement_active, registration_open, rules_published,
	requires_school, sort_order, rules_content, created_at, updated_at`

func scanEvent(row pgx.Row) (*model.Event, error) {
	e := &model.Event{}
	var rulesRaw []byte
	err := row.Scan(
		&e.ID, &e.Slug, &e.Name, &e.ShortName, &e.Description, &e.LogoURL, &e.BannerURL,
		&e.PrimaryColor, &e.SecondaryColor, &e.Venue, &e.City, &e.Organizer,
		&e.StartDate, &e.EndDate, &e.RegistrationStart, &e.RegistrationEnd,
		&e.Status, &e.ContactPhone, &e.ContactEmail, &e.InstagramURL, &e.WebsiteURL,
		&e.Announcement, &e.AnnouncementActive, &e.RegistrationOpen, &e.RulesPublished,
		&e.RequiresSchool, &e.SortOrder, &rulesRaw, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		return e, err
	}
	if len(rulesRaw) > 0 {
		if err := json.Unmarshal(rulesRaw, &e.RulesContent); err != nil {
			return e, fmt.Errorf("unmarshal rules_content: %w", err)
		}
	}
	if e.RulesContent == nil {
		e.RulesContent = []model.EventRulesSection{}
	}
	return e, nil
}

func scanEvents(rows pgx.Rows) ([]*model.Event, error) {
	var events []*model.Event
	for rows.Next() {
		e := &model.Event{}
		var rulesRaw []byte
		if err := rows.Scan(
			&e.ID, &e.Slug, &e.Name, &e.ShortName, &e.Description, &e.LogoURL, &e.BannerURL,
			&e.PrimaryColor, &e.SecondaryColor, &e.Venue, &e.City, &e.Organizer,
			&e.StartDate, &e.EndDate, &e.RegistrationStart, &e.RegistrationEnd,
			&e.Status, &e.ContactPhone, &e.ContactEmail, &e.InstagramURL, &e.WebsiteURL,
			&e.Announcement, &e.AnnouncementActive, &e.RegistrationOpen, &e.RulesPublished,
			&e.RequiresSchool, &e.SortOrder, &rulesRaw, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if len(rulesRaw) > 0 {
			if err := json.Unmarshal(rulesRaw, &e.RulesContent); err != nil {
				return nil, fmt.Errorf("unmarshal rules_content: %w", err)
			}
		}
		if e.RulesContent == nil {
			e.RulesContent = []model.EventRulesSection{}
		}
		events = append(events, e)
	}
	return events, rows.Err()
}

func (r *eventRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Event, error) {
	row := r.db.QueryRow(ctx,
		`SELECT `+eventColumns+` FROM events WHERE id = $1`, id)
	e, err := scanEvent(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return e, nil
}

func (r *eventRepo) FindBySlug(ctx context.Context, slug string) (*model.Event, error) {
	row := r.db.QueryRow(ctx,
		`SELECT `+eventColumns+` FROM events WHERE slug = $1`, slug)
	e, err := scanEvent(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindBySlug: %w", err)
	}
	return e, nil
}

func (r *eventRepo) List(ctx context.Context, filter model.EventFilter) ([]*model.Event, error) {
	var query string
	var args []interface{}

	if filter.Status != nil {
		query = `SELECT ` + eventColumns + ` FROM events WHERE status = $1 ORDER BY sort_order, created_at DESC`
		args = append(args, *filter.Status)
	} else {
		query = `SELECT ` + eventColumns + ` FROM events ORDER BY sort_order, created_at DESC`
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("List: %w", err)
	}
	defer rows.Close()

	events, err := scanEvents(rows)
	if err != nil {
		return nil, fmt.Errorf("List scan: %w", err)
	}
	return events, nil
}

func (r *eventRepo) ListPublished(ctx context.Context) ([]*model.Event, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+eventColumns+` FROM events WHERE status IN ('published', 'ongoing', 'completed') ORDER BY sort_order, created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("ListPublished: %w", err)
	}
	defer rows.Close()

	events, err := scanEvents(rows)
	if err != nil {
		return nil, fmt.Errorf("ListPublished scan: %w", err)
	}
	return events, nil
}

func (r *eventRepo) Create(ctx context.Context, e *model.Event) error {
	if e.RulesContent == nil {
		e.RulesContent = []model.EventRulesSection{}
	}
	rulesJSON, err := json.Marshal(e.RulesContent)
	if err != nil {
		return fmt.Errorf("marshal rules_content: %w", err)
	}
	_, err = r.db.Exec(ctx,
		`INSERT INTO events (id, slug, name, short_name, description, logo_url, banner_url,
			primary_color, secondary_color, venue, city, organizer,
			start_date, end_date, registration_start, registration_end,
			status, contact_phone, contact_email, instagram_url, website_url,
			announcement, announcement_active, registration_open, rules_published,
			requires_school, sort_order, rules_content, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)`,
		e.ID, e.Slug, e.Name, e.ShortName, e.Description, e.LogoURL, e.BannerURL,
		e.PrimaryColor, e.SecondaryColor, e.Venue, e.City, e.Organizer,
		e.StartDate, e.EndDate, e.RegistrationStart, e.RegistrationEnd,
		e.Status, e.ContactPhone, e.ContactEmail, e.InstagramURL, e.WebsiteURL,
		e.Announcement, e.AnnouncementActive, e.RegistrationOpen, e.RulesPublished,
		e.RequiresSchool, e.SortOrder, rulesJSON, e.CreatedAt, e.UpdatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *eventRepo) Update(ctx context.Context, e *model.Event) error {
	if e.RulesContent == nil {
		e.RulesContent = []model.EventRulesSection{}
	}
	rulesJSON, err := json.Marshal(e.RulesContent)
	if err != nil {
		return fmt.Errorf("marshal rules_content: %w", err)
	}
	_, err = r.db.Exec(ctx,
		`UPDATE events SET slug = $2, name = $3, short_name = $4, description = $5,
			logo_url = $6, banner_url = $7, primary_color = $8, secondary_color = $9,
			venue = $10, city = $11, organizer = $12,
			start_date = $13, end_date = $14, registration_start = $15, registration_end = $16,
			status = $17, contact_phone = $18, contact_email = $19, instagram_url = $20, website_url = $21,
			announcement = $22, announcement_active = $23, registration_open = $24, rules_published = $25,
			requires_school = $26, sort_order = $27, rules_content = $28, updated_at = $29
		 WHERE id = $1`,
		e.ID, e.Slug, e.Name, e.ShortName, e.Description,
		e.LogoURL, e.BannerURL, e.PrimaryColor, e.SecondaryColor,
		e.Venue, e.City, e.Organizer,
		e.StartDate, e.EndDate, e.RegistrationStart, e.RegistrationEnd,
		e.Status, e.ContactPhone, e.ContactEmail, e.InstagramURL, e.WebsiteURL,
		e.Announcement, e.AnnouncementActive, e.RegistrationOpen, e.RulesPublished,
		e.RequiresSchool, e.SortOrder, rulesJSON, e.UpdatedAt)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *eventRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM events WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}
