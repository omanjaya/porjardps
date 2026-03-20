package service

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockTeamRepo is defined in bracket_service_test.go (same package)

// ---- Mock: TeamMemberRepository (for team service) ----

type MockTeamMemberRepoTS struct {
	mock.Mock
}

func (m *MockTeamMemberRepoTS) FindByID(ctx context.Context, id uuid.UUID) (*model.TeamMember, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoTS) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoTS) FindByTeamAndUser(ctx context.Context, teamID, userID uuid.UUID) (*model.TeamMember, error) {
	args := m.Called(ctx, teamID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoTS) FindByUser(ctx context.Context, userID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoTS) FindUserTeamsForGame(ctx context.Context, userID, gameID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, userID, gameID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepoTS) Create(ctx context.Context, member *model.TeamMember) error {
	return m.Called(ctx, member).Error(0)
}

func (m *MockTeamMemberRepoTS) CreateTx(ctx context.Context, tx pgx.Tx, member *model.TeamMember) error {
	return m.Called(ctx, tx, member).Error(0)
}

func (m *MockTeamMemberRepoTS) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockTeamMemberRepoTS) CountByTeam(ctx context.Context, teamID uuid.UUID) (int, error) {
	args := m.Called(ctx, teamID)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamMemberRepoTS) CountSubstitutes(ctx context.Context, teamID uuid.UUID) (int, error) {
	args := m.Called(ctx, teamID)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamMemberRepoTS) CountByTeams(ctx context.Context, teamIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	args := m.Called(ctx, teamIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID]int), args.Error(1)
}

// ---- Mock: GameRepository (for team service) ----

type MockGameRepoTS struct {
	mock.Mock
}

func (m *MockGameRepoTS) FindByID(ctx context.Context, id uuid.UUID) (*model.Game, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Game), args.Error(1)
}

func (m *MockGameRepoTS) FindBySlug(ctx context.Context, slug string) (*model.Game, error) {
	args := m.Called(ctx, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Game), args.Error(1)
}

func (m *MockGameRepoTS) List(ctx context.Context) ([]*model.Game, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Game), args.Error(1)
}

func (m *MockGameRepoTS) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.Game, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Game), args.Error(1)
}

// ---- Mock: TeamInviteRepository ----

type MockTeamInviteRepo struct {
	mock.Mock
}

func (m *MockTeamInviteRepo) FindByCode(ctx context.Context, code string) (*model.TeamInvite, error) {
	args := m.Called(ctx, code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TeamInvite), args.Error(1)
}

func (m *MockTeamInviteRepo) Create(ctx context.Context, invite *model.TeamInvite) error {
	return m.Called(ctx, invite).Error(0)
}

func (m *MockTeamInviteRepo) IncrementUsed(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockTeamInviteRepo) Deactivate(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockTeamInviteRepo) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.TeamInvite, error) {
	args := m.Called(ctx, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamInvite), args.Error(1)
}

// ---- Helper ----

func newTestTeamService(
	teamRepo model.TeamRepository,
	tmRepo model.TeamMemberRepository,
	gameRepo model.GameRepository,
) *TeamService {
	return NewTeamService(teamRepo, tmRepo, gameRepo, nil)
}

// ========================================
// Create Team Tests
// ========================================

func TestCreateTeam_Success(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)
	gameRepo := new(MockGameRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, gameRepo)

	gameID := uuid.New()
	schoolID := uuid.New()
	captainID := uuid.New()

	game := &model.Game{
		ID:             gameID,
		Name:           "Mobile Legends",
		MaxTeamMembers: 5,
		MaxSubstitutes: 1,
	}

	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tmRepo.On("FindUserTeamsForGame", ctx, captainID, gameID).Return([]*model.TeamMember{}, nil)
	teamRepo.On("FindByUserAndGame", ctx, captainID, gameID).Return(nil, errors.New("not found"))
	teamRepo.On("Create", ctx, mock.AnythingOfType("*model.Team")).Return(nil)
	tmRepo.On("Create", ctx, mock.MatchedBy(func(m *model.TeamMember) bool {
		return m.Role == "captain" && m.UserID != nil && *m.UserID == captainID
	})).Return(nil)

	team, err := svc.Create(ctx, "Team Alpha", gameID, schoolID, captainID)

	assert.NoError(t, err)
	assert.NotNil(t, team)
	assert.Equal(t, "Team Alpha", team.Name)
	assert.Equal(t, "pending", team.Status)
	assert.Equal(t, gameID, team.GameID)
	assert.Equal(t, &schoolID, team.SchoolID)
	assert.Equal(t, &captainID, team.CaptainUserID)
	teamRepo.AssertExpectations(t)
	tmRepo.AssertExpectations(t)
}

func TestCreateTeam_Error_GameNotFound(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)
	gameRepo := new(MockGameRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, gameRepo)

	gameID := uuid.New()
	gameRepo.On("FindByID", ctx, gameID).Return(nil, errors.New("not found"))

	team, err := svc.Create(ctx, "Team Alpha", gameID, uuid.New(), uuid.New())

	assert.Error(t, err)
	assert.Nil(t, team)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Contains(t, appErr.Code, "NOT_FOUND")
}

func TestCreateTeam_Error_PlayerAlreadyInGameTeam(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)
	gameRepo := new(MockGameRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, gameRepo)

	gameID := uuid.New()
	captainID := uuid.New()
	game := &model.Game{ID: gameID, Name: "MLBB"}

	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	// Player already in another team for this game
	tmRepo.On("FindUserTeamsForGame", ctx, captainID, gameID).Return([]*model.TeamMember{
		{ID: uuid.New(), TeamID: uuid.New(), UserID: &captainID},
	}, nil)

	team, err := svc.Create(ctx, "Team Beta", gameID, uuid.New(), captainID)

	assert.Error(t, err)
	assert.Nil(t, team)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "PLAYER_ALREADY_IN_GAME_TEAM", appErr.Code)
}

// ========================================
// GetByID Tests
// ========================================

func TestGetTeamByID_Success(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	teamID := uuid.New()
	team := &model.Team{ID: teamID, Name: "Team Alpha"}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)

	result, err := svc.GetByID(ctx, teamID)

	assert.NoError(t, err)
	assert.Equal(t, teamID, result.ID)
	assert.Equal(t, "Team Alpha", result.Name)
}

func TestGetTeamByID_Error_NotFound(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	teamID := uuid.New()
	teamRepo.On("FindByID", ctx, teamID).Return(nil, errors.New("not found"))

	result, err := svc.GetByID(ctx, teamID)

	assert.Error(t, err)
	assert.Nil(t, result)
}

// ========================================
// Update Team Tests
// ========================================

func TestUpdateTeam_Success(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	teamID := uuid.New()
	team := &model.Team{ID: teamID, Name: "Old Name"}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	teamRepo.On("Update", ctx, mock.MatchedBy(func(t *model.Team) bool {
		return t.Name == "New Name"
	})).Return(nil)

	logoURL := "https://img.co/logo.png"
	result, err := svc.Update(ctx, teamID, "New Name", &logoURL)

	assert.NoError(t, err)
	assert.Equal(t, "New Name", result.Name)
	assert.Equal(t, &logoURL, result.LogoURL)
}

func TestUpdateTeam_Error_NotFound(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	teamID := uuid.New()
	teamRepo.On("FindByID", ctx, teamID).Return(nil, errors.New("not found"))

	result, err := svc.Update(ctx, teamID, "Name", nil)

	assert.Error(t, err)
	assert.Nil(t, result)
}

// ========================================
// AddMember Tests
// ========================================

func TestAddMember_Success(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)
	gameRepo := new(MockGameRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, gameRepo)

	teamID := uuid.New()
	userID := uuid.New()
	gameID := uuid.New()

	team := &model.Team{ID: teamID, GameID: gameID}
	game := &model.Game{
		ID:             gameID,
		MaxTeamMembers: 5,
		MaxSubstitutes: 1,
	}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tmRepo.On("CountByTeam", ctx, teamID).Return(3, nil) // not full
	tmRepo.On("FindUserTeamsForGame", ctx, userID, gameID).Return([]*model.TeamMember{}, nil)
	tmRepo.On("FindByTeamAndUser", ctx, teamID, userID).Return(nil, errors.New("not found"))
	tmRepo.On("Create", ctx, mock.AnythingOfType("*model.TeamMember")).Return(nil)

	member, err := svc.AddMember(ctx, teamID, userID, "PlayerX", nil, "member", nil)

	assert.NoError(t, err)
	assert.NotNil(t, member)
	assert.Equal(t, "PlayerX", member.InGameName)
	assert.Equal(t, "member", member.Role)
	assert.Equal(t, teamID, member.TeamID)
}

func TestAddMember_Error_TeamFull(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)
	gameRepo := new(MockGameRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, gameRepo)

	teamID := uuid.New()
	gameID := uuid.New()

	team := &model.Team{ID: teamID, GameID: gameID}
	game := &model.Game{
		ID:             gameID,
		MaxTeamMembers: 5,
		MaxSubstitutes: 1,
	}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tmRepo.On("CountByTeam", ctx, teamID).Return(6, nil) // 5 + 1 sub = full

	member, err := svc.AddMember(ctx, teamID, uuid.New(), "PlayerX", nil, "member", nil)

	assert.Error(t, err)
	assert.Nil(t, member)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "TEAM_FULL", appErr.Code)
}

func TestAddMember_Error_PlayerAlreadyInGameTeam(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)
	gameRepo := new(MockGameRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, gameRepo)

	teamID := uuid.New()
	userID := uuid.New()
	gameID := uuid.New()

	team := &model.Team{ID: teamID, GameID: gameID}
	game := &model.Game{
		ID:             gameID,
		MaxTeamMembers: 5,
		MaxSubstitutes: 1,
	}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tmRepo.On("CountByTeam", ctx, teamID).Return(3, nil)
	tmRepo.On("FindUserTeamsForGame", ctx, userID, gameID).Return([]*model.TeamMember{
		{ID: uuid.New(), TeamID: uuid.New(), UserID: &userID},
	}, nil)

	member, err := svc.AddMember(ctx, teamID, userID, "PlayerX", nil, "member", nil)

	assert.Error(t, err)
	assert.Nil(t, member)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "PLAYER_ALREADY_IN_GAME_TEAM", appErr.Code)
}

func TestAddMember_Error_AlreadyInTeam(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)
	gameRepo := new(MockGameRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, gameRepo)

	teamID := uuid.New()
	userID := uuid.New()
	gameID := uuid.New()

	team := &model.Team{ID: teamID, GameID: gameID}
	game := &model.Game{
		ID:             gameID,
		MaxTeamMembers: 5,
		MaxSubstitutes: 1,
	}

	existingMember := &model.TeamMember{ID: uuid.New(), TeamID: teamID, UserID: &userID}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tmRepo.On("CountByTeam", ctx, teamID).Return(3, nil)
	tmRepo.On("FindUserTeamsForGame", ctx, userID, gameID).Return([]*model.TeamMember{}, nil)
	tmRepo.On("FindByTeamAndUser", ctx, teamID, userID).Return(existingMember, nil)

	member, err := svc.AddMember(ctx, teamID, userID, "PlayerX", nil, "member", nil)

	assert.Error(t, err)
	assert.Nil(t, member)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "MEMBER_ALREADY_IN_TEAM", appErr.Code)
}

// ========================================
// RemoveMember Tests
// ========================================

func TestRemoveMember_Success(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, nil)

	teamID := uuid.New()
	memberID := uuid.New()
	userID := uuid.New()

	member := &model.TeamMember{
		ID:     memberID,
		TeamID: teamID,
		UserID: &userID,
		Role:   "member",
	}

	tmRepo.On("FindByID", ctx, memberID).Return(member, nil)
	tmRepo.On("Delete", ctx, memberID).Return(nil)

	err := svc.RemoveMember(ctx, teamID, memberID)

	assert.NoError(t, err)
	tmRepo.AssertExpectations(t)
}

func TestRemoveMember_Error_CaptainCannotLeave(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, nil)

	teamID := uuid.New()
	memberID := uuid.New()
	captainID := uuid.New()

	member := &model.TeamMember{
		ID:     memberID,
		TeamID: teamID,
		UserID: &captainID,
		Role:   "captain",
	}

	tmRepo.On("FindByID", ctx, memberID).Return(member, nil)

	err := svc.RemoveMember(ctx, teamID, memberID)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "CAPTAIN_CANNOT_LEAVE", appErr.Code)
}

func TestRemoveMember_Error_MemberNotFound(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, nil)

	teamID := uuid.New()
	memberID := uuid.New()

	tmRepo.On("FindByID", ctx, memberID).Return(nil, errors.New("not found"))

	err := svc.RemoveMember(ctx, teamID, memberID)

	assert.Error(t, err)
}

func TestRemoveMember_Error_WrongTeam(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	tmRepo := new(MockTeamMemberRepoTS)

	svc := newTestTeamService(teamRepo, tmRepo, nil)

	teamID := uuid.New()
	otherTeamID := uuid.New()
	memberID := uuid.New()

	member := &model.TeamMember{
		ID:     memberID,
		TeamID: otherTeamID, // different team
		Role:   "member",
	}

	tmRepo.On("FindByID", ctx, memberID).Return(member, nil)

	err := svc.RemoveMember(ctx, teamID, memberID)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Contains(t, appErr.Code, "NOT_FOUND")
}

// ========================================
// Approve / Reject Tests
// ========================================

func TestApproveTeam_Success(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	teamID := uuid.New()
	team := &model.Team{ID: teamID, Status: "pending"}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	teamRepo.On("UpdateStatus", ctx, teamID, "approved").Return(nil)

	err := svc.Approve(ctx, teamID)

	assert.NoError(t, err)
	teamRepo.AssertExpectations(t)
}

func TestApproveTeam_Error_NotFound(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	teamID := uuid.New()
	teamRepo.On("FindByID", ctx, teamID).Return(nil, errors.New("not found"))

	err := svc.Approve(ctx, teamID)

	assert.Error(t, err)
}

func TestRejectTeam_Success(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	teamID := uuid.New()
	team := &model.Team{ID: teamID, Status: "pending"}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	teamRepo.On("UpdateStatus", ctx, teamID, "rejected").Return(nil)

	err := svc.Reject(ctx, teamID, "Incomplete roster")

	assert.NoError(t, err)
	teamRepo.AssertExpectations(t)
}

// ========================================
// List Teams Tests
// ========================================

func TestListTeams_Success(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	teams := []*model.Team{
		{ID: uuid.New(), Name: "Team A"},
		{ID: uuid.New(), Name: "Team B"},
		{ID: uuid.New(), Name: "Team C"},
	}

	filter := model.TeamFilter{Page: 1, Limit: 10}
	teamRepo.On("List", ctx, filter).Return(teams, 3, nil)

	result, total, err := svc.List(ctx, filter)

	assert.NoError(t, err)
	assert.Len(t, result, 3)
	assert.Equal(t, 3, total)
}

func TestListTeams_WithFilter(t *testing.T) {
	ctx := context.Background()
	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)

	gameID := uuid.New()
	status := "approved"
	filter := model.TeamFilter{
		GameID: &gameID,
		Status: &status,
		Page:   1,
		Limit:  10,
	}

	teams := []*model.Team{
		{ID: uuid.New(), Name: "Approved Team", Status: "approved", GameID: gameID},
	}
	teamRepo.On("List", ctx, filter).Return(teams, 1, nil)

	result, total, err := svc.List(ctx, filter)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, 1, total)
}

// ========================================
// GenerateInviteLink Tests
// ========================================

func TestGenerateInviteLink_Success(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	inviteRepo := new(MockTeamInviteRepo)

	svc := newTestTeamService(teamRepo, nil, nil)
	svc.SetInviteRepo(inviteRepo)

	teamID := uuid.New()
	captainID := uuid.New()

	team := &model.Team{
		ID:            teamID,
		CaptainUserID: &captainID,
	}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	inviteRepo.On("Create", ctx, mock.AnythingOfType("*model.TeamInvite")).Return(nil)

	code, invite, err := svc.GenerateInviteLink(ctx, teamID, captainID, 10, 24*3600*1e9) // 24h

	assert.NoError(t, err)
	assert.NotEmpty(t, code)
	assert.NotNil(t, invite)
	assert.Equal(t, teamID, invite.TeamID)
	assert.Equal(t, 10, invite.MaxUses)
	assert.True(t, invite.IsActive)
}

func TestGenerateInviteLink_Error_NotCaptain(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	inviteRepo := new(MockTeamInviteRepo)

	svc := newTestTeamService(teamRepo, nil, nil)
	svc.SetInviteRepo(inviteRepo)

	teamID := uuid.New()
	captainID := uuid.New()
	otherUserID := uuid.New()

	team := &model.Team{
		ID:            teamID,
		CaptainUserID: &captainID,
	}

	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)

	_, _, err := svc.GenerateInviteLink(ctx, teamID, otherUserID, 10, 24*3600*1e9)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "NOT_CAPTAIN", appErr.Code)
}

func TestGenerateInviteLink_Error_FeatureUnavailable(t *testing.T) {
	ctx := context.Background()

	teamRepo := new(MockTeamRepo)
	svc := newTestTeamService(teamRepo, nil, nil)
	// inviteRepo not set

	_, _, err := svc.GenerateInviteLink(ctx, uuid.New(), uuid.New(), 10, 24*3600*1e9)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "FEATURE_UNAVAILABLE", appErr.Code)
}
