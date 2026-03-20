package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// ---- Mock: ScheduleRepository ----

type MockScheduleRepository struct {
	mock.Mock
}

func (m *MockScheduleRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Schedule, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Schedule), args.Error(1)
}

func (m *MockScheduleRepository) Create(ctx context.Context, s *model.Schedule) error {
	return m.Called(ctx, s).Error(0)
}

func (m *MockScheduleRepository) Update(ctx context.Context, s *model.Schedule) error {
	return m.Called(ctx, s).Error(0)
}

func (m *MockScheduleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockScheduleRepository) List(ctx context.Context, filter model.ScheduleFilter) ([]*model.Schedule, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.Schedule), args.Int(1), args.Error(2)
}

func (m *MockScheduleRepository) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.Schedule, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Schedule), args.Error(1)
}

func (m *MockScheduleRepository) FindToday(ctx context.Context) ([]*model.Schedule, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Schedule), args.Error(1)
}

func (m *MockScheduleRepository) FindUpcoming(ctx context.Context, limit int) ([]*model.Schedule, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Schedule), args.Error(1)
}

// ---- Helpers ----

func newTestScheduleService(repo model.ScheduleRepository) *ScheduleService {
	return NewScheduleService(repo)
}

func makeSchedule(tournamentID uuid.UUID) *model.Schedule {
	return &model.Schedule{
		ID:           uuid.New(),
		TournamentID: tournamentID,
		Title:        "Quarter Final",
		ScheduledAt:  time.Now().Add(2 * time.Hour),
		Status:       "upcoming",
	}
}

// ========================================
// List Tests
// ========================================

func TestSchedule_List_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	filter := model.ScheduleFilter{TournamentID: &tournamentID, Page: 1, Limit: 10}
	schedules := []*model.Schedule{makeSchedule(tournamentID), makeSchedule(tournamentID)}

	repo.On("List", ctx, filter).Return(schedules, 2, nil)

	result, total, err := svc.List(ctx, filter)

	assert.NoError(t, err)
	assert.Equal(t, 2, total)
	assert.Len(t, result, 2)
	repo.AssertExpectations(t)
}

func TestSchedule_List_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	filter := model.ScheduleFilter{Page: 1, Limit: 10}
	repo.On("List", ctx, filter).Return(nil, 0, errors.New("db error"))

	result, total, err := svc.List(ctx, filter)

	assert.Error(t, err)
	assert.Nil(t, result)
	assert.Equal(t, 0, total)
	repo.AssertExpectations(t)
}

func TestSchedule_List_Empty(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	filter := model.ScheduleFilter{Page: 1, Limit: 10}
	repo.On("List", ctx, filter).Return([]*model.Schedule{}, 0, nil)

	result, total, err := svc.List(ctx, filter)

	assert.NoError(t, err)
	assert.Equal(t, 0, total)
	assert.Empty(t, result)
	repo.AssertExpectations(t)
}

// ========================================
// GetByID Tests
// ========================================

func TestSchedule_GetByID_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	schedule := makeSchedule(tournamentID)

	repo.On("FindByID", ctx, schedule.ID).Return(schedule, nil)

	result, err := svc.GetByID(ctx, schedule.ID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, schedule.ID, result.ID)
	repo.AssertExpectations(t)
}

func TestSchedule_GetByID_NotFound(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	id := uuid.New()
	repo.On("FindByID", ctx, id).Return(nil, errors.New("not found"))

	result, err := svc.GetByID(ctx, id)

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "SCHEDULE_NOT_FOUND", appErr.Code)
	repo.AssertExpectations(t)
}

func TestSchedule_GetByID_NilResult(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	id := uuid.New()
	repo.On("FindByID", ctx, id).Return(nil, nil)

	result, err := svc.GetByID(ctx, id)

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "SCHEDULE_NOT_FOUND", appErr.Code)
	repo.AssertExpectations(t)
}

// ========================================
// Create Tests
// ========================================

func TestSchedule_Create_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	scheduledAt := time.Now().Add(3 * time.Hour)

	input := CreateScheduleInput{
		TournamentID: tournamentID,
		Title:        "Semi Final",
		ScheduledAt:  scheduledAt,
		Status:       "upcoming",
	}

	repo.On("Create", ctx, mock.MatchedBy(func(s *model.Schedule) bool {
		return s.TournamentID == tournamentID &&
			s.Title == "Semi Final" &&
			s.Status == "upcoming" &&
			s.ID != uuid.Nil
	})).Return(nil)

	result, err := svc.Create(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, tournamentID, result.TournamentID)
	assert.Equal(t, "Semi Final", result.Title)
	assert.Equal(t, "upcoming", result.Status)
	assert.NotEqual(t, uuid.Nil, result.ID)
	repo.AssertExpectations(t)
}

func TestSchedule_Create_DefaultsStatusToUpcoming(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	input := CreateScheduleInput{
		TournamentID: tournamentID,
		Title:        "Grand Final",
		ScheduledAt:  time.Now().Add(24 * time.Hour),
		Status:       "", // empty — should default to "upcoming"
	}

	repo.On("Create", ctx, mock.MatchedBy(func(s *model.Schedule) bool {
		return s.Status == "upcoming"
	})).Return(nil)

	result, err := svc.Create(ctx, input)

	assert.NoError(t, err)
	assert.Equal(t, "upcoming", result.Status)
	repo.AssertExpectations(t)
}

func TestSchedule_Create_WithOptionalFields(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	bracketMatchID := uuid.New()
	venue := "GOR Ngurah Rai"
	desc := "Babak final"
	endAt := time.Now().Add(5 * time.Hour)

	input := CreateScheduleInput{
		TournamentID:   tournamentID,
		BracketMatchID: &bracketMatchID,
		Title:          "Grand Final",
		Description:    &desc,
		Venue:          &venue,
		ScheduledAt:    time.Now().Add(3 * time.Hour),
		EndAt:          &endAt,
		Status:         "upcoming",
	}

	repo.On("Create", ctx, mock.MatchedBy(func(s *model.Schedule) bool {
		return s.BracketMatchID != nil && *s.BracketMatchID == bracketMatchID &&
			s.Venue != nil && *s.Venue == venue
	})).Return(nil)

	result, err := svc.Create(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.NotNil(t, result.BracketMatchID)
	assert.Equal(t, bracketMatchID, *result.BracketMatchID)
	repo.AssertExpectations(t)
}

func TestSchedule_Create_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	input := CreateScheduleInput{
		TournamentID: uuid.New(),
		Title:        "Test",
		ScheduledAt:  time.Now(),
	}

	repo.On("Create", ctx, mock.AnythingOfType("*model.Schedule")).Return(errors.New("db error"))

	result, err := svc.Create(ctx, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	repo.AssertExpectations(t)
}

// ========================================
// Update Tests
// ========================================

func TestSchedule_Update_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	existing := makeSchedule(tournamentID)
	newTitle := "Updated Title"
	newStatus := "live"

	repo.On("FindByID", ctx, existing.ID).Return(existing, nil)
	repo.On("Update", ctx, mock.MatchedBy(func(s *model.Schedule) bool {
		return s.ID == existing.ID && s.Title == newTitle && s.Status == newStatus
	})).Return(nil)

	input := UpdateScheduleInput{
		Title:  &newTitle,
		Status: &newStatus,
	}

	result, err := svc.Update(ctx, existing.ID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, newTitle, result.Title)
	assert.Equal(t, newStatus, result.Status)
	repo.AssertExpectations(t)
}

func TestSchedule_Update_NotFound(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	id := uuid.New()
	repo.On("FindByID", ctx, id).Return(nil, errors.New("not found"))

	result, err := svc.Update(ctx, id, UpdateScheduleInput{})

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "SCHEDULE_NOT_FOUND", appErr.Code)
	repo.AssertExpectations(t)
}

func TestSchedule_Update_PartialFields(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	existing := makeSchedule(tournamentID)
	existing.Title = "Original Title"
	venue := "Venue Baru"

	repo.On("FindByID", ctx, existing.ID).Return(existing, nil)
	repo.On("Update", ctx, mock.MatchedBy(func(s *model.Schedule) bool {
		// Title should be unchanged, venue should be updated
		return s.Title == "Original Title" && s.Venue != nil && *s.Venue == venue
	})).Return(nil)

	input := UpdateScheduleInput{Venue: &venue}
	result, err := svc.Update(ctx, existing.ID, input)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Original Title", result.Title)
	assert.Equal(t, venue, *result.Venue)
	repo.AssertExpectations(t)
}

func TestSchedule_Update_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	existing := makeSchedule(tournamentID)
	newTitle := "New Title"

	repo.On("FindByID", ctx, existing.ID).Return(existing, nil)
	repo.On("Update", ctx, mock.AnythingOfType("*model.Schedule")).Return(errors.New("db error"))

	input := UpdateScheduleInput{Title: &newTitle}
	result, err := svc.Update(ctx, existing.ID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
	repo.AssertExpectations(t)
}

// ========================================
// Delete Tests
// ========================================

func TestSchedule_Delete_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	schedule := makeSchedule(tournamentID)

	repo.On("FindByID", ctx, schedule.ID).Return(schedule, nil)
	repo.On("Delete", ctx, schedule.ID).Return(nil)

	err := svc.Delete(ctx, schedule.ID)

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestSchedule_Delete_NotFound(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	id := uuid.New()
	repo.On("FindByID", ctx, id).Return(nil, errors.New("not found"))

	err := svc.Delete(ctx, id)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "SCHEDULE_NOT_FOUND", appErr.Code)
	repo.AssertExpectations(t)
}

func TestSchedule_Delete_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	schedule := makeSchedule(tournamentID)

	repo.On("FindByID", ctx, schedule.ID).Return(schedule, nil)
	repo.On("Delete", ctx, schedule.ID).Return(errors.New("db error"))

	err := svc.Delete(ctx, schedule.ID)

	assert.Error(t, err)
	repo.AssertExpectations(t)
}

// ========================================
// GetToday Tests
// ========================================

func TestSchedule_GetToday_Success(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	tournamentID := uuid.New()
	todaySchedules := []*model.Schedule{
		makeSchedule(tournamentID),
		makeSchedule(tournamentID),
	}

	repo.On("FindToday", ctx).Return(todaySchedules, nil)

	result, err := svc.GetToday(ctx)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	repo.AssertExpectations(t)
}

func TestSchedule_GetToday_Empty(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	repo.On("FindToday", ctx).Return([]*model.Schedule{}, nil)

	result, err := svc.GetToday(ctx)

	assert.NoError(t, err)
	assert.Empty(t, result)
	repo.AssertExpectations(t)
}

func TestSchedule_GetToday_RepoError(t *testing.T) {
	ctx := context.Background()
	repo := new(MockScheduleRepository)
	svc := newTestScheduleService(repo)

	repo.On("FindToday", ctx).Return(nil, errors.New("db error"))

	result, err := svc.GetToday(ctx)

	assert.Error(t, err)
	assert.Nil(t, result)
	repo.AssertExpectations(t)
}
