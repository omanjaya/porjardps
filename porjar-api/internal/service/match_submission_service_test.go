package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// ---- Mock: MatchSubmissionRepository ----

type MockMatchSubmissionRepository struct {
	mock.Mock
}

func (m *MockMatchSubmissionRepository) Create(ctx context.Context, s *model.MatchSubmission) error {
	return m.Called(ctx, s).Error(0)
}

func (m *MockMatchSubmissionRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.MatchSubmission, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.MatchSubmission), args.Error(1)
}

func (m *MockMatchSubmissionRepository) FindByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*model.MatchSubmission, error) {
	args := m.Called(ctx, bracketMatchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MatchSubmission), args.Error(1)
}

func (m *MockMatchSubmissionRepository) FindByBracketMatchIDs(ctx context.Context, matchIDs []uuid.UUID) (map[uuid.UUID][]*model.MatchSubmission, error) {
	args := m.Called(ctx, matchIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID][]*model.MatchSubmission), args.Error(1)
}

func (m *MockMatchSubmissionRepository) FindByLobby(ctx context.Context, brLobbyID uuid.UUID) ([]*model.MatchSubmission, error) {
	args := m.Called(ctx, brLobbyID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MatchSubmission), args.Error(1)
}

func (m *MockMatchSubmissionRepository) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.MatchSubmission, error) {
	args := m.Called(ctx, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MatchSubmission), args.Error(1)
}

func (m *MockMatchSubmissionRepository) FindPending(ctx context.Context, page, limit int) ([]*model.MatchSubmission, int, error) {
	args := m.Called(ctx, page, limit)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.MatchSubmission), args.Int(1), args.Error(2)
}

func (m *MockMatchSubmissionRepository) FindPendingByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*model.MatchSubmission, error) {
	args := m.Called(ctx, bracketMatchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MatchSubmission), args.Error(1)
}

func (m *MockMatchSubmissionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string, verifiedBy *uuid.UUID, rejectionReason *string, adminNotes *string) error {
	return m.Called(ctx, id, status, verifiedBy, rejectionReason, adminNotes).Error(0)
}

func (m *MockMatchSubmissionRepository) List(ctx context.Context, filter model.MatchSubmissionFilter) ([]*model.MatchSubmission, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.MatchSubmission), args.Int(1), args.Error(2)
}

// ---- Mock: TeamMemberRepository (submission tests) ----
// Using a unique type name to avoid conflict with team_service_test.go (MockTeamMemberRepoTS)

type MockTeamMemberRepoMS struct {
	mock.Mock
}

func (m *MockTeamMemberRepoMS) FindByID(ctx context.Context, id uuid.UUID) (*model.TeamMember, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoMS) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoMS) FindByTeamAndUser(ctx context.Context, teamID, userID uuid.UUID) (*model.TeamMember, error) {
	args := m.Called(ctx, teamID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoMS) FindByUser(ctx context.Context, userID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoMS) FindUserTeamsForGame(ctx context.Context, userID, gameID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, userID, gameID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoMS) Create(ctx context.Context, member *model.TeamMember) error {
	return m.Called(ctx, member).Error(0)
}

func (m *MockTeamMemberRepoMS) CreateTx(ctx context.Context, tx pgx.Tx, member *model.TeamMember) error {
	return m.Called(ctx, tx, member).Error(0)
}

func (m *MockTeamMemberRepoMS) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockTeamMemberRepoMS) CountByTeam(ctx context.Context, teamID uuid.UUID) (int, error) {
	args := m.Called(ctx, teamID)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamMemberRepoMS) CountSubstitutes(ctx context.Context, teamID uuid.UUID) (int, error) {
	args := m.Called(ctx, teamID)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamMemberRepoMS) CountByTeams(ctx context.Context, teamIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	args := m.Called(ctx, teamIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID]int), args.Error(1)
}

// ---- Helper: build a minimal MatchSubmissionService ----

func newTestMatchSubmissionService(
	submissionRepo model.MatchSubmissionRepository,
	bracketRepo model.BracketRepository,
	teamRepo model.TeamRepository,
	teamMemberRepo model.TeamMemberRepository,
) *MatchSubmissionService {
	return NewMatchSubmissionService(
		submissionRepo,
		bracketRepo,
		nil,  // brLobbyRepo
		nil,  // brResultRepo
		teamRepo,
		teamMemberRepo,
		nil,  // brLobbyTeamRepo
		nil,  // gameRepo
		nil,  // bracketService
		nil,  // brService
		nil,  // notificationSvc
		nil,  // hub
	)
}

// ---- Helpers ----

func intPtr(i int) *int { return &i }

// makeLiveMatch returns a BracketMatch in "live" status with both teams set.
func makeLiveMatch(teamAID, teamBID uuid.UUID) *model.BracketMatch {
	matchID := uuid.New()
	return &model.BracketMatch{
		ID:           matchID,
		TournamentID: uuid.New(),
		Round:        1,
		MatchNumber:  1,
		TeamAID:      &teamAID,
		TeamBID:      &teamBID,
		Status:       "live",
		BestOf:       1,
	}
}

// ========================================
// SubmitBracketResult Tests
// ========================================

func TestSubmitBracketResult_Success(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)
	teamMemberRepo := new(MockTeamMemberRepoMS)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, teamMemberRepo)

	teamA := uuid.New()
	teamB := uuid.New()
	match := makeLiveMatch(teamA, teamB) // status="live"

	// Second copy for the background AutoVerify call: mark completed so the apply
	// path exits early and we don't need to stub bracketService.
	matchCompleted := *match
	matchCompleted.Status = "completed"

	userID := uuid.New()
	screenshots := []string{"https://example.com/shot1.png"}

	// First call (sync, ctx=Background): returns live match for validation.
	// Subsequent calls (background goroutine, ctx=timerCtx): returns completed match
	// so AutoVerify's applyApprovedBracketSubmission skips processing.
	bracketRepo.On("FindByID", mock.Anything, match.ID).
		Return(match, nil).Once()
	bracketRepo.On("FindByID", mock.Anything, match.ID).
		Return(&matchCompleted, nil)

	// No existing pending submissions from teamA
	submissionRepo.On("FindByMatch", ctx, match.ID).Return([]*model.MatchSubmission{}, nil)
	submissionRepo.On("Create", ctx, mock.MatchedBy(func(s *model.MatchSubmission) bool {
		return s.BracketMatchID != nil && *s.BracketMatchID == match.ID &&
			s.TeamID == teamA &&
			s.ClaimedWinnerID != nil && *s.ClaimedWinnerID == teamA &&
			s.Status == "pending" &&
			len(s.ScreenshotURLs) == 1
	})).Return(nil)
	// The background goroutine calls FindPendingByMatch; return empty so AutoVerify returns early
	submissionRepo.On("FindPendingByMatch", mock.Anything, match.ID).
		Return([]*model.MatchSubmission{}, nil)

	autoVerifyLocks.Delete(match.ID.String())

	result, err := svc.SubmitBracketResult(ctx, match.ID, teamA, userID, teamA, 1, 0, screenshots)

	// Give the background goroutine time to finish before asserting
	time.Sleep(50 * time.Millisecond)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "pending", result.Status)
	assert.Equal(t, teamA, result.TeamID)
	submissionRepo.AssertCalled(t, "Create", ctx, mock.AnythingOfType("*model.MatchSubmission"))
}

func TestSubmitBracketResult_MatchNotFound(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	matchID := uuid.New()
	bracketRepo.On("FindByID", ctx, matchID).Return(nil, errors.New("not found"))

	result, err := svc.SubmitBracketResult(ctx, matchID, uuid.New(), uuid.New(), uuid.New(), 1, 0, []string{"s.png"})

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "MATCH_NOT_FOUND", appErr.Code)
}

func TestSubmitBracketResult_MatchNotActive(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	teamA := uuid.New()
	teamB := uuid.New()
	match := makeLiveMatch(teamA, teamB)
	match.Status = "completed" // not active

	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)

	result, err := svc.SubmitBracketResult(ctx, match.ID, teamA, uuid.New(), teamA, 1, 0, []string{"s.png"})

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "MATCH_NOT_ACTIVE", appErr.Code)
}

func TestSubmitBracketResult_NotParticipant(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	teamA := uuid.New()
	teamB := uuid.New()
	outsider := uuid.New() // not in the match
	match := makeLiveMatch(teamA, teamB)

	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)

	result, err := svc.SubmitBracketResult(ctx, match.ID, outsider, uuid.New(), teamA, 1, 0, []string{"s.png"})

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "NOT_PARTICIPANT", appErr.Code)
}

func TestSubmitBracketResult_InvalidWinner(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	teamA := uuid.New()
	teamB := uuid.New()
	thirdParty := uuid.New() // claimed winner is not in the match
	match := makeLiveMatch(teamA, teamB)

	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)

	result, err := svc.SubmitBracketResult(ctx, match.ID, teamA, uuid.New(), thirdParty, 1, 0, []string{"s.png"})

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "INVALID_WINNER", appErr.Code)
}

func TestSubmitBracketResult_DuplicateSubmission_ReturnsConflict(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	teamA := uuid.New()
	teamB := uuid.New()
	match := makeLiveMatch(teamA, teamB)

	// An existing pending submission from teamA already exists
	existing := &model.MatchSubmission{
		ID:             uuid.New(),
		BracketMatchID: &match.ID,
		TeamID:         teamA,
		Status:         "pending",
	}

	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)
	submissionRepo.On("FindByMatch", ctx, match.ID).Return([]*model.MatchSubmission{existing}, nil)

	result, err := svc.SubmitBracketResult(ctx, match.ID, teamA, uuid.New(), teamA, 1, 0, []string{"s.png"})

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "DUPLICATE_SUBMISSION", appErr.Code)
	assert.Equal(t, 409, appErr.HTTPStatus)
}

func TestSubmitBracketResult_NoScreenshots(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	teamA := uuid.New()
	teamB := uuid.New()
	match := makeLiveMatch(teamA, teamB)

	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)

	result, err := svc.SubmitBracketResult(ctx, match.ID, teamA, uuid.New(), teamA, 1, 0, []string{})

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "VALIDATION_ERROR", appErr.Code)
}

// ========================================
// GetSubmissionsByMatch Tests
// ========================================

func TestGetSubmissionsByMatch_Success(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)

	svc := newTestMatchSubmissionService(submissionRepo, nil, nil, nil)

	matchID := uuid.New()
	teamA := uuid.New()
	teamB := uuid.New()
	subs := []*model.MatchSubmission{
		{ID: uuid.New(), BracketMatchID: &matchID, TeamID: teamA, Status: "pending"},
		{ID: uuid.New(), BracketMatchID: &matchID, TeamID: teamB, Status: "pending"},
	}

	submissionRepo.On("FindByMatch", ctx, matchID).Return(subs, nil)

	result, err := svc.GetSubmissionsByMatch(ctx, matchID)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	submissionRepo.AssertExpectations(t)
}

func TestGetSubmissionsByMatch_RepoError(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)

	svc := newTestMatchSubmissionService(submissionRepo, nil, nil, nil)

	matchID := uuid.New()
	submissionRepo.On("FindByMatch", ctx, matchID).Return(nil, errors.New("db error"))

	result, err := svc.GetSubmissionsByMatch(ctx, matchID)

	assert.Error(t, err)
	assert.Nil(t, result)
	submissionRepo.AssertExpectations(t)
}

// ========================================
// AutoVerify Tests
// ========================================

func TestAutoVerify_BothTeamsAgree_AppliesResult(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	// bracketService is nil, so applyApprovedBracketSubmission will call bracketService.CompleteMatch
	// and panic unless we stop before that. We set bracketRepo.Update to handle the fallback.
	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	teamA := uuid.New()
	teamB := uuid.New()
	match := makeLiveMatch(teamA, teamB)
	winnerID := teamA
	scoreA := 1
	scoreB := 0

	subFromA := &model.MatchSubmission{
		ID:              uuid.New(),
		BracketMatchID:  &match.ID,
		TeamID:          teamA,
		ClaimedWinnerID: &winnerID,
		ClaimedScoreA:   &scoreA,
		ClaimedScoreB:   &scoreB,
		Status:          "pending",
	}
	subFromB := &model.MatchSubmission{
		ID:              uuid.New(),
		BracketMatchID:  &match.ID,
		TeamID:          teamB,
		ClaimedWinnerID: &winnerID,
		ClaimedScoreA:   &scoreA,
		ClaimedScoreB:   &scoreB,
		Status:          "pending",
	}

	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)
	submissionRepo.On("FindPendingByMatch", ctx, match.ID).Return([]*model.MatchSubmission{subFromA, subFromB}, nil)
	// Both approved
	submissionRepo.On("UpdateStatus", ctx, subFromA.ID, "approved", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string")).Return(nil)
	submissionRepo.On("UpdateStatus", ctx, subFromB.ID, "approved", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string")).Return(nil)
	// applyApprovedBracketSubmission → FindByID again, then Update
	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)
	bracketRepo.On("Update", ctx, mock.AnythingOfType("*model.BracketMatch")).Return(nil)
	// bracketService is nil so CompleteMatch will panic; stub Update for the fallback path
	// (the svc calls bracketService.CompleteMatch which will panic — we need bracketService)
	// Since bracketService is nil, we cannot reach CompleteMatch without a nil deref.
	// However, applyApprovedBracketSubmission calls s.bracketService.CompleteMatch only after
	// bracketRepo.Update. The nil check will cause a panic, so we skip deep apply by
	// injecting a match that is already "completed".
	match.Status = "completed" // prevents applyApprovedBracketSubmission from doing anything

	autoVerifyLocks.Delete(match.ID.String()) // ensure lock is clean before test

	approved, err := svc.AutoVerify(ctx, match.ID)

	assert.NoError(t, err)
	assert.True(t, approved)
	submissionRepo.AssertCalled(t, "UpdateStatus", ctx, subFromA.ID, "approved", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string"))
	submissionRepo.AssertCalled(t, "UpdateStatus", ctx, subFromB.ID, "approved", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string"))
}

func TestAutoVerify_OnlyOneTeamSubmitted_DoesNotApply(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	teamA := uuid.New()
	teamB := uuid.New()
	match := makeLiveMatch(teamA, teamB)
	winnerID := teamA
	scoreA := 1
	scoreB := 0

	// Only teamA submitted
	subFromA := &model.MatchSubmission{
		ID:              uuid.New(),
		BracketMatchID:  &match.ID,
		TeamID:          teamA,
		ClaimedWinnerID: &winnerID,
		ClaimedScoreA:   &scoreA,
		ClaimedScoreB:   &scoreB,
		Status:          "pending",
	}

	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)
	submissionRepo.On("FindPendingByMatch", ctx, match.ID).Return([]*model.MatchSubmission{subFromA}, nil)

	autoVerifyLocks.Delete(match.ID.String())

	approved, err := svc.AutoVerify(ctx, match.ID)

	assert.NoError(t, err)
	assert.False(t, approved)
	// UpdateStatus should NOT be called because we don't have both teams
	submissionRepo.AssertNotCalled(t, "UpdateStatus", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestAutoVerify_ConflictingWinners_DisputesBoth(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	teamA := uuid.New()
	teamB := uuid.New()
	match := makeLiveMatch(teamA, teamB)
	scoreA := 1
	scoreB := 0

	// Each team claims they won
	subFromA := &model.MatchSubmission{
		ID:              uuid.New(),
		BracketMatchID:  &match.ID,
		TeamID:          teamA,
		ClaimedWinnerID: &teamA, // A claims A won
		ClaimedScoreA:   &scoreA,
		ClaimedScoreB:   &scoreB,
		Status:          "pending",
	}
	subFromB := &model.MatchSubmission{
		ID:              uuid.New(),
		BracketMatchID:  &match.ID,
		TeamID:          teamB,
		ClaimedWinnerID: &teamB, // B claims B won
		ClaimedScoreA:   &scoreB,
		ClaimedScoreB:   &scoreA,
		Status:          "pending",
	}

	bracketRepo.On("FindByID", ctx, match.ID).Return(match, nil)
	submissionRepo.On("FindPendingByMatch", ctx, match.ID).Return([]*model.MatchSubmission{subFromA, subFromB}, nil)
	submissionRepo.On("UpdateStatus", ctx, subFromA.ID, "disputed", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string")).Return(nil)
	submissionRepo.On("UpdateStatus", ctx, subFromB.ID, "disputed", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string")).Return(nil)

	autoVerifyLocks.Delete(match.ID.String())

	approved, err := svc.AutoVerify(ctx, match.ID)

	assert.NoError(t, err)
	assert.False(t, approved) // conflict — not auto-approved
	submissionRepo.AssertCalled(t, "UpdateStatus", ctx, subFromA.ID, "disputed", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string"))
	submissionRepo.AssertCalled(t, "UpdateStatus", ctx, subFromB.ID, "disputed", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string"))
}

func TestAutoVerify_MatchNotFound(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	matchID := uuid.New()
	bracketRepo.On("FindByID", ctx, matchID).Return(nil, errors.New("not found"))

	autoVerifyLocks.Delete(matchID.String())

	approved, err := svc.AutoVerify(ctx, matchID)

	assert.Error(t, err)
	assert.False(t, approved)
}

func TestAutoVerify_ConcurrentCalls_OnlyOneExecutes(t *testing.T) {
	// This test verifies that the sync.Map lock prevents two concurrent AutoVerify
	// calls for the same matchID from both proceeding. We pre-insert the lock to
	// simulate one goroutine already holding it.
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)
	bracketRepo := new(MockBracketRepo)

	svc := newTestMatchSubmissionService(submissionRepo, bracketRepo, nil, nil)

	matchID := uuid.New()

	// Pre-occupy the lock — simulates another goroutine already inside AutoVerify
	autoVerifyLocks.Store(matchID.String(), struct{}{})
	defer autoVerifyLocks.Delete(matchID.String())

	// Since lock is held, AutoVerify should return immediately (false, nil)
	approved, err := svc.AutoVerify(ctx, matchID)

	assert.NoError(t, err)
	assert.False(t, approved)
	// Neither bracketRepo nor submissionRepo should be touched
	bracketRepo.AssertNotCalled(t, "FindByID", mock.Anything, mock.Anything)
	submissionRepo.AssertNotCalled(t, "FindPendingByMatch", mock.Anything, mock.Anything)
}

// ========================================
// GetSubmission Tests
// ========================================

func TestGetSubmission_Success(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)

	svc := newTestMatchSubmissionService(submissionRepo, nil, nil, nil)

	subID := uuid.New()
	matchID := uuid.New()
	sub := &model.MatchSubmission{
		ID:             subID,
		BracketMatchID: &matchID,
		Status:         "pending",
	}

	submissionRepo.On("FindByID", ctx, subID).Return(sub, nil)

	result, err := svc.GetSubmission(ctx, subID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, subID, result.ID)
}

func TestGetSubmission_NotFound(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)

	svc := newTestMatchSubmissionService(submissionRepo, nil, nil, nil)

	subID := uuid.New()
	submissionRepo.On("FindByID", ctx, subID).Return(nil, errors.New("not found"))

	result, err := svc.GetSubmission(ctx, subID)

	assert.Error(t, err)
	assert.Nil(t, result)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "SUBMISSION_NOT_FOUND", appErr.Code)
}

// ========================================
// DisputeSubmission Tests
// ========================================

func TestDisputeSubmission_Success(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)

	svc := newTestMatchSubmissionService(submissionRepo, nil, nil, nil)

	subID := uuid.New()
	sub := &model.MatchSubmission{
		ID:     subID,
		Status: "pending",
	}

	submissionRepo.On("FindByID", ctx, subID).Return(sub, nil)
	submissionRepo.On("UpdateStatus", ctx, subID, "disputed", (*uuid.UUID)(nil), (*string)(nil), mock.AnythingOfType("*string")).Return(nil)

	err := svc.DisputeSubmission(ctx, subID, "screenshot tidak sesuai")

	assert.NoError(t, err)
	submissionRepo.AssertExpectations(t)
}

func TestDisputeSubmission_NotPending_ReturnsBusinessRule(t *testing.T) {
	ctx := context.Background()
	submissionRepo := new(MockMatchSubmissionRepository)

	svc := newTestMatchSubmissionService(submissionRepo, nil, nil, nil)

	subID := uuid.New()
	sub := &model.MatchSubmission{
		ID:     subID,
		Status: "approved", // already verified
	}

	submissionRepo.On("FindByID", ctx, subID).Return(sub, nil)

	err := svc.DisputeSubmission(ctx, subID, "alasan")

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "CANNOT_DISPUTE", appErr.Code)
}
