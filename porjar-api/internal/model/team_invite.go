package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type TeamInvite struct {
	ID         uuid.UUID `json:"id"`
	TeamID     uuid.UUID `json:"team_id"`
	InviteCode string    `json:"invite_code"`
	CreatedBy  uuid.UUID `json:"created_by"`
	MaxUses    int       `json:"max_uses"`
	UsedCount  int       `json:"used_count"`
	ExpiresAt  time.Time `json:"expires_at"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
}

type TeamInviteRepository interface {
	FindByCode(ctx context.Context, code string) (*TeamInvite, error)
	Create(ctx context.Context, invite *TeamInvite) error
	IncrementUsed(ctx context.Context, id uuid.UUID) error
	Deactivate(ctx context.Context, id uuid.UUID) error
	FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*TeamInvite, error)
}
