package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type notificationRepo struct {
	db *pgxpool.Pool
}

func NewNotificationRepo(db *pgxpool.Pool) model.NotificationRepository {
	return &notificationRepo{db: db}
}

func (r *notificationRepo) Create(ctx context.Context, n *model.Notification) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		n.ID, n.UserID, n.Type, n.Title, n.Message, n.Data, n.IsRead, n.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create notification: %w", err)
	}
	return nil
}

func (r *notificationRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Notification, error) {
	n := &model.Notification{}
	err := r.db.QueryRow(ctx,
		`SELECT id, user_id, type, title, message, data, is_read, created_at
		 FROM notifications WHERE id = $1`, id).
		Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &n.Data, &n.IsRead, &n.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return n, nil
}

func (r *notificationRepo) FindByUser(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*model.Notification, int, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, user_id, type, title, message, data, is_read, created_at, COUNT(*) OVER() AS total_count
		 FROM notifications
		 WHERE user_id = $1
		 ORDER BY created_at DESC
		 LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("FindByUser query: %w", err)
	}
	defer rows.Close()

	var notifications []*model.Notification
	var total int
	for rows.Next() {
		n := &model.Notification{}
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &n.Data, &n.IsRead, &n.CreatedAt, &total); err != nil {
			return nil, 0, fmt.Errorf("FindByUser scan: %w", err)
		}
		notifications = append(notifications, n)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("FindByUser rows: %w", err)
	}

	return notifications, total, nil
}

func (r *notificationRepo) MarkRead(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE notifications SET is_read = true WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("MarkRead: %w", err)
	}
	return nil
}

func (r *notificationRepo) MarkAllRead(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`, userID)
	if err != nil {
		return fmt.Errorf("MarkAllRead: %w", err)
	}
	return nil
}

func (r *notificationRepo) CountUnread(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountUnread: %w", err)
	}
	return count, nil
}
