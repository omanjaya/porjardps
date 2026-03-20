package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
)

type consentRepo struct {
	db *pgxpool.Pool
}

func NewConsentRepo(db *pgxpool.Pool) model.ConsentRepository {
	return &consentRepo{db: db}
}

func (r *consentRepo) Record(ctx context.Context, c *model.UserConsent) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO user_consents (id, user_id, consent_type, version, given_at, ip_address, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (user_id, consent_type, version) DO NOTHING`,
		c.ID, c.UserID, c.ConsentType, c.Version, c.GivenAt, c.IPAddress, c.UserAgent,
	)
	if err != nil {
		return fmt.Errorf("consent Record: %w", err)
	}
	return nil
}
