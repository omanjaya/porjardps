package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type EventAnnouncementRepository struct {
	db *pgxpool.Pool
}

func NewEventAnnouncementRepository(db *pgxpool.Pool) *EventAnnouncementRepository {
	return &EventAnnouncementRepository{db: db}
}

const eventAnnouncementColumns = `id, event_id, title, message, priority, created_by, created_at, expires_at`

func scanEventAnnouncements(rows interface {
	Next() bool
	Scan(dest ...interface{}) error
	Err() error
}) ([]*model.EventAnnouncement, error) {
	var out []*model.EventAnnouncement
	for rows.Next() {
		a := &model.EventAnnouncement{}
		if err := rows.Scan(&a.ID, &a.EventID, &a.Title, &a.Message, &a.Priority, &a.CreatedBy, &a.CreatedAt, &a.ExpiresAt); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (r *EventAnnouncementRepository) ListByEvent(ctx context.Context, eventID uuid.UUID, activeOnly bool) ([]*model.EventAnnouncement, error) {
	query := `SELECT ` + eventAnnouncementColumns + ` FROM event_announcements WHERE event_id = $1`
	if activeOnly {
		query += ` AND (expires_at IS NULL OR expires_at > NOW())`
	}
	query += ` ORDER BY created_at DESC`
	rows, err := r.db.Query(ctx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("ListByEvent: %w", err)
	}
	defer rows.Close()
	return scanEventAnnouncements(rows)
}

func (r *EventAnnouncementRepository) ListActiveAll(ctx context.Context) ([]*model.EventAnnouncement, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+eventAnnouncementColumns+` FROM event_announcements
		 WHERE (expires_at IS NULL OR expires_at > NOW())
		 ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("ListActiveAll: %w", err)
	}
	defer rows.Close()
	return scanEventAnnouncements(rows)
}

func (r *EventAnnouncementRepository) Create(ctx context.Context, a *model.EventAnnouncement) error {
	return r.db.QueryRow(ctx,
		`INSERT INTO event_announcements (event_id, title, message, priority, created_by, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at`,
		a.EventID, a.Title, a.Message, a.Priority, a.CreatedBy, a.ExpiresAt,
	).Scan(&a.ID, &a.CreatedAt)
}

func (r *EventAnnouncementRepository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `DELETE FROM event_announcements WHERE id = $1`, id)
	return err
}
