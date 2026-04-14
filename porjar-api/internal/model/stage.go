package model

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type TournamentStage struct {
	ID           uuid.UUID       `json:"id"`
	TournamentID uuid.UUID       `json:"tournament_id"`
	StageOrder   int             `json:"stage_order"`
	StageType    string          `json:"stage_type"`
	Name         string          `json:"name"`
	Config       json.RawMessage `json:"config"`
	Status       string          `json:"status"`
	CreatedAt    time.Time       `json:"created_at"`
}

type StageRepository interface {
	Create(ctx context.Context, s *TournamentStage) error
	FindByID(ctx context.Context, id uuid.UUID) (*TournamentStage, error)
	FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*TournamentStage, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
	UpdateConfig(ctx context.Context, id uuid.UUID, config json.RawMessage) error
	Delete(ctx context.Context, id uuid.UUID) error
}
