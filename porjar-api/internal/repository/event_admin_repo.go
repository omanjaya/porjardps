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

type eventAdminRepo struct {
	db *pgxpool.Pool
}

func NewEventAdminRepo(db *pgxpool.Pool) model.EventAdminRepository {
	return &eventAdminRepo{db: db}
}

func (r *eventAdminRepo) Add(ctx context.Context, ea *model.EventAdmin) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO event_admins (id, event_id, user_id, assigned_by, created_at)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (event_id, user_id) DO NOTHING`,
		ea.ID, ea.EventID, ea.UserID, ea.AssignedBy, ea.CreatedAt)
	if err != nil {
		return fmt.Errorf("EventAdminRepo.Add: %w", err)
	}
	return nil
}

func (r *eventAdminRepo) Remove(ctx context.Context, eventID, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM event_admins WHERE event_id = $1 AND user_id = $2`,
		eventID, userID)
	if err != nil {
		return fmt.Errorf("EventAdminRepo.Remove: %w", err)
	}
	return nil
}

func (r *eventAdminRepo) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]*model.EventAdmin, error) {
	rows, err := r.db.Query(ctx,
		`SELECT ea.id, ea.event_id, ea.user_id, ea.assigned_by, ea.created_at,
		        u.full_name, u.email
		 FROM event_admins ea
		 JOIN users u ON u.id = ea.user_id
		 WHERE ea.event_id = $1
		 ORDER BY ea.created_at`,
		eventID)
	if err != nil {
		return nil, fmt.Errorf("EventAdminRepo.ListByEvent: %w", err)
	}
	defer rows.Close()

	var admins []*model.EventAdmin
	for rows.Next() {
		ea := &model.EventAdmin{}
		if err := rows.Scan(
			&ea.ID, &ea.EventID, &ea.UserID, &ea.AssignedBy, &ea.CreatedAt,
			&ea.UserFullName, &ea.UserEmail,
		); err != nil {
			return nil, fmt.Errorf("EventAdminRepo.ListByEvent scan: %w", err)
		}
		admins = append(admins, ea)
	}
	return admins, rows.Err()
}

func (r *eventAdminRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.db.Query(ctx,
		`SELECT event_id FROM event_admins WHERE user_id = $1 ORDER BY created_at`,
		userID)
	if err != nil {
		return nil, fmt.Errorf("EventAdminRepo.ListByUser: %w", err)
	}
	defer rows.Close()

	var eventIDs []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("EventAdminRepo.ListByUser scan: %w", err)
		}
		eventIDs = append(eventIDs, id)
	}
	return eventIDs, rows.Err()
}

func (r *eventAdminRepo) ListEventsByUser(ctx context.Context, userID uuid.UUID) ([]*model.Event, error) {
	rows, err := r.db.Query(ctx,
		`SELECT `+eventColumns+`
		 FROM events e
		 JOIN event_admins ea ON ea.event_id = e.id
		 WHERE ea.user_id = $1
		 ORDER BY ea.created_at`,
		userID)
	if err != nil {
		return nil, fmt.Errorf("EventAdminRepo.ListEventsByUser: %w", err)
	}
	defer rows.Close()

	events, err := scanEvents(rows)
	if err != nil {
		return nil, fmt.Errorf("EventAdminRepo.ListEventsByUser scan: %w", err)
	}
	return events, nil
}

func (r *eventAdminRepo) IsAdminOfEvent(ctx context.Context, userID, eventID uuid.UUID) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM event_admins WHERE user_id = $1 AND event_id = $2)`,
		userID, eventID).Scan(&exists)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("EventAdminRepo.IsAdminOfEvent: %w", err)
	}
	return exists, nil
}
