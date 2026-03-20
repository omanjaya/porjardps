package service

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// ---- Mock: BracketRepository ----

type MockBracketRepo struct {
	mock.Mock
}

func (m *MockBracketRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.BracketMatch, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BracketMatch), args.Error(1)
}

func (m *MockBracketRepo) Create(ctx context.Context, match *model.BracketMatch) error {
	args := m.Called(ctx, match)
	return args.Error(0)
}

func (m *MockBracketRepo) Update(ctx context.Context, match *model.BracketMatch) error {
	args := m.Called(ctx, match)
	return args.Error(0)
}

func (m *MockBracketRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockBracketRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BracketMatch, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BracketMatch), args.Error(1)
}

func (m *MockBracketRepo) ListByTournamentAndRound(ctx context.Context, tournamentID uuid.UUID, round int) ([]*model.BracketMatch, error) {
	args := m.Called(ctx, tournamentID, round)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BracketMatch), args.Error(1)
}

func (m *MockBracketRepo) ListByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.BracketMatch, error) {
	args := m.Called(ctx, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BracketMatch), args.Error(1)
}

func (m *MockBracketRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockBracketRepo) UpdateResult(ctx context.Context, id uuid.UUID, winnerID, loserID uuid.UUID, scoreA, scoreB int) error {
	args := m.Called(ctx, id, winnerID, loserID, scoreA, scoreB)
	return args.Error(0)
}

func (m *MockBracketRepo) UpdateBestOf(ctx context.Context, id uuid.UUID, bestOf int) error {
	args := m.Called(ctx, id, bestOf)
	return args.Error(0)
}

func (m *MockBracketRepo) ListScheduledBefore(ctx context.Context, before time.Time) ([]*model.BracketMatch, error) {
	args := m.Called(ctx, before)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BracketMatch), args.Error(1)
}

func (m *MockBracketRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.BracketMatch, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BracketMatch), args.Error(1)
}

func (m *MockBracketRepo) FindLiveAcrossAllTournaments(ctx context.Context, limit int) ([]*model.BracketMatch, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BracketMatch), args.Error(1)
}

func (m *MockBracketRepo) FindRecentCompleted(ctx context.Context, limit int) ([]*model.BracketMatch, error) {
	args := m.Called(ctx, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BracketMatch), args.Error(1)
}

// ---- Mock: MatchGameRepository ----

type MockMatchGameRepo struct {
	mock.Mock
}

func (m *MockMatchGameRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.MatchGame, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.MatchGame), args.Error(1)
}

func (m *MockMatchGameRepo) Create(ctx context.Context, g *model.MatchGame) error {
	args := m.Called(ctx, g)
	return args.Error(0)
}

func (m *MockMatchGameRepo) Update(ctx context.Context, g *model.MatchGame) error {
	args := m.Called(ctx, g)
	return args.Error(0)
}

func (m *MockMatchGameRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockMatchGameRepo) ListByMatch(ctx context.Context, bracketMatchID uuid.UUID) ([]*model.MatchGame, error) {
	args := m.Called(ctx, bracketMatchID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.MatchGame), args.Error(1)
}

// ---- Mock: TournamentRepository ----

type MockTournamentRepo struct {
	mock.Mock
}

func (m *MockTournamentRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Tournament, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Tournament), args.Error(1)
}

func (m *MockTournamentRepo) Create(ctx context.Context, t *model.Tournament) error {
	args := m.Called(ctx, t)
	return args.Error(0)
}

func (m *MockTournamentRepo) Update(ctx context.Context, t *model.Tournament) error {
	args := m.Called(ctx, t)
	return args.Error(0)
}

func (m *MockTournamentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockTournamentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

func (m *MockTournamentRepo) List(ctx context.Context, filter model.TournamentFilter) ([]*model.Tournament, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.Tournament), args.Int(1), args.Error(2)
}

func (m *MockTournamentRepo) CountTeams(ctx context.Context, tournamentID uuid.UUID) (int, error) {
	args := m.Called(ctx, tournamentID)
	return args.Int(0), args.Error(1)
}

func (m *MockTournamentRepo) CountTeamsBatch(ctx context.Context, tournamentIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	args := m.Called(ctx, tournamentIDs)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[uuid.UUID]int), args.Error(1)
}

// ---- Mock: TournamentTeamRepository ----

type MockTournamentTeamRepo struct {
	mock.Mock
}

func (m *MockTournamentTeamRepo) FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*model.TournamentTeam, error) {
	args := m.Called(ctx, tournamentID, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TournamentTeam), args.Error(1)
}

func (m *MockTournamentTeamRepo) Create(ctx context.Context, tt *model.TournamentTeam) error {
	args := m.Called(ctx, tt)
	return args.Error(0)
}

func (m *MockTournamentTeamRepo) Delete(ctx context.Context, tournamentID, teamID uuid.UUID) error {
	return m.Called(ctx, tournamentID, teamID).Error(0)
}

func (m *MockTournamentTeamRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentTeam, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TournamentTeam), args.Error(1)
}

func (m *MockTournamentTeamRepo) ListApprovedTeams(ctx context.Context, tournamentID uuid.UUID) ([]*model.Team, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Team), args.Error(1)
}

// ---- Mock: TeamRepository ----

type MockTeamRepo struct {
	mock.Mock
}

func (m *MockTeamRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Team, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Team), args.Error(1)
}

func (m *MockTeamRepo) FindByNameAndGame(ctx context.Context, name string, gameID uuid.UUID) (*model.Team, error) {
	args := m.Called(ctx, name, gameID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Team), args.Error(1)
}

func (m *MockTeamRepo) Create(ctx context.Context, t *model.Team) error {
	return m.Called(ctx, t).Error(0)
}

func (m *MockTeamRepo) CreateTx(ctx context.Context, tx pgx.Tx, t *model.Team) error {
	return m.Called(ctx, tx, t).Error(0)
}

func (m *MockTeamRepo) Update(ctx context.Context, t *model.Team) error {
	return m.Called(ctx, t).Error(0)
}

func (m *MockTeamRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return m.Called(ctx, id, status).Error(0)
}

func (m *MockTeamRepo) List(ctx context.Context, filter model.TeamFilter) ([]*model.Team, int, error) {
	args := m.Called(ctx, filter)
	if args.Get(0) == nil {
		return nil, args.Int(1), args.Error(2)
	}
	return args.Get(0).([]*model.Team), args.Int(1), args.Error(2)
}

func (m *MockTeamRepo) FindByUserAndGame(ctx context.Context, userID, gameID uuid.UUID) (*model.Team, error) {
	args := m.Called(ctx, userID, gameID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Team), args.Error(1)
}

func (m *MockTeamRepo) CountByGame(ctx context.Context, gameID uuid.UUID) (int, error) {
	args := m.Called(ctx, gameID)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamRepo) FindByIDs(ctx context.Context, ids []uuid.UUID) ([]*model.Team, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Team), args.Error(1)
}

func (m *MockTeamRepo) CountActiveTournaments(ctx context.Context, id uuid.UUID) (int, error) {
	args := m.Called(ctx, id)
	return args.Int(0), args.Error(1)
}

func (m *MockTeamRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// ---- Mock: StandingsRepository ----

type MockStandingsRepo struct {
	mock.Mock
}

func (m *MockStandingsRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Standing, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Standing), args.Error(1)
}

func (m *MockStandingsRepo) Create(ctx context.Context, s *model.Standing) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockStandingsRepo) Update(ctx context.Context, s *model.Standing) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockStandingsRepo) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockStandingsRepo) FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*model.Standing, error) {
	args := m.Called(ctx, tournamentID, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Standing), args.Error(1)
}

func (m *MockStandingsRepo) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.Standing, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Standing), args.Error(1)
}

func (m *MockStandingsRepo) ListByTournamentAndGroup(ctx context.Context, tournamentID uuid.UUID, groupName string) ([]*model.Standing, error) {
	args := m.Called(ctx, tournamentID, groupName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Standing), args.Error(1)
}

func (m *MockStandingsRepo) Upsert(ctx context.Context, s *model.Standing) error {
	args := m.Called(ctx, s)
	return args.Error(0)
}

func (m *MockStandingsRepo) BulkUpsert(ctx context.Context, standings []*model.Standing) error {
	args := m.Called(ctx, standings)
	return args.Error(0)
}

func (m *MockStandingsRepo) UpdateRankPositions(ctx context.Context, tournamentID uuid.UUID) error {
	args := m.Called(ctx, tournamentID)
	return args.Error(0)
}

func (m *MockStandingsRepo) IncrementBracketStats(ctx context.Context, tournamentID, teamID uuid.UUID, isWin bool) error {
	args := m.Called(ctx, tournamentID, teamID, isWin)
	return args.Error(0)
}

// ---- Helper to create a Hub that won't block ----

func newTestHub() *ws.Hub {
	hub := ws.NewHub()
	go hub.Run()
	return hub
}

// Helper to generate N teams
func generateTeams(n int) []*model.Team {
	teams := make([]*model.Team, n)
	for i := 0; i < n; i++ {
		teams[i] = &model.Team{
			ID:   uuid.New(),
			Name: "Team " + uuid.NewString()[:4],
		}
	}
	return teams
}

// ========================================
// GenerateBracket Tests
// ========================================

func TestGenerateBracket_Success_8Teams(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	tournament := &model.Tournament{ID: tournamentID, Status: "ongoing", BestOf: 3}
	teams := generateTeams(8)

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	bracketRepo.On("ListByTournament", ctx, tournamentID).Return([]*model.BracketMatch{}, nil)
	ttRepo.On("ListApprovedTeams", ctx, tournamentID).Return(teams, nil)
	bracketRepo.On("Create", ctx, mock.AnythingOfType("*model.BracketMatch")).Return(nil)
	bracketRepo.On("Update", ctx, mock.AnythingOfType("*model.BracketMatch")).Return(nil)
	// 8 teams = power of 2, no BYEs expected

	matchesCreated, totalRounds, err := svc.GenerateBracket(ctx, tournamentID, nil)

	assert.NoError(t, err)
	assert.Equal(t, 7, matchesCreated)  // 8-1 = 7 matches
	assert.Equal(t, 3, totalRounds)     // log2(8) = 3 rounds
	bracketRepo.AssertNumberOfCalls(t, "Create", 7)
}

func TestGenerateBracket_Success_6Teams_PaddedTo8(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	tournament := &model.Tournament{ID: tournamentID, Status: "ongoing", BestOf: 3}
	teams := generateTeams(6)

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	bracketRepo.On("ListByTournament", ctx, tournamentID).Return([]*model.BracketMatch{}, nil)
	ttRepo.On("ListApprovedTeams", ctx, tournamentID).Return(teams, nil)
	bracketRepo.On("Create", ctx, mock.AnythingOfType("*model.BracketMatch")).Return(nil)
	// BYE matches auto-advance: 2 BYEs (6 teams padded to 8)
	bracketRepo.On("UpdateResult", ctx, mock.AnythingOfType("uuid.UUID"), mock.AnythingOfType("uuid.UUID"), mock.AnythingOfType("uuid.UUID"), mock.AnythingOfType("int"), mock.AnythingOfType("int")).Return(nil)
	bracketRepo.On("FindByID", ctx, mock.AnythingOfType("uuid.UUID")).Return(&model.BracketMatch{ID: uuid.New(), TournamentID: tournamentID, Status: "pending"}, nil)
	bracketRepo.On("Update", ctx, mock.AnythingOfType("*model.BracketMatch")).Return(nil)

	matchesCreated, totalRounds, err := svc.GenerateBracket(ctx, tournamentID, nil)

	assert.NoError(t, err)
	assert.Equal(t, 7, matchesCreated) // padded to 8, so 8-1=7 matches
	assert.Equal(t, 3, totalRounds)    // log2(8)=3
}

func TestGenerateBracket_Error_InsufficientTeams(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	tournament := &model.Tournament{ID: tournamentID, Status: "ongoing", BestOf: 3}
	teams := generateTeams(1) // Only 1 team

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	bracketRepo.On("ListByTournament", ctx, tournamentID).Return([]*model.BracketMatch{}, nil)
	ttRepo.On("ListApprovedTeams", ctx, tournamentID).Return(teams, nil)

	_, _, err := svc.GenerateBracket(ctx, tournamentID, nil)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "INSUFFICIENT_TEAMS", appErr.Code)
}

func TestGenerateBracket_Error_BracketAlreadyGenerated(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	tournament := &model.Tournament{ID: tournamentID, Status: "ongoing", BestOf: 3}
	existingMatches := []*model.BracketMatch{{ID: uuid.New()}}

	tournamentRepo.On("FindByID", ctx, tournamentID).Return(tournament, nil)
	bracketRepo.On("ListByTournament", ctx, tournamentID).Return(existingMatches, nil)

	_, _, err := svc.GenerateBracket(ctx, tournamentID, nil)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "BRACKET_ALREADY_GENERATED", appErr.Code)
}

// ========================================
// CompleteMatch Tests
// ========================================

func TestCompleteMatch_Success_WinnerAdvances(t *testing.T) {
	ctx := context.Background()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	tournamentID := uuid.New()
	matchID := uuid.New()
	nextMatchID := uuid.New()
	teamAID := uuid.New()
	teamBID := uuid.New()

	currentMatch := &model.BracketMatch{
		ID:           matchID,
		TournamentID: tournamentID,
		TeamAID:      &teamAID,
		TeamBID:      &teamBID,
		Status:       "live",
		NextMatchID:  &nextMatchID,
	}

	nextMatch := &model.BracketMatch{
		ID:           nextMatchID,
		TournamentID: tournamentID,
		Status:       "pending",
	}

	bracketRepo.On("FindByID", ctx, matchID).Return(currentMatch, nil)
	bracketRepo.On("UpdateResult", ctx, matchID, teamAID, teamBID, 0, 0).Return(nil)
	bracketRepo.On("FindByID", ctx, nextMatchID).Return(nextMatch, nil)
	bracketRepo.On("Update", ctx, mock.AnythingOfType("*model.BracketMatch")).Return(nil)

	// Standings: loser
	loserStanding := &model.Standing{TournamentID: tournamentID, TeamID: teamBID}
	standingsRepo.On("FindByTournamentAndTeam", ctx, tournamentID, teamBID).Return(loserStanding, nil)
	standingsRepo.On("Update", ctx, mock.MatchedBy(func(s *model.Standing) bool {
		return s.TeamID == teamBID
	})).Return(nil)

	// Standings: winner
	winnerStanding := &model.Standing{TournamentID: tournamentID, TeamID: teamAID}
	standingsRepo.On("FindByTournamentAndTeam", ctx, tournamentID, teamAID).Return(winnerStanding, nil)
	standingsRepo.On("Update", ctx, mock.MatchedBy(func(s *model.Standing) bool {
		return s.TeamID == teamAID
	})).Return(nil)

	err := svc.CompleteMatch(ctx, matchID, teamAID)

	assert.NoError(t, err)
	bracketRepo.AssertCalled(t, "UpdateResult", ctx, matchID, teamAID, teamBID, 0, 0)
	// Verify winner advanced to next match
	bracketRepo.AssertCalled(t, "FindByID", ctx, nextMatchID)
	bracketRepo.AssertCalled(t, "Update", ctx, mock.AnythingOfType("*model.BracketMatch"))
}

func TestCompleteMatch_Error_MatchNotLive(t *testing.T) {
	ctx := context.Background()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	matchID := uuid.New()
	teamAID := uuid.New()
	teamBID := uuid.New()

	match := &model.BracketMatch{
		ID:      matchID,
		TeamAID: &teamAID,
		TeamBID: &teamBID,
		Status:  "pending", // not live
	}

	bracketRepo.On("FindByID", ctx, matchID).Return(match, nil)

	err := svc.CompleteMatch(ctx, matchID, teamAID)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "MATCH_NOT_LIVE", appErr.Code)
}

func TestCompleteMatch_Error_InvalidWinner(t *testing.T) {
	ctx := context.Background()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	matchID := uuid.New()
	teamAID := uuid.New()
	teamBID := uuid.New()
	randomTeamID := uuid.New() // not in the match

	match := &model.BracketMatch{
		ID:      matchID,
		TeamAID: &teamAID,
		TeamBID: &teamBID,
		Status:  "live",
	}

	bracketRepo.On("FindByID", ctx, matchID).Return(match, nil)

	err := svc.CompleteMatch(ctx, matchID, randomTeamID)

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "INVALID_WINNER", appErr.Code)
}

// ========================================
// UpdateMatchStatus Tests
// ========================================

func TestUpdateMatchStatus_Success_PendingToScheduled(t *testing.T) {
	ctx := context.Background()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	matchID := uuid.New()
	tournamentID := uuid.New()

	match := &model.BracketMatch{
		ID:           matchID,
		TournamentID: tournamentID,
		Status:       "pending",
	}

	bracketRepo.On("FindByID", ctx, matchID).Return(match, nil)
	bracketRepo.On("UpdateStatus", ctx, matchID, "scheduled").Return(nil)

	err := svc.UpdateMatchStatus(ctx, matchID, "scheduled")

	assert.NoError(t, err)
	bracketRepo.AssertCalled(t, "UpdateStatus", ctx, matchID, "scheduled")
}

func TestUpdateMatchStatus_Success_ScheduledToLive(t *testing.T) {
	ctx := context.Background()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	matchID := uuid.New()
	tournamentID := uuid.New()

	match := &model.BracketMatch{
		ID:           matchID,
		TournamentID: tournamentID,
		Status:       "scheduled",
	}

	bracketRepo.On("FindByID", ctx, matchID).Return(match, nil)
	bracketRepo.On("UpdateStatus", ctx, matchID, "live").Return(nil)
	bracketRepo.On("Update", ctx, mock.AnythingOfType("*model.BracketMatch")).Return(nil)

	err := svc.UpdateMatchStatus(ctx, matchID, "live")

	assert.NoError(t, err)
	bracketRepo.AssertCalled(t, "UpdateStatus", ctx, matchID, "live")
}

func TestUpdateMatchStatus_Error_InvalidTransition(t *testing.T) {
	ctx := context.Background()

	bracketRepo := new(MockBracketRepo)
	matchGameRepo := new(MockMatchGameRepo)
	tournamentRepo := new(MockTournamentRepo)
	ttRepo := new(MockTournamentTeamRepo)
	teamRepo := new(MockTeamRepo)
	standingsRepo := new(MockStandingsRepo)
	hub := newTestHub()

	svc := NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, ttRepo, teamRepo, standingsRepo, hub)

	matchID := uuid.New()
	tournamentID := uuid.New()

	match := &model.BracketMatch{
		ID:           matchID,
		TournamentID: tournamentID,
		Status:       "pending",
	}

	bracketRepo.On("FindByID", ctx, matchID).Return(match, nil)

	// pending -> completed is not valid (must go through scheduled/live)
	err := svc.UpdateMatchStatus(ctx, matchID, "completed")

	assert.Error(t, err)
	appErr, ok := err.(*apperror.AppError)
	assert.True(t, ok)
	assert.Equal(t, "INVALID_STATUS_TRANSITION", appErr.Code)
}
