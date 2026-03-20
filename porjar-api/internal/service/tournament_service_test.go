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

// ---- Mock: GameRepository ----

type MockGameRepo struct {
	mock.Mock
}

func (m *MockGameRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Game, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Game), args.Error(1)
}

func (m *MockGameRepo) FindBySlug(ctx context.Context, slug string) (*model.Game, error) {
	args := m.Called(ctx, slug)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Game), args.Error(1)
}

func (m *MockGameRepo) List(ctx context.Context) ([]*model.Game, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Game), args.Error(1)
}

func (m *MockGameRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.Game, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Game), args.Error(1)
}

// ---- Mock: TeamMemberRepository (for tournament service) ----

type MockTeamMemberRepo struct {
	mock.Mock
}

func (m *MockTeamMemberRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.TeamMember, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepo) FindByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepo) FindByTeamAndUser(ctx context.Context, teamID, userID uuid.UUID) (*model.TeamMember, error) {
	args := m.Called(ctx, teamID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepo) FindByUser(ctx context.Context, userID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepo) FindUserTeamsForGame(ctx context.Context, userID, gameID uuid.UUID) ([]*model.TeamMember, error) {
	args := m.Called(ctx, userID, gameID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TeamMember), args.Error(1)
}

func (m *MockTeamMemberRepo) Create(ctx context.Context, member *model.TeamMember) error {
	args := m.Called(ctx, member)
	return args.Error(0)
}

func (m *MockTeamMemberRepo) CreateTx(ctx context.Context, tx pgx.Tx, member *model.TeamMember) error {
	return m.Called(ctx, tx, member).Error(0)
}

func (m *MockTeamMemberRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockTeamMemberRepo) CountByTeam(ctx context.Context, teamID uuid.UUID) (int, error) {
	args := m.Called(ctx, teamID)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamMemberRepo) CountSubstitutes(ctx context.Context, teamID uuid.UUID) (int, error) {
	args := m.Called(ctx, teamID)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamMemberRepo) CountByTeams(ctx context.Context, teamIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	args := m.Called(ctx, teamIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID]int), args.Error(1)
}

// ---- Mock: TeamRepository (for tournament service) ----

type MockTeamRepoForTournament struct {
	mock.Mock
}

func (m *MockTeamRepoForTournament) FindByID(ctx context.Context, id uuid.UUID) (*model.Team, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Team), args.Error(1)
}

func (m *MockTeamRepoForTournament) FindByNameAndGame(ctx context.Context, name string, gameID uuid.UUID) (*model.Team, error) {
	args := m.Called(ctx, name, gameID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Team), args.Error(1)
}

func (m *MockTeamRepoForTournament) Create(ctx context.Context, t *model.Team) error {
	return m.Called(ctx, t).Error(0)
}

func (m *MockTeamRepoForTournament) CreateTx(ctx context.Context, tx pgx.Tx, t *model.Team) error {
	return m.Called(ctx, tx, t).Error(0)
}

func (m *MockTeamRepoForTournament) Update(ctx context.Context, t *model.Team) error {
	return m.Called(ctx, t).Error(0)
}

func (m *MockTeamRepoForTournament) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return m.Called(ctx, id, status).Error(0)
}

func (m *MockTeamRepoForTournament) List(ctx context.Context, filter model.TeamFilter) ([]*model.Team, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.Team), args.Int(1), args.Error(2)
}

func (m *MockTeamRepoForTournament) FindByUserAndGame(ctx context.Context, userID, gameID uuid.UUID) (*model.Team, error) {
	args := m.Called(ctx, userID, gameID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Team), args.Error(1)
}

func (m *MockTeamRepoForTournament) CountByGame(ctx context.Context, gameID uuid.UUID) (int, error) {
	args := m.Called(ctx, gameID)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamRepoForTournament) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.Team, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Team), args.Error(1)
}

// ---- Mock: TournamentRepository (reuse from bracket test has different struct name) ----

type MockTournamentRepoTS struct {
	mock.Mock
}

func (m *MockTournamentRepoTS) FindByID(ctx context.Context, id uuid.UUID) (*model.Tournament, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Tournament), args.Error(1)
}

func (m *MockTournamentRepoTS) Create(ctx context.Context, t *model.Tournament) error {
	return m.Called(ctx, t).Error(0)
}

func (m *MockTournamentRepoTS) Update(ctx context.Context, t *model.Tournament) error {
	return m.Called(ctx, t).Error(0)
}

func (m *MockTournamentRepoTS) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockTournamentRepoTS) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return m.Called(ctx, id, status).Error(0)
}

func (m *MockTournamentRepoTS) List(ctx context.Context, filter model.TournamentFilter) ([]*model.Tournament, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.Tournament), args.Int(1), args.Error(2)
}

func (m *MockTournamentRepoTS) CountTeams(ctx context.Context, tournamentID uuid.UUID) (int, error) {
	args := m.Called(ctx, tournamentID)
	return args.Int(0), args.Error(1)
}

func (m *MockTournamentRepoTS) CountTeamsBatch(ctx context.Context, tournamentIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	args := m.Called(ctx, tournamentIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID]int), args.Error(1)
}

// ---- Mock: TournamentTeamRepository (for tournament service) ----

type MockTournamentTeamRepoTS struct {
	mock.Mock
}

func (m *MockTournamentTeamRepoTS) FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*model.TournamentTeam, error) {
	args := m.Called(ctx, tournamentID, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TournamentTeam), args.Error(1)
}

func (m *MockTournamentTeamRepoTS) Create(ctx context.Context, tt *model.TournamentTeam) error {
	return m.Called(ctx, tt).Error(0)
}

func (m *MockTournamentTeamRepoTS) Delete(ctx context.Context, tournamentID, teamID uuid.UUID) error {
	return m.Called(ctx, tournamentID, teamID).Error(0)
}

func (m *MockTournamentTeamRepoTS) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentTeam, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TournamentTeam), args.Error(1)
}

func (m *MockTournamentTeamRepoTS) ListApprovedTeams(ctx context.Context, tournamentID uuid.UUID) ([]*model.Team, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Team), args.Error(1)
}

// ---- Helper ----

func newTestTournamentService(
	tRepo model.TournamentRepository,
	ttRepo model.TournamentTeamRepository,
	teamRepo model.TeamRepository,
	tmRepo model.TeamMemberRepository,
	gameRepo model.GameRepository,
) *TournamentService {
	return NewTournamentService(tRepo, ttRepo, teamRepo, tmRepo, gameRepo)
}

// ========================================
// Create Tournament Tests
// ========================================

func TestCreateTournament_Success(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)
	teamRepo := new(MockTeamRepoForTournament)
	tmRepo := new(MockTeamMemberRepo)
	gameRepo := new(MockGameRepo)

	svc := newTestTournamentService(tournamentRepo, ttRepo, teamRepo, tmRepo, gameRepo)

	gameID := uuid.New()
	game := &model.Game{
		ID:       gameID,
		Name:     "Mobile Legends",
		Slug:     "mlbb",
		GameType: "moba",
	}

	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tournamentRepo.On("Create", ctx, mock.AnythingOfType("*model.Tournament")).Return(nil)

	input := CreateTournamentInput{
		GameID: gameID,
		Name:   "MLBB Championship",
		Format: "single_elimination",
		Stage:  "qualifier",
		BestOf: 3,
	}

	tournament, err := svc.Create(ctx, input)

	assert.NoError(t, err)
	assert.NotNil(t, tournament)
	assert.Equal(t, "MLBB Championship", tournament.Name)
	assert.Equal(t, "single_elimination", tournament.Format)
	assert.Equal(t, "upcoming", tournament.Status)
	assert.Equal(t, gameID, tournament.GameID)
	assert.Equal(t, 3, tournament.BestOf)
	tournamentRepo.AssertExpectations(t)
}

func TestCreateTournament_Error_GameNotFound(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)
	teamRepo := new(MockTeamRepoForTournament)
	tmRepo := new(MockTeamMemberRepo)
	gameRepo := new(MockGameRepo)

	svc := newTestTournamentService(tournamentRepo, ttRepo, teamRepo, tmRepo, gameRepo)

	gameID := uuid.New()
	gameRepo.On("FindByID", ctx, gameID).Return(nil, errors.New("not found"))

	input := CreateTournamentInput{
		GameID: gameID,
		Name:   "Tournament",
		Format: "single_elimination",
		Stage:  "qualifier",
		BestOf: 3,
	}

	tournament, err := svc.Create(ctx, input)

	assert.Error(t, err)
	assert.Nil(t, tournament)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Contains(t, appErr.Code, "NOT_FOUND")
}

func TestCreateTournament_Error_InvalidFormatForBR(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)
	teamRepo := new(MockTeamRepoForTournament)
	tmRepo := new(MockTeamMemberRepo)
	gameRepo := new(MockGameRepo)

	svc := newTestTournamentService(tournamentRepo, ttRepo, teamRepo, tmRepo, gameRepo)

	gameID := uuid.New()
	game := &model.Game{
		ID:       gameID,
		Name:     "PUBG Mobile",
		Slug:     "pubgm",
		GameType: "battle_royale",
	}

	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)

	input := CreateTournamentInput{
		GameID: gameID,
		Name:   "PUBG Tournament",
		Format: "single_elimination", // invalid for BR game
		Stage:  "qualifier",
		BestOf: 1,
	}

	tournament, err := svc.Create(ctx, input)

	assert.Error(t, err)
	assert.Nil(t, tournament)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "INVALID_FORMAT_FOR_GAME", appErr.Code)
}

// ========================================
// GetByID Tests
// ========================================

func TestGetTournamentByID_Success(t *testing.T) {
	ctx := context.Background()
	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	tournament := &model.Tournament{
		ID:   tournamentID,
		Name: "Test Tournament",
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	tournamentRepo.On("CountTeamsBatch", ctx, []uuid.UUID{tournamentID}).Return(map[uuid.UUID]int{}, nil)

	result, err := svc.GetByID(ctx, tournamentID)

	assert.NoError(t, err)
	assert.Equal(t, tournamentID, result.ID)
}

func TestGetTournamentByID_Error_NotFound(t *testing.T) {
	ctx := context.Background()
	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	tournamentRepo.On("FindByID", ctx, tournamentID).Return(nil, errors.New("not found"))

	result, err := svc.GetByID(ctx, tournamentID)

	assert.Error(t, err)
	assert.Nil(t, result)
}

// ========================================
// Update Tournament Tests
// ========================================

func TestUpdateTournament_Success(t *testing.T) {
	ctx := context.Background()
	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	tournament := &model.Tournament{
		ID:     tournamentID,
		Name:   "Old Name",
		Format: "single_elimination",
		BestOf: 3,
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	tournamentRepo.On("Update", ctx, mock.MatchedBy(func(t *model.Tournament) bool {
		return t.Name == "New Name" && t.BestOf == 5
	})).Return(nil)

	newName := "New Name"
	newBestOf := 5
	input := UpdateTournamentInput{
		Name:   &newName,
		BestOf: &newBestOf,
	}

	result, err := svc.Update(ctx, tournamentID, input)

	assert.NoError(t, err)
	assert.Equal(t, "New Name", result.Name)
	assert.Equal(t, 5, result.BestOf)
	// Format should remain unchanged
	assert.Equal(t, "single_elimination", result.Format)
}

func TestUpdateTournament_Error_NotFound(t *testing.T) {
	ctx := context.Background()
	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	tournamentRepo.On("FindByID", ctx, tournamentID).Return(nil, errors.New("not found"))

	input := UpdateTournamentInput{}
	result, err := svc.Update(ctx, tournamentID, input)

	assert.Error(t, err)
	assert.Nil(t, result)
}

// ========================================
// Delete Tournament Tests
// ========================================

func TestDeleteTournament_Success(t *testing.T) {
	ctx := context.Background()
	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	tournament := &model.Tournament{ID: tournamentID}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	tournamentRepo.On("Delete", ctx, tournamentID).Return(nil)

	err := svc.Delete(ctx, tournamentID)

	assert.NoError(t, err)
	tournamentRepo.AssertExpectations(t)
}

func TestDeleteTournament_Error_NotFound(t *testing.T) {
	ctx := context.Background()
	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	tournamentRepo.On("FindByID", ctx, tournamentID).Return(nil, errors.New("not found"))

	err := svc.Delete(ctx, tournamentID)

	assert.Error(t, err)
}

// ========================================
// List Tournaments Tests
// ========================================

func TestListTournaments_Success(t *testing.T) {
	ctx := context.Background()
	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournaments := []*model.Tournament{
		{ID: uuid.New(), Name: "Tournament 1"},
		{ID: uuid.New(), Name: "Tournament 2"},
	}

	filter := model.TournamentFilter{Page: 1, Limit: 10}
	tournamentRepo.On("List", ctx, filter).Return(tournaments, 2, nil)
	tournamentRepo.On("CountTeamsBatch", ctx, mock.AnythingOfType("[]uuid.UUID")).Return(map[uuid.UUID]int{}, nil)

	result, total, err := svc.List(ctx, filter)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, 2, total)
}

func TestListTournaments_Success_Empty(t *testing.T) {
	ctx := context.Background()
	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	filter := model.TournamentFilter{Page: 1, Limit: 10}
	tournamentRepo.On("List", ctx, filter).Return([]*model.Tournament{}, 0, nil)

	result, total, err := svc.List(ctx, filter)

	assert.NoError(t, err)
	assert.Empty(t, result)
	assert.Equal(t, 0, total)
}

// ========================================
// RegisterTeam Tests
// ========================================

func TestRegisterTeam_Success(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)
	teamRepo := new(MockTeamRepoForTournament)
	tmRepo := new(MockTeamMemberRepo)
	gameRepo := new(MockGameRepo)

	svc := newTestTournamentService(tournamentRepo, ttRepo, teamRepo, tmRepo, gameRepo)

	tournamentID := uuid.New()
	teamID := uuid.New()
	captainID := uuid.New()
	gameID := uuid.New()

	tournament := &model.Tournament{
		ID:     tournamentID,
		GameID: gameID,
		Status: "registration",
	}

	team := &model.Team{
		ID:            teamID,
		GameID:        gameID,
		CaptainUserID: &captainID,
		Status:        "approved",
	}

	game := &model.Game{
		ID:             gameID,
		MinTeamMembers: 5,
		MaxTeamMembers: 5,
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tmRepo.On("CountByTeam", ctx, teamID).Return(5, nil)
	ttRepo.On("FindByTournamentAndTeam", ctx, tournamentID, teamID).Return(nil, errors.New("not found"))
	ttRepo.On("Create", ctx, mock.AnythingOfType("*model.TournamentTeam")).Return(nil)

	err := svc.RegisterTeam(ctx, tournamentID, teamID, captainID)

	assert.NoError(t, err)
	ttRepo.AssertExpectations(t)
}

func TestRegisterTeam_Error_RegistrationNotOpen(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	tournament := &model.Tournament{
		ID:     tournamentID,
		Status: "upcoming", // not "registration"
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)

	err := svc.RegisterTeam(ctx, tournamentID, uuid.New(), uuid.New())

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "REGISTRATION_NOT_OPEN", appErr.Code)
}

func TestRegisterTeam_Error_RegistrationClosed(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	pastTime := time.Now().Add(-24 * time.Hour)
	tournament := &model.Tournament{
		ID:              tournamentID,
		Status:          "registration",
		RegistrationEnd: &pastTime,
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)

	err := svc.RegisterTeam(ctx, tournamentID, uuid.New(), uuid.New())

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "REGISTRATION_CLOSED", appErr.Code)
}

func TestRegisterTeam_Error_TournamentFull(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	maxTeams := 8
	tournament := &model.Tournament{
		ID:       tournamentID,
		Status:   "registration",
		MaxTeams: &maxTeams,
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	tournamentRepo.On("CountTeams", ctx, tournamentID).Return(8, nil) // already full

	err := svc.RegisterTeam(ctx, tournamentID, uuid.New(), uuid.New())

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "TOURNAMENT_FULL", appErr.Code)
}

func TestRegisterTeam_Error_TeamNotApproved(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)
	teamRepo := new(MockTeamRepoForTournament)
	svc := newTestTournamentService(tournamentRepo, ttRepo, teamRepo, nil, nil)

	tournamentID := uuid.New()
	teamID := uuid.New()
	captainID := uuid.New()

	tournament := &model.Tournament{
		ID:     tournamentID,
		Status: "registration",
	}

	team := &model.Team{
		ID:            teamID,
		CaptainUserID: &captainID,
		Status:        "pending", // not approved
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)

	err := svc.RegisterTeam(ctx, tournamentID, teamID, captainID)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "TEAM_NOT_APPROVED", appErr.Code)
}

func TestRegisterTeam_Error_NotCaptain(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)
	teamRepo := new(MockTeamRepoForTournament)
	svc := newTestTournamentService(tournamentRepo, ttRepo, teamRepo, nil, nil)

	tournamentID := uuid.New()
	teamID := uuid.New()
	captainID := uuid.New()
	otherUserID := uuid.New()

	tournament := &model.Tournament{
		ID:     tournamentID,
		Status: "registration",
	}

	team := &model.Team{
		ID:            teamID,
		CaptainUserID: &captainID,
		Status:        "approved",
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)

	err := svc.RegisterTeam(ctx, tournamentID, teamID, otherUserID)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "FORBIDDEN", appErr.Code)
}

func TestRegisterTeam_Error_InsufficientMembers(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)
	teamRepo := new(MockTeamRepoForTournament)
	tmRepo := new(MockTeamMemberRepo)
	gameRepo := new(MockGameRepo)

	svc := newTestTournamentService(tournamentRepo, ttRepo, teamRepo, tmRepo, gameRepo)

	tournamentID := uuid.New()
	teamID := uuid.New()
	captainID := uuid.New()
	gameID := uuid.New()

	tournament := &model.Tournament{
		ID:     tournamentID,
		GameID: gameID,
		Status: "registration",
	}

	team := &model.Team{
		ID:            teamID,
		GameID:        gameID,
		CaptainUserID: &captainID,
		Status:        "approved",
	}

	game := &model.Game{
		ID:             gameID,
		MinTeamMembers: 5,
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tmRepo.On("CountByTeam", ctx, teamID).Return(3, nil) // only 3 members, need 5

	err := svc.RegisterTeam(ctx, tournamentID, teamID, captainID)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "TEAM_INSUFFICIENT_MEMBERS", appErr.Code)
}

func TestRegisterTeam_Error_AlreadyRegistered(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)
	teamRepo := new(MockTeamRepoForTournament)
	tmRepo := new(MockTeamMemberRepo)
	gameRepo := new(MockGameRepo)

	svc := newTestTournamentService(tournamentRepo, ttRepo, teamRepo, tmRepo, gameRepo)

	tournamentID := uuid.New()
	teamID := uuid.New()
	captainID := uuid.New()
	gameID := uuid.New()

	tournament := &model.Tournament{
		ID:     tournamentID,
		GameID: gameID,
		Status: "registration",
	}

	team := &model.Team{
		ID:            teamID,
		GameID:        gameID,
		CaptainUserID: &captainID,
		Status:        "approved",
	}

	game := &model.Game{
		ID:             gameID,
		MinTeamMembers: 5,
	}

	existingTT := &model.TournamentTeam{
		ID:           uuid.New(),
		TournamentID: tournamentID,
		TeamID:       teamID,
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	teamRepo.On("FindByID", ctx, teamID).Return(team, nil)
	gameRepo.On("FindByID", ctx, gameID).Return(game, nil)
	tmRepo.On("CountByTeam", ctx, teamID).Return(5, nil)
	ttRepo.On("FindByTournamentAndTeam", ctx, tournamentID, teamID).Return(existingTT, nil)

	err := svc.RegisterTeam(ctx, tournamentID, teamID, captainID)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "TEAM_ALREADY_REGISTERED", appErr.Code)
}

// ========================================
// GetTeams Tests
// ========================================

func TestGetTeams_Success(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	ttRepo := new(MockTournamentTeamRepoTS)

	svc := newTestTournamentService(tournamentRepo, ttRepo, nil, nil, nil)

	tournamentID := uuid.New()
	tournament := &model.Tournament{ID: tournamentID}
	approvedTeams := []*model.Team{
		{ID: uuid.New()},
		{ID: uuid.New()},
	}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	ttRepo.On("ListApprovedTeams", ctx, tournamentID).Return(approvedTeams, nil)

	result, err := svc.GetTeams(ctx, tournamentID)

	assert.NoError(t, err)
	assert.Len(t, result, 2)
}

func TestGetTeams_Error_TournamentNotFound(t *testing.T) {
	ctx := context.Background()

	tournamentRepo := new(MockTournamentRepoTS)
	svc := newTestTournamentService(tournamentRepo, nil, nil, nil, nil)

	tournamentID := uuid.New()
	tournamentRepo.On("FindByID", ctx, tournamentID).Return(nil, errors.New("not found"))

	result, err := svc.GetTeams(ctx, tournamentID)

	assert.Error(t, err)
	assert.Nil(t, result)
}

// ========================================
// isValidFormatForGameType Tests (unit helper)
// ========================================

func TestIsValidFormatForGameType(t *testing.T) {
	tests := []struct {
		name     string
		format   string
		gameType string
		expected bool
	}{
		{
			name:     "moba with single_elimination is valid",
			format:   "single_elimination",
			gameType: "moba",
			expected: true,
		},
		{
			name:     "moba with double_elimination is valid",
			format:   "double_elimination",
			gameType: "moba",
			expected: true,
		},
		{
			name:     "battle_royale with battle_royale format is valid",
			format:   "battle_royale",
			gameType: "battle_royale",
			expected: true,
		},
		{
			name:     "battle_royale with round_robin is valid",
			format:   "round_robin",
			gameType: "battle_royale",
			expected: true,
		},
		{
			name:     "battle_royale with single_elimination is invalid",
			format:   "single_elimination",
			gameType: "battle_royale",
			expected: false,
		},
		{
			name:     "fps with single_elimination is valid",
			format:   "single_elimination",
			gameType: "fps",
			expected: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := isValidFormatForGameType(tc.format, tc.gameType)
			assert.Equal(t, tc.expected, result)
		})
	}
}
