package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
)

type ScheduleService struct {
	scheduleRepo model.ScheduleRepository
}

func NewScheduleService(scheduleRepo model.ScheduleRepository) *ScheduleService {
	return &ScheduleService{scheduleRepo: scheduleRepo}
}

type CreateScheduleInput struct {
	TournamentID   uuid.UUID  `json:"tournament_id"`
	BracketMatchID *uuid.UUID `json:"bracket_match_id"`
	BRLobbyID      *uuid.UUID `json:"br_lobby_id"`
	Title          string     `json:"title"`
	Description    *string    `json:"description"`
	Venue          *string    `json:"venue"`
	ScheduledAt    time.Time  `json:"scheduled_at"`
	EndAt          *time.Time `json:"end_at"`
	Status         string     `json:"status"`
}

type UpdateScheduleInput struct {
	TournamentID   *uuid.UUID `json:"tournament_id"`
	BracketMatchID *uuid.UUID `json:"bracket_match_id"`
	BRLobbyID      *uuid.UUID `json:"br_lobby_id"`
	Title          *string    `json:"title"`
	Description    *string    `json:"description"`
	Venue          *string    `json:"venue"`
	ScheduledAt    *time.Time `json:"scheduled_at"`
	EndAt          *time.Time `json:"end_at"`
	Status         *string    `json:"status"`
}

func (s *ScheduleService) Create(ctx context.Context, input CreateScheduleInput) (*model.Schedule, error) {
	status := input.Status
	if status == "" {
		status = "upcoming"
	}

	schedule := &model.Schedule{
		ID:             uuid.New(),
		TournamentID:   input.TournamentID,
		BracketMatchID: input.BracketMatchID,
		BRLobbyID:      input.BRLobbyID,
		Title:          input.Title,
		Description:    input.Description,
		Venue:          input.Venue,
		ScheduledAt:    input.ScheduledAt,
		EndAt:          input.EndAt,
		Status:         status,
	}

	if err := s.scheduleRepo.Create(ctx, schedule); err != nil {
		return nil, apperror.Wrap(err, "create schedule")
	}

	return schedule, nil
}

func (s *ScheduleService) GetByID(ctx context.Context, id uuid.UUID) (*model.Schedule, error) {
	schedule, err := s.scheduleRepo.FindByID(ctx, id)
	if err != nil || schedule == nil {
		return nil, apperror.NotFound("SCHEDULE")
	}
	return schedule, nil
}

func (s *ScheduleService) Update(ctx context.Context, id uuid.UUID, input UpdateScheduleInput) (*model.Schedule, error) {
	schedule, err := s.scheduleRepo.FindByID(ctx, id)
	if err != nil || schedule == nil {
		return nil, apperror.NotFound("SCHEDULE")
	}

	if input.TournamentID != nil {
		schedule.TournamentID = *input.TournamentID
	}
	if input.BracketMatchID != nil {
		schedule.BracketMatchID = input.BracketMatchID
	}
	if input.BRLobbyID != nil {
		schedule.BRLobbyID = input.BRLobbyID
	}
	if input.Title != nil {
		schedule.Title = *input.Title
	}
	if input.Description != nil {
		schedule.Description = input.Description
	}
	if input.Venue != nil {
		schedule.Venue = input.Venue
	}
	if input.ScheduledAt != nil {
		schedule.ScheduledAt = *input.ScheduledAt
	}
	if input.EndAt != nil {
		schedule.EndAt = input.EndAt
	}
	if input.Status != nil {
		schedule.Status = *input.Status
	}

	if err := s.scheduleRepo.Update(ctx, schedule); err != nil {
		return nil, apperror.Wrap(err, "update schedule")
	}

	return schedule, nil
}

func (s *ScheduleService) Delete(ctx context.Context, id uuid.UUID) error {
	schedule, err := s.scheduleRepo.FindByID(ctx, id)
	if err != nil || schedule == nil {
		return apperror.NotFound("SCHEDULE")
	}

	if err := s.scheduleRepo.Delete(ctx, id); err != nil {
		return apperror.Wrap(err, "delete schedule")
	}

	return nil
}

func (s *ScheduleService) List(ctx context.Context, filter model.ScheduleFilter) ([]*model.Schedule, int, error) {
	schedules, total, err := s.scheduleRepo.List(ctx, filter)
	if err != nil {
		return nil, 0, apperror.Wrap(err, "list schedules")
	}
	return schedules, total, nil
}

func (s *ScheduleService) GetToday(ctx context.Context) ([]*model.Schedule, error) {
	schedules, err := s.scheduleRepo.FindToday(ctx)
	if err != nil {
		return nil, apperror.Wrap(err, "get today schedules")
	}
	return schedules, nil
}

func (s *ScheduleService) GetUpcoming(ctx context.Context, limit int) ([]*model.Schedule, error) {
	schedules, err := s.scheduleRepo.FindUpcoming(ctx, limit)
	if err != nil {
		return nil, apperror.Wrap(err, "get upcoming schedules")
	}
	return schedules, nil
}
