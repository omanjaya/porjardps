package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

// ApplyPenalty applies a penalty to a team in a tournament
func (s *BRService) ApplyPenalty(ctx context.Context, tournamentID, teamID uuid.UUID, lobbyID *uuid.UUID, penaltyType string, points int, reason *string, appliedBy uuid.UUID) error {
	if s.penaltyRepo == nil {
		return apperror.BusinessRule("NOT_CONFIGURED", "Penalty repo belum dikonfigurasi")
	}

	penalty := &model.BRPenalty{
		ID:           uuid.New(),
		TournamentID: tournamentID,
		TeamID:       teamID,
		LobbyID:      lobbyID,
		Type:         penaltyType,
		Points:       points,
		Reason:       reason,
		AppliedBy:    appliedBy,
		CreatedAt:    time.Now(),
	}

	if err := s.penaltyRepo.Create(ctx, penalty); err != nil {
		return apperror.Wrap(err, "create penalty")
	}

	// Recalculate standings to include penalty
	if err := s.recalculateStandings(ctx, tournamentID); err != nil {
		return apperror.Wrap(err, "recalculate standings after penalty")
	}

	return nil
}

// GetPenalties returns all penalties for a tournament
func (s *BRService) GetPenalties(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRPenalty, error) {
	if s.penaltyRepo == nil {
		return nil, apperror.BusinessRule("NOT_CONFIGURED", "Penalty repo belum dikonfigurasi")
	}

	penalties, err := s.penaltyRepo.FindByTournament(ctx, tournamentID)
	if err != nil {
		return nil, apperror.Wrap(err, "find penalties")
	}
	return penalties, nil
}

// RemovePenalty removes a penalty and recalculates standings
func (s *BRService) RemovePenalty(ctx context.Context, penaltyID uuid.UUID) error {
	if s.penaltyRepo == nil {
		return apperror.BusinessRule("NOT_CONFIGURED", "Penalty repo belum dikonfigurasi")
	}

	penalty, err := s.penaltyRepo.FindByID(ctx, penaltyID)
	if err != nil || penalty == nil {
		return apperror.NotFound("PENALTY")
	}

	if err := s.penaltyRepo.Delete(ctx, penaltyID); err != nil {
		return apperror.Wrap(err, "delete penalty")
	}

	// Recalculate standings after penalty removal
	if err := s.recalculateStandings(ctx, penalty.TournamentID); err != nil {
		return apperror.Wrap(err, "recalculate standings after penalty removal")
	}

	return nil
}
