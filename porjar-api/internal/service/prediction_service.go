package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type PredictionService struct {
	predictionRepo model.PredictionRepository
	bracketRepo    model.BracketRepository
}

func NewPredictionService(predictionRepo model.PredictionRepository, bracketRepo model.BracketRepository) *PredictionService {
	return &PredictionService{
		predictionRepo: predictionRepo,
		bracketRepo:    bracketRepo,
	}
}

// Predict submits or updates a prediction for a match.
func (s *PredictionService) Predict(ctx context.Context, matchID, userID, teamID uuid.UUID) error {
	// Validate match exists
	match, err := s.bracketRepo.FindByID(ctx, matchID)
	if err != nil || match == nil {
		return apperror.NotFound("MATCH")
	}

	// Match must not be completed
	if match.Status == "completed" {
		return apperror.BusinessRule("MATCH_COMPLETED", "Tidak bisa voting untuk match yang sudah selesai")
	}

	// Match must not be live (optional: you could allow voting during live)
	if match.Status == "live" {
		return apperror.BusinessRule("MATCH_LIVE", "Tidak bisa voting untuk match yang sedang berlangsung")
	}

	// Validate team is part of this match
	if match.TeamAID == nil || match.TeamBID == nil {
		return apperror.BusinessRule("MATCH_INCOMPLETE", "Match belum memiliki kedua tim")
	}
	if teamID != *match.TeamAID && teamID != *match.TeamBID {
		return apperror.BusinessRule("INVALID_TEAM", "Tim yang dipilih bukan peserta match ini")
	}

	// Check if user already has a prediction
	existing, err := s.predictionRepo.FindByUserAndMatch(ctx, userID, matchID)
	if err != nil {
		return apperror.Wrap(err, "check existing prediction")
	}

	if existing != nil {
		// Update existing prediction
		existing.PredictedWinnerID = teamID
		if err := s.predictionRepo.Update(ctx, existing); err != nil {
			return apperror.Wrap(err, "update prediction")
		}
		return nil
	}

	// Create new prediction
	prediction := &model.Prediction{
		ID:                uuid.New(),
		BracketMatchID:    matchID,
		UserID:            userID,
		PredictedWinnerID: teamID,
		CreatedAt:         time.Now(),
	}

	if err := s.predictionRepo.Create(ctx, prediction); err != nil {
		return apperror.Wrap(err, "create prediction")
	}

	return nil
}

// GetMatchPredictions returns vote counts for a match.
func (s *PredictionService) GetMatchPredictions(ctx context.Context, matchID uuid.UUID, userID *uuid.UUID) (teamAVotes int, teamBVotes int, userPrediction *uuid.UUID, err error) {
	match, mErr := s.bracketRepo.FindByID(ctx, matchID)
	if mErr != nil || match == nil {
		return 0, 0, nil, apperror.NotFound("MATCH")
	}

	if match.TeamAID != nil {
		teamAVotes, err = s.predictionRepo.CountByMatchAndTeam(ctx, matchID, *match.TeamAID)
		if err != nil {
			return 0, 0, nil, apperror.Wrap(err, "count team A votes")
		}
	}

	if match.TeamBID != nil {
		teamBVotes, err = s.predictionRepo.CountByMatchAndTeam(ctx, matchID, *match.TeamBID)
		if err != nil {
			return 0, 0, nil, apperror.Wrap(err, "count team B votes")
		}
	}

	if userID != nil {
		existing, err := s.predictionRepo.FindByUserAndMatch(ctx, *userID, matchID)
		if err != nil {
			return 0, 0, nil, apperror.Wrap(err, "find user prediction")
		}
		if existing != nil {
			userPrediction = &existing.PredictedWinnerID
		}
	}

	return teamAVotes, teamBVotes, userPrediction, nil
}

// GetUserPredictionAccuracy returns how accurate a user's predictions have been.
func (s *PredictionService) GetUserPredictionAccuracy(ctx context.Context, userID uuid.UUID) (correct, total int, accuracy float64, err error) {
	correct, total, err = s.predictionRepo.FindCorrectPredictionsByUser(ctx, userID)
	if err != nil {
		return 0, 0, 0, apperror.Wrap(err, "get user prediction accuracy")
	}

	if total > 0 {
		accuracy = float64(correct) / float64(total) * 100
	}

	return correct, total, accuracy, nil
}
