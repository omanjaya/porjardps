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

type teamInviteRepo struct {
	db *pgxpool.Pool
}

func NewTeamInviteRepo(db *pgxpool.Pool) model.TeamInviteRepository {
	return &teamInviteRepo{db: db}
}

func (r *teamInviteRepo) FindByCode(ctx context.Context, code string) (*model.TeamInvite, error) {
	inv := &model.TeamInvite{}
	err := r.db.QueryRow(ctx,
		`SELECT id, team_id, invite_code, created_by, max_uses, used_count, expires_at, is_active, created_at
		 FROM team_invites WHERE invite_code = $1`, code).
		Scan(&inv.ID, &inv.TeamID, &inv.InviteCode, &inv.CreatedBy, &inv.MaxUses, &inv.UsedCount, &inv.ExpiresAt, &inv.IsActive, &inv.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByCode: %w", err)
	}
	return inv, nil
}

func (r *teamInviteRepo) Create(ctx context.Context, invite *model.TeamInvite) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO team_invites (id, team_id, invite_code, created_by, max_uses, used_count, expires_at, is_active, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		invite.ID, invite.TeamID, invite.InviteCode, invite.CreatedBy, invite.MaxUses, invite.UsedCount, invite.ExpiresAt, invite.IsActive, invite.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create: %w", err)
	}
	return nil
}

func (r *teamInviteRepo) IncrementUsed(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE team_invites SET used_count = used_count + 1 WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("IncrementUsed: %w", err)
	}
	return nil
}

func (r *teamInviteRepo) Deactivate(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`UPDATE team_invites SET is_active = false WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("Deactivate: %w", err)
	}
	return nil
}

func (r *teamInviteRepo) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.TeamInvite, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, team_id, invite_code, created_by, max_uses, used_count, expires_at, is_active, created_at
		 FROM team_invites WHERE team_id = $1 AND is_active = true AND expires_at > NOW()
		 ORDER BY created_at DESC`, teamID)
	if err != nil {
		return nil, fmt.Errorf("FindByTeam: %w", err)
	}
	defer rows.Close()

	var invites []*model.TeamInvite
	for rows.Next() {
		inv := &model.TeamInvite{}
		if err := rows.Scan(&inv.ID, &inv.TeamID, &inv.InviteCode, &inv.CreatedBy, &inv.MaxUses, &inv.UsedCount, &inv.ExpiresAt, &inv.IsActive, &inv.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByTeam scan: %w", err)
		}
		invites = append(invites, inv)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("FindByTeam rows: %w", err)
	}

	return invites, nil
}
