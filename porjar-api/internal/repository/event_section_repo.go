package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type eventSectionRepo struct {
	db *pgxpool.Pool
}

func NewEventSectionRepo(db *pgxpool.Pool) model.EventSectionRepository {
	return &eventSectionRepo{db: db}
}

func scanEventSection(row pgx.Row) (*model.EventSection, error) {
	s := &model.EventSection{}
	err := row.Scan(
		&s.ID, &s.EventID, &s.SectionType, &s.SortOrder, &s.Enabled, &s.Config,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if s.Config == nil {
		s.Config = []byte("{}")
	}
	return s, nil
}

func (r *eventSectionRepo) ListByEvent(ctx context.Context, eventID uuid.UUID, enabledOnly bool) ([]*model.EventSection, error) {
	var query string
	if enabledOnly {
		query = `SELECT id, event_id, section_type, sort_order, enabled, config, created_at, updated_at
		         FROM event_sections
		         WHERE event_id = $1 AND enabled = true
		         ORDER BY sort_order`
	} else {
		query = `SELECT id, event_id, section_type, sort_order, enabled, config, created_at, updated_at
		         FROM event_sections
		         WHERE event_id = $1
		         ORDER BY sort_order`
	}

	rows, err := r.db.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("EventSectionRepo.ListByEvent: %w", err)
	}
	defer rows.Close()

	var sections []*model.EventSection
	for rows.Next() {
		s := &model.EventSection{}
		if err := rows.Scan(
			&s.ID, &s.EventID, &s.SectionType, &s.SortOrder, &s.Enabled, &s.Config,
			&s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("EventSectionRepo.ListByEvent scan: %w", err)
		}
		if s.Config == nil {
			s.Config = []byte("{}")
		}
		sections = append(sections, s)
	}
	return sections, rows.Err()
}

func (r *eventSectionRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.EventSection, error) {
	row := r.db.QueryRow(ctx,
		`SELECT id, event_id, section_type, sort_order, enabled, config, created_at, updated_at
		 FROM event_sections WHERE id = $1`,
		id)
	s, err := scanEventSection(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("EventSectionRepo.FindByID: %w", err)
	}
	return s, nil
}

func (r *eventSectionRepo) Create(ctx context.Context, s *model.EventSection) error {
	if s.Config == nil {
		s.Config = []byte("{}")
	}
	_, err := r.db.Exec(ctx,
		`INSERT INTO event_sections (id, event_id, section_type, sort_order, enabled, config, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		s.ID, s.EventID, s.SectionType, s.SortOrder, s.Enabled, s.Config,
		s.CreatedAt, s.UpdatedAt)
	if err != nil {
		return fmt.Errorf("EventSectionRepo.Create: %w", err)
	}
	return nil
}

func (r *eventSectionRepo) Update(ctx context.Context, s *model.EventSection) error {
	if s.Config == nil {
		s.Config = []byte("{}")
	}
	_, err := r.db.Exec(ctx,
		`UPDATE event_sections
		 SET section_type = $2, sort_order = $3, enabled = $4, config = $5, updated_at = $6
		 WHERE id = $1`,
		s.ID, s.SectionType, s.SortOrder, s.Enabled, s.Config, s.UpdatedAt)
	if err != nil {
		return fmt.Errorf("EventSectionRepo.Update: %w", err)
	}
	return nil
}

func (r *eventSectionRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM event_sections WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("EventSectionRepo.Delete: %w", err)
	}
	return nil
}

func (r *eventSectionRepo) Reorder(ctx context.Context, eventID uuid.UUID, orderedIDs []uuid.UUID) error {
	batch := &pgx.Batch{}
	for i, id := range orderedIDs {
		batch.Queue(
			`UPDATE event_sections SET sort_order = $1, updated_at = NOW() WHERE id = $2 AND event_id = $3`,
			i, id, eventID,
		)
	}
	br := r.db.SendBatch(ctx, batch)
	defer br.Close()

	for range orderedIDs {
		if _, err := br.Exec(); err != nil {
			return fmt.Errorf("EventSectionRepo.Reorder: %w", err)
		}
	}
	return br.Close()
}
