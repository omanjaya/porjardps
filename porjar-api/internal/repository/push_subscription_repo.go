package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type pushSubscriptionRepo struct{ db *pgxpool.Pool }

func NewPushSubscriptionRepo(db *pgxpool.Pool) model.PushSubscriptionRepository {
	return &pushSubscriptionRepo{db: db}
}

func (r *pushSubscriptionRepo) Upsert(ctx context.Context, sub *model.PushSubscription) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (endpoint) DO UPDATE SET user_id=COALESCE($2, push_subscriptions.user_id), p256dh=$4, auth=$5`,
		sub.ID, sub.UserID, sub.Endpoint, sub.P256dh, sub.Auth)
	if err != nil {
		return fmt.Errorf("PushSubscription.Upsert: %w", err)
	}
	return nil
}

func (r *pushSubscriptionRepo) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*model.PushSubscription, error) {
	rows, err := r.db.Query(ctx, `SELECT id, user_id, endpoint, p256dh, auth, created_at FROM push_subscriptions WHERE user_id = $1`, userID)
	if err != nil {
		return nil, fmt.Errorf("PushSubscription.FindByUserID: %w", err)
	}
	defer rows.Close()
	var subs []*model.PushSubscription
	for rows.Next() {
		s := &model.PushSubscription{}
		if err := rows.Scan(&s.ID, &s.UserID, &s.Endpoint, &s.P256dh, &s.Auth, &s.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	return subs, rows.Err()
}

func (r *pushSubscriptionRepo) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM push_subscriptions WHERE endpoint = $1`, endpoint)
	if err != nil {
		return fmt.Errorf("PushSubscription.DeleteByEndpoint: %w", err)
	}
	return nil
}

func (r *pushSubscriptionRepo) FindAll(ctx context.Context) ([]*model.PushSubscription, error) {
	rows, err := r.db.Query(ctx, `SELECT id, user_id, endpoint, p256dh, auth, created_at FROM push_subscriptions`)
	if err != nil {
		return nil, fmt.Errorf("PushSubscription.FindAll: %w", err)
	}
	defer rows.Close()
	var subs []*model.PushSubscription
	for rows.Next() {
		s := &model.PushSubscription{}
		if err := rows.Scan(&s.ID, &s.UserID, &s.Endpoint, &s.P256dh, &s.Auth, &s.CreatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	return subs, rows.Err()
}
