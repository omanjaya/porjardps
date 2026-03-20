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

// ──────────────────────────────────────────────
// Webhook Repository
// ──────────────────────────────────────────────

type webhookRepo struct {
	db *pgxpool.Pool
}

func NewWebhookRepo(db *pgxpool.Pool) model.WebhookRepository {
	return &webhookRepo{db: db}
}

func (r *webhookRepo) FindAll(ctx context.Context) ([]*model.Webhook, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, url, secret, events, is_active, created_by, last_triggered_at, failure_count, created_at
		 FROM webhooks ORDER BY created_at DESC`)
	if err != nil {
		return nil, fmt.Errorf("FindAll: %w", err)
	}
	defer rows.Close()

	var webhooks []*model.Webhook
	for rows.Next() {
		w := &model.Webhook{}
		if err := rows.Scan(&w.ID, &w.Name, &w.URL, &w.Secret, &w.Events, &w.IsActive,
			&w.CreatedBy, &w.LastTriggeredAt, &w.FailureCount, &w.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindAll scan: %w", err)
		}
		webhooks = append(webhooks, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindAll rows: %w", err)
	}
	return webhooks, nil
}

func (r *webhookRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Webhook, error) {
	w := &model.Webhook{}
	err := r.db.QueryRow(ctx,
		`SELECT id, name, url, secret, events, is_active, created_by, last_triggered_at, failure_count, created_at
		 FROM webhooks WHERE id = $1`, id).
		Scan(&w.ID, &w.Name, &w.URL, &w.Secret, &w.Events, &w.IsActive,
			&w.CreatedBy, &w.LastTriggeredAt, &w.FailureCount, &w.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByID: %w", err)
	}
	return w, nil
}

func (r *webhookRepo) Create(ctx context.Context, w *model.Webhook) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO webhooks (id, name, url, secret, events, is_active, created_by, failure_count, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		w.ID, w.Name, w.URL, w.Secret, w.Events, w.IsActive, w.CreatedBy, w.FailureCount, w.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *webhookRepo) Update(ctx context.Context, w *model.Webhook) error {
	_, err := r.db.Exec(ctx,
		`UPDATE webhooks SET name = $2, url = $3, secret = $4, events = $5, is_active = $6
		 WHERE id = $1`,
		w.ID, w.Name, w.URL, w.Secret, w.Events, w.IsActive)
	if err != nil {
		return fmt.Errorf("Update: %w", err)
	}
	return nil
}

func (r *webhookRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx, `DELETE FROM webhooks WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Delete: %w", err)
	}
	return nil
}

func (r *webhookRepo) FindActiveByEvent(ctx context.Context, event string) ([]*model.Webhook, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, name, url, secret, events, is_active, created_by, last_triggered_at, failure_count, created_at
		 FROM webhooks WHERE is_active = true AND $1 = ANY(events)`, event)
	if err != nil {
		return nil, fmt.Errorf("FindActiveByEvent: %w", err)
	}
	defer rows.Close()

	var webhooks []*model.Webhook
	for rows.Next() {
		w := &model.Webhook{}
		if err := rows.Scan(&w.ID, &w.Name, &w.URL, &w.Secret, &w.Events, &w.IsActive,
			&w.CreatedBy, &w.LastTriggeredAt, &w.FailureCount, &w.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindActiveByEvent scan: %w", err)
		}
		webhooks = append(webhooks, w)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindActiveByEvent rows: %w", err)
	}
	return webhooks, nil
}

func (r *webhookRepo) UpdateLastTriggered(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE webhooks SET last_triggered_at = NOW() WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("UpdateLastTriggered: %w", err)
	}
	return nil
}

func (r *webhookRepo) IncrementFailureCount(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("IncrementFailureCount: %w", err)
	}
	return nil
}

func (r *webhookRepo) ResetFailureCount(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE webhooks SET failure_count = 0 WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("ResetFailureCount: %w", err)
	}
	return nil
}

// ──────────────────────────────────────────────
// WebhookLog Repository
// ──────────────────────────────────────────────

type webhookLogRepo struct {
	db *pgxpool.Pool
}

func NewWebhookLogRepo(db *pgxpool.Pool) model.WebhookLogRepository {
	return &webhookLogRepo{db: db}
}

func (r *webhookLogRepo) Create(ctx context.Context, l *model.WebhookLog) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO webhook_logs (id, webhook_id, event, payload, response_status, response_body, duration_ms, success, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		l.ID, l.WebhookID, l.Event, l.Payload, l.ResponseStatus, l.ResponseBody, l.DurationMs, l.Success, l.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create webhook log: %w", err)
	}
	return nil
}

func (r *webhookLogRepo) FindByWebhook(ctx context.Context, webhookID uuid.UUID, limit int) ([]*model.WebhookLog, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	rows, err := r.db.Query(ctx,
		`SELECT id, webhook_id, event, payload, response_status, response_body, duration_ms, success, created_at
		 FROM webhook_logs WHERE webhook_id = $1
		 ORDER BY created_at DESC LIMIT $2`, webhookID, limit)
	if err != nil {
		return nil, fmt.Errorf("FindByWebhook: %w", err)
	}
	defer rows.Close()

	var logs []*model.WebhookLog
	for rows.Next() {
		l := &model.WebhookLog{}
		if err := rows.Scan(&l.ID, &l.WebhookID, &l.Event, &l.Payload, &l.ResponseStatus,
			&l.ResponseBody, &l.DurationMs, &l.Success, &l.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByWebhook scan: %w", err)
		}
		logs = append(logs, l)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByWebhook rows: %w", err)
	}
	return logs, nil
}
