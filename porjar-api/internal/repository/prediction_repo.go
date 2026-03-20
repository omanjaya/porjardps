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

type predictionRepo struct {
	db *pgxpool.Pool
}

func NewPredictionRepo(db *pgxpool.Pool) model.PredictionRepository {
	return &predictionRepo{db: db}
}

func (r *predictionRepo) Create(ctx context.Context, p *model.Prediction) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO match_predictions (id, bracket_match_id, user_id, predicted_winner_id, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		p.ID, p.BracketMatchID, p.UserID, p.PredictedWinnerID, p.CreatedAt)
	if err != nil {
		return fmt.Errorf("Create prediction: %w", err)
	}
	return nil
}

func (r *predictionRepo) Update(ctx context.Context, p *model.Prediction) error {
	_, err := r.db.Exec(ctx,
		`UPDATE match_predictions SET predicted_winner_id = $2, created_at = NOW()
		 WHERE id = $1`,
		p.ID, p.PredictedWinnerID)
	if err != nil {
		return fmt.Errorf("Update prediction: %w", err)
	}
	return nil
}

func (r *predictionRepo) FindByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*model.Prediction, error) {
	rows, err := r.db.Query(ctx,
		`SELECT id, bracket_match_id, user_id, predicted_winner_id, created_at
		 FROM match_predictions WHERE bracket_match_id = $1`, bracketMatchID)
	if err != nil {
		return nil, fmt.Errorf("FindByMatch: %w", err)
	}
	defer rows.Close()

	var predictions []*model.Prediction
	for rows.Next() {
		p := &model.Prediction{}
		if err := rows.Scan(&p.ID, &p.BracketMatchID, &p.UserID, &p.PredictedWinnerID, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("FindByMatch scan: %w", err)
		}
		predictions = append(predictions, p)
	}
	return predictions, rows.Err()
}

func (r *predictionRepo) FindByUserAndMatch(ctx context.Context, userID, bracketMatchID uuid.UUID) (*model.Prediction, error) {
	p := &model.Prediction{}
	err := r.db.QueryRow(ctx,
		`SELECT id, bracket_match_id, user_id, predicted_winner_id, created_at
		 FROM match_predictions WHERE user_id = $1 AND bracket_match_id = $2`,
		userID, bracketMatchID).
		Scan(&p.ID, &p.BracketMatchID, &p.UserID, &p.PredictedWinnerID, &p.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("FindByUserAndMatch: %w", err)
	}
	return p, nil
}

func (r *predictionRepo) CountByMatchAndTeam(ctx context.Context, bracketMatchID, teamID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM match_predictions
		 WHERE bracket_match_id = $1 AND predicted_winner_id = $2`,
		bracketMatchID, teamID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountByMatchAndTeam: %w", err)
	}
	return count, nil
}

func (r *predictionRepo) CountByMatch(ctx context.Context, bracketMatchID uuid.UUID) (int, error) {
	var count int
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM match_predictions WHERE bracket_match_id = $1`,
		bracketMatchID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("CountByMatch: %w", err)
	}
	return count, nil
}

func (r *predictionRepo) DeleteByMatch(ctx context.Context, bracketMatchID uuid.UUID) error {
	_, err := r.db.Exec(ctx,
		`DELETE FROM match_predictions WHERE bracket_match_id = $1`, bracketMatchID)
	if err != nil {
		return fmt.Errorf("DeleteByMatch: %w", err)
	}
	return nil
}

func (r *predictionRepo) FindCorrectPredictionsByUser(ctx context.Context, userID uuid.UUID) (correct int, total int, err error) {
	// Total predictions made by the user for completed matches
	err = r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM match_predictions mp
		 JOIN bracket_matches bm ON bm.id = mp.bracket_match_id
		 WHERE mp.user_id = $1 AND bm.status = 'completed'`,
		userID).Scan(&total)
	if err != nil {
		return 0, 0, fmt.Errorf("FindCorrectPredictionsByUser total: %w", err)
	}

	// Correct predictions (predicted_winner_id matches actual winner_id)
	err = r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM match_predictions mp
		 JOIN bracket_matches bm ON bm.id = mp.bracket_match_id
		 WHERE mp.user_id = $1 AND bm.status = 'completed'
		   AND mp.predicted_winner_id = bm.winner_id`,
		userID).Scan(&correct)
	if err != nil {
		return 0, 0, fmt.Errorf("FindCorrectPredictionsByUser correct: %w", err)
	}

	return correct, total, nil
}
