package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- Mock implementations ---

type MockBRLobbyRepository struct {
	mock.Mock
}

func (m *MockBRLobbyRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.BRLobby, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BRLobby), args.Error(1)
}

func (m *MockBRLobbyRepository) Create(ctx context.Context, l *model.BRLobby) error {
	return m.Called(ctx, l).Error(0)
}

func (m *MockBRLobbyRepository) Update(ctx context.Context, l *model.BRLobby) error {
	return m.Called(ctx, l).Error(0)
}

func (m *MockBRLobbyRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockBRLobbyRepository) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRLobby, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BRLobby), args.Error(1)
}

func (m *MockBRLobbyRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status string) error {
	return m.Called(ctx, id, status).Error(0)
}

func (m *MockBRLobbyRepository) ListScheduledBefore(ctx context.Context, before time.Time) ([]*model.BRLobby, error) {
	args := m.Called(ctx, before)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BRLobby), args.Error(1)
}

type MockBRLobbyResultRepository struct {
	mock.Mock
}

func (m *MockBRLobbyResultRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.BRLobbyResult, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BRLobbyResult), args.Error(1)
}

func (m *MockBRLobbyResultRepository) Create(ctx context.Context, r *model.BRLobbyResult) error {
	return m.Called(ctx, r).Error(0)
}

func (m *MockBRLobbyResultRepository) Update(ctx context.Context, r *model.BRLobbyResult) error {
	return m.Called(ctx, r).Error(0)
}

func (m *MockBRLobbyResultRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockBRLobbyResultRepository) ListByLobby(ctx context.Context, lobbyID uuid.UUID) ([]*model.BRLobbyResult, error) {
	args := m.Called(ctx, lobbyID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BRLobbyResult), args.Error(1)
}

func (m *MockBRLobbyResultRepository) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRLobbyResult, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BRLobbyResult), args.Error(1)
}

func (m *MockBRLobbyResultRepository) ListByTeam(ctx context.Context, teamID uuid.UUID) ([]*model.BRLobbyResult, error) {
	args := m.Called(ctx, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BRLobbyResult), args.Error(1)
}

func (m *MockBRLobbyResultRepository) BulkCreate(ctx context.Context, results []*model.BRLobbyResult) error {
	return m.Called(ctx, results).Error(0)
}

func (m *MockBRLobbyResultRepository) FindByTeamAndLobby(ctx context.Context, teamID, lobbyID uuid.UUID) (*model.BRLobbyResult, error) {
	args := m.Called(ctx, teamID, lobbyID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BRLobbyResult), args.Error(1)
}

type MockBRPointRuleRepository struct {
	mock.Mock
}

func (m *MockBRPointRuleRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.BRPointRule, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BRPointRule), args.Error(1)
}

func (m *MockBRPointRuleRepository) Create(ctx context.Context, r *model.BRPointRule) error {
	return m.Called(ctx, r).Error(0)
}

func (m *MockBRPointRuleRepository) Update(ctx context.Context, r *model.BRPointRule) error {
	return m.Called(ctx, r).Error(0)
}

func (m *MockBRPointRuleRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockBRPointRuleRepository) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.BRPointRule, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.BRPointRule), args.Error(1)
}

func (m *MockBRPointRuleRepository) BulkCreate(ctx context.Context, rules []*model.BRPointRule) error {
	return m.Called(ctx, rules).Error(0)
}

func (m *MockBRPointRuleRepository) FindByPlacement(ctx context.Context, tournamentID uuid.UUID, placement int) (*model.BRPointRule, error) {
	args := m.Called(ctx, tournamentID, placement)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.BRPointRule), args.Error(1)
}

type MockTournamentTeamRepository struct {
	mock.Mock
}

func (m *MockTournamentTeamRepository) FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*model.TournamentTeam, error) {
	args := m.Called(ctx, tournamentID, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.TournamentTeam), args.Error(1)
}

func (m *MockTournamentTeamRepository) Create(ctx context.Context, tt *model.TournamentTeam) error {
	return m.Called(ctx, tt).Error(0)
}

func (m *MockTournamentTeamRepository) Delete(ctx context.Context, tournamentID, teamID uuid.UUID) error {
	return m.Called(ctx, tournamentID, teamID).Error(0)
}

func (m *MockTournamentTeamRepository) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.TournamentTeam, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.TournamentTeam), args.Error(1)
}

func (m *MockTournamentTeamRepository) ListApprovedTeams(ctx context.Context, tournamentID uuid.UUID) ([]*model.Team, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Team), args.Error(1)
}

type MockStandingsRepository struct {
	mock.Mock
}

func (m *MockStandingsRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Standing, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Standing), args.Error(1)
}

func (m *MockStandingsRepository) Create(ctx context.Context, s *model.Standing) error {
	return m.Called(ctx, s).Error(0)
}

func (m *MockStandingsRepository) Update(ctx context.Context, s *model.Standing) error {
	return m.Called(ctx, s).Error(0)
}

func (m *MockStandingsRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

func (m *MockStandingsRepository) FindByTournamentAndTeam(ctx context.Context, tournamentID, teamID uuid.UUID) (*model.Standing, error) {
	args := m.Called(ctx, tournamentID, teamID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Standing), args.Error(1)
}

func (m *MockStandingsRepository) ListByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*model.Standing, error) {
	args := m.Called(ctx, tournamentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Standing), args.Error(1)
}

func (m *MockStandingsRepository) ListByTournamentAndGroup(ctx context.Context, tournamentID uuid.UUID, groupName string) ([]*model.Standing, error) {
	args := m.Called(ctx, tournamentID, groupName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*model.Standing), args.Error(1)
}

func (m *MockStandingsRepository) Upsert(ctx context.Context, s *model.Standing) error {
	return m.Called(ctx, s).Error(0)
}

func (m *MockStandingsRepository) BulkUpsert(ctx context.Context, standings []*model.Standing) error {
	return m.Called(ctx, standings).Error(0)
}

func (m *MockStandingsRepository) UpdateRankPositions(ctx context.Context, tournamentID uuid.UUID) error {
	return m.Called(ctx, tournamentID).Error(0)
}

func (m *MockStandingsRepository) IncrementBracketStats(ctx context.Context, tournamentID, teamID uuid.UUID, isWin bool) error {
	return m.Called(ctx, tournamentID, teamID, isWin).Error(0)
}

// --- Helper to build default point rules ---

func defaultPointRules(tournamentID uuid.UUID) []*model.BRPointRule {
	placements := []struct {
		p int
		v int
	}{
		{1, 15}, {2, 12}, {3, 10}, {4, 8}, {5, 6}, {6, 4}, {7, 2}, {8, 1},
	}
	var rules []*model.BRPointRule
	for _, r := range placements {
		rules = append(rules, &model.BRPointRule{
			ID:           uuid.New(),
			TournamentID: tournamentID,
			Placement:    r.p,
			Points:       r.v,
		})
	}
	return rules
}

// --- BRService Tests ---

func TestInputResults_Success_1stPlaceWith12Kills(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()
	lobbyID := uuid.New()
	teamID := uuid.New()

	lobbyRepo := new(MockBRLobbyRepository)
	resultRepo := new(MockBRLobbyResultRepository)
	pointRuleRepo := new(MockBRPointRuleRepository)
	ttRepo := new(MockTournamentTeamRepository)
	standingsRepo := new(MockStandingsRepository)
	hub := ws.NewHub()
	go hub.Run()

	svc := NewBRService(lobbyRepo, resultRepo, pointRuleRepo, ttRepo, standingsRepo, hub)

	lobby := &model.BRLobby{
		ID:           lobbyID,
		TournamentID: tournamentID,
		LobbyName:    "Lobby 1",
		LobbyNumber:  1,
		DayNumber:    1,
		Status:       "live",
	}

	rules := defaultPointRules(tournamentID)

	lobbyRepo.On("FindByID", ctx, lobbyID).Return(lobby, nil)
	pointRuleRepo.On("ListByTournament", ctx, tournamentID).Return(rules, nil)
	resultRepo.On("ListByLobby", ctx, lobbyID).Return([]*model.BRLobbyResult{}, nil)
	resultRepo.On("BulkCreate", ctx, mock.MatchedBy(func(results []*model.BRLobbyResult) bool {
		if len(results) != 1 {
			return false
		}
		r := results[0]
		// 1st place = 15 placement points, 12 kills = 12 kill points, total = 27
		return r.PlacementPoints == 15 && r.KillPoints == 12 && r.TotalPoints == 27 &&
			r.Placement == 1 && r.Kills == 12
	})).Return(nil)
	lobbyRepo.On("Update", ctx, mock.AnythingOfType("*model.BRLobby")).Return(nil)

	// recalculateStandings calls
	lobbyRepo.On("ListByTournament", ctx, tournamentID).Return([]*model.BRLobby{lobby}, nil)
	// After BulkCreate, ListByLobby is called again during recalculate; return the expected result
	resultRepo.On("ListByLobby", ctx, lobbyID).Return([]*model.BRLobbyResult{
		{
			ID:              uuid.New(),
			LobbyID:         lobbyID,
			TeamID:          teamID,
			Placement:       1,
			Kills:           12,
			PlacementPoints: 15,
			KillPoints:      12,
			TotalPoints:     27,
		},
	}, nil).Maybe()
	standingsRepo.On("BulkUpsert", ctx, mock.AnythingOfType("[]*model.Standing")).Return(nil)
	standingsRepo.On("UpdateRankPositions", ctx, tournamentID).Return(nil)

	input := []ResultInput{
		{TeamID: teamID, Placement: 1, Kills: 12},
	}

	err := svc.InputResults(ctx, lobbyID, input)
	assert.NoError(t, err)
	resultRepo.AssertExpectations(t)
}

func TestInputResults_Success_8thPlaceWith3Kills(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()
	lobbyID := uuid.New()
	teamID := uuid.New()

	lobbyRepo := new(MockBRLobbyRepository)
	resultRepo := new(MockBRLobbyResultRepository)
	pointRuleRepo := new(MockBRPointRuleRepository)
	ttRepo := new(MockTournamentTeamRepository)
	standingsRepo := new(MockStandingsRepository)
	hub := ws.NewHub()
	go hub.Run()

	svc := NewBRService(lobbyRepo, resultRepo, pointRuleRepo, ttRepo, standingsRepo, hub)

	lobby := &model.BRLobby{
		ID:           lobbyID,
		TournamentID: tournamentID,
		LobbyName:    "Lobby 1",
		LobbyNumber:  1,
		DayNumber:    1,
		Status:       "live",
	}

	rules := defaultPointRules(tournamentID)

	lobbyRepo.On("FindByID", ctx, lobbyID).Return(lobby, nil)
	pointRuleRepo.On("ListByTournament", ctx, tournamentID).Return(rules, nil)
	resultRepo.On("ListByLobby", ctx, lobbyID).Return([]*model.BRLobbyResult{}, nil)
	resultRepo.On("BulkCreate", ctx, mock.MatchedBy(func(results []*model.BRLobbyResult) bool {
		if len(results) != 1 {
			return false
		}
		r := results[0]
		// 8th place = 1 placement point, 3 kills = 3 kill points, total = 4
		return r.PlacementPoints == 1 && r.KillPoints == 3 && r.TotalPoints == 4 &&
			r.Placement == 8 && r.Kills == 3
	})).Return(nil)
	lobbyRepo.On("Update", ctx, mock.AnythingOfType("*model.BRLobby")).Return(nil)

	// recalculateStandings calls
	lobbyRepo.On("ListByTournament", ctx, tournamentID).Return([]*model.BRLobby{lobby}, nil)
	resultRepo.On("ListByLobby", ctx, lobbyID).Return([]*model.BRLobbyResult{
		{
			ID:              uuid.New(),
			LobbyID:         lobbyID,
			TeamID:          teamID,
			Placement:       8,
			Kills:           3,
			PlacementPoints: 1,
			KillPoints:      3,
			TotalPoints:     4,
		},
	}, nil).Maybe()
	standingsRepo.On("BulkUpsert", ctx, mock.AnythingOfType("[]*model.Standing")).Return(nil)
	standingsRepo.On("UpdateRankPositions", ctx, tournamentID).Return(nil)

	input := []ResultInput{
		{TeamID: teamID, Placement: 8, Kills: 3},
	}

	err := svc.InputResults(ctx, lobbyID, input)
	assert.NoError(t, err)
	resultRepo.AssertExpectations(t)
}

func TestInputResults_Success_StandingsRecalculated(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()
	lobbyID := uuid.New()
	teamID := uuid.New()

	lobbyRepo := new(MockBRLobbyRepository)
	resultRepo := new(MockBRLobbyResultRepository)
	pointRuleRepo := new(MockBRPointRuleRepository)
	ttRepo := new(MockTournamentTeamRepository)
	standingsRepo := new(MockStandingsRepository)
	hub := ws.NewHub()
	go hub.Run()

	svc := NewBRService(lobbyRepo, resultRepo, pointRuleRepo, ttRepo, standingsRepo, hub)

	lobby := &model.BRLobby{
		ID:           lobbyID,
		TournamentID: tournamentID,
		LobbyName:    "Lobby 1",
		LobbyNumber:  1,
		DayNumber:    1,
		Status:       "live",
	}
	rules := defaultPointRules(tournamentID)

	lobbyRepo.On("FindByID", ctx, lobbyID).Return(lobby, nil)
	pointRuleRepo.On("ListByTournament", ctx, tournamentID).Return(rules, nil)
	// First call: check existing results (empty)
	resultRepo.On("ListByLobby", ctx, lobbyID).Return([]*model.BRLobbyResult{}, nil).Once()
	resultRepo.On("BulkCreate", ctx, mock.AnythingOfType("[]*model.BRLobbyResult")).Return(nil)
	lobbyRepo.On("Update", ctx, mock.AnythingOfType("*model.BRLobby")).Return(nil)

	// recalculateStandings
	lobbyRepo.On("ListByTournament", ctx, tournamentID).Return([]*model.BRLobby{lobby}, nil)
	// Second call: recalculate reads back the newly created results
	resultRepo.On("ListByLobby", ctx, lobbyID).Return([]*model.BRLobbyResult{
		{
			ID:              uuid.New(),
			LobbyID:         lobbyID,
			TeamID:          teamID,
			Placement:       2,
			Kills:           5,
			PlacementPoints: 12,
			KillPoints:      5,
			TotalPoints:     17,
		},
	}, nil).Once()

	// Verify standings are upserted and rank positions updated
	standingsRepo.On("BulkUpsert", ctx, mock.MatchedBy(func(standings []*model.Standing) bool {
		if len(standings) != 1 {
			return false
		}
		s := standings[0]
		return s.TournamentID == tournamentID && s.TeamID == teamID &&
			s.TotalPoints == 17 && s.TotalKills == 5 &&
			s.TotalPlacementPoints == 12 && s.MatchesPlayed == 1
	})).Return(nil)
	standingsRepo.On("UpdateRankPositions", ctx, tournamentID).Return(nil)

	input := []ResultInput{
		{TeamID: teamID, Placement: 2, Kills: 5},
	}

	err := svc.InputResults(ctx, lobbyID, input)
	assert.NoError(t, err)
	standingsRepo.AssertExpectations(t)
}

func TestInputResults_Error_LobbyNotFound(t *testing.T) {
	ctx := context.Background()
	lobbyID := uuid.New()

	lobbyRepo := new(MockBRLobbyRepository)
	resultRepo := new(MockBRLobbyResultRepository)
	pointRuleRepo := new(MockBRPointRuleRepository)
	ttRepo := new(MockTournamentTeamRepository)
	standingsRepo := new(MockStandingsRepository)
	hub := ws.NewHub()
	go hub.Run()

	svc := NewBRService(lobbyRepo, resultRepo, pointRuleRepo, ttRepo, standingsRepo, hub)

	lobbyRepo.On("FindByID", ctx, lobbyID).Return(nil, errors.New("not found"))

	input := []ResultInput{
		{TeamID: uuid.New(), Placement: 1, Kills: 5},
	}

	err := svc.InputResults(ctx, lobbyID, input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "LOBBY")
}

func TestCreateDefaultPointRules_Success(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()

	pointRuleRepo := new(MockBRPointRuleRepository)

	svc := NewBRService(nil, nil, pointRuleRepo, nil, nil, nil)

	expectedPlacements := map[int]int{
		1: 15, 2: 12, 3: 10, 4: 8, 5: 6, 6: 4, 7: 2, 8: 1,
	}

	pointRuleRepo.On("BulkCreate", ctx, mock.MatchedBy(func(rules []*model.BRPointRule) bool {
		if len(rules) != 8 {
			return false
		}
		for _, rule := range rules {
			if rule.TournamentID != tournamentID {
				return false
			}
			expected, ok := expectedPlacements[rule.Placement]
			if !ok || rule.Points != expected {
				return false
			}
		}
		return true
	})).Return(nil)

	err := svc.CreateDefaultPointRules(ctx, tournamentID)
	assert.NoError(t, err)
	pointRuleRepo.AssertExpectations(t)
}

func TestCreateDefaultPointRules_VerifyPointValues(t *testing.T) {
	ctx := context.Background()
	tournamentID := uuid.New()

	pointRuleRepo := new(MockBRPointRuleRepository)

	svc := NewBRService(nil, nil, pointRuleRepo, nil, nil, nil)

	var capturedRules []*model.BRPointRule
	pointRuleRepo.On("BulkCreate", ctx, mock.AnythingOfType("[]*model.BRPointRule")).
		Run(func(args mock.Arguments) {
			capturedRules = args.Get(1).([]*model.BRPointRule)
		}).Return(nil)

	err := svc.CreateDefaultPointRules(ctx, tournamentID)
	assert.NoError(t, err)

	// Verify each placement value
	assert.Len(t, capturedRules, 8)

	ruleMap := make(map[int]int)
	for _, r := range capturedRules {
		ruleMap[r.Placement] = r.Points
	}

	assert.Equal(t, 15, ruleMap[1], "1st place should be 15 points")
	assert.Equal(t, 12, ruleMap[2], "2nd place should be 12 points")
	assert.Equal(t, 10, ruleMap[3], "3rd place should be 10 points")
	assert.Equal(t, 8, ruleMap[4], "4th place should be 8 points")
	assert.Equal(t, 6, ruleMap[5], "5th place should be 6 points")
	assert.Equal(t, 4, ruleMap[6], "6th place should be 4 points")
	assert.Equal(t, 2, ruleMap[7], "7th place should be 2 points")
	assert.Equal(t, 1, ruleMap[8], "8th place should be 1 point")
}
