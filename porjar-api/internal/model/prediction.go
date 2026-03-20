package model

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Prediction struct {
	ID                uuid.UUID `json:"id"`
	BracketMatchID    uuid.UUID `json:"bracket_match_id"`
	UserID            uuid.UUID `json:"user_id"`
	PredictedWinnerID uuid.UUID `json:"predicted_winner_id"`
	CreatedAt         time.Time `json:"created_at"`
}

type PredictionRepository interface {
	Create(ctx context.Context, p *Prediction) error
	FindByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*Prediction, error)
	FindByUserAndMatch(ctx context.Context, userID, bracketMatchID uuid.UUID) (*Prediction, error)
	CountByMatchAndTeam(ctx context.Context, bracketMatchID, teamID uuid.UUID) (int, error)
	DeleteByMatch(ctx context.Context, bracketMatchID uuid.UUID) error
	Update(ctx context.Context, p *Prediction) error
	CountByMatch(ctx context.Context, bracketMatchID uuid.UUID) (int, error)
	FindCorrectPredictionsByUser(ctx context.Context, userID uuid.UUID) (correct int, total int, err error)
}
