package handler

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// Mock TeamService
// ---------------------------------------------------------------------------

type mockTeamService struct {
	createFn       func(ctx context.Context, name string, gameID, schoolID, captainUserID uuid.UUID) (*model.Team, error)
	getByIDFn      func(ctx context.Context, id uuid.UUID) (*model.Team, error)
	updateFn       func(ctx context.Context, id uuid.UUID, name string, logoURL *string, callerUserID uuid.UUID) (*model.Team, error)
	listFn         func(ctx context.Context, filter model.TeamFilter) ([]*model.Team, int, error)
	addMemberFn    func(ctx context.Context, teamID, callerUserID, userID uuid.UUID, inGameName string, inGameID *string, role string, jerseyNumber *int) (*model.TeamMember, error)
	removeMemberFn func(ctx context.Context, teamID, callerUserID, memberID uuid.UUID) error
	getMyTeamsFn   func(ctx context.Context, userID uuid.UUID) ([]*model.Team, error)
	approveFn      func(ctx context.Context, teamID uuid.UUID) error
	rejectFn       func(ctx context.Context, teamID uuid.UUID, reason string) error
}

func (m *mockTeamService) Create(ctx context.Context, name string, gameID, schoolID, captainUserID uuid.UUID) (*model.Team, error) {
	return m.createFn(ctx, name, gameID, schoolID, captainUserID)
}
func (m *mockTeamService) GetByID(ctx context.Context, id uuid.UUID) (*model.Team, error) {
	return m.getByIDFn(ctx, id)
}
func (m *mockTeamService) Update(ctx context.Context, id uuid.UUID, name string, logoURL *string, callerUserID uuid.UUID) (*model.Team, error) {
	return m.updateFn(ctx, id, name, logoURL, callerUserID)
}
func (m *mockTeamService) List(ctx context.Context, filter model.TeamFilter) ([]*model.Team, int, error) {
	return m.listFn(ctx, filter)
}
func (m *mockTeamService) ListEnriched(ctx context.Context, filter model.TeamFilter) ([]*service.EnrichedTeam, int, error) {
	if m.listFn == nil {
		return []*service.EnrichedTeam{}, 0, nil
	}
	teams, total, err := m.listFn(ctx, filter)
	if err != nil {
		return nil, 0, err
	}
	enriched := make([]*service.EnrichedTeam, len(teams))
	for i, t := range teams {
		enriched[i] = &service.EnrichedTeam{
			ID:     t.ID.String(),
			Name:   t.Name,
			Status: t.Status,
		}
	}
	return enriched, total, nil
}
func (m *mockTeamService) GetMyTeamsEnriched(ctx context.Context, userID uuid.UUID) ([]*service.EnrichedTeam, error) {
	if m.getMyTeamsFn == nil {
		return []*service.EnrichedTeam{}, nil
	}
	teams, err := m.getMyTeamsFn(ctx, userID)
	if err != nil {
		return nil, err
	}
	enriched := make([]*service.EnrichedTeam, len(teams))
	for i, t := range teams {
		enriched[i] = &service.EnrichedTeam{
			ID:     t.ID.String(),
			Name:   t.Name,
			Status: t.Status,
		}
	}
	return enriched, nil
}
func (m *mockTeamService) AddMember(ctx context.Context, teamID, callerUserID, userID uuid.UUID, inGameName string, inGameID *string, role string, jerseyNumber *int) (*model.TeamMember, error) {
	return m.addMemberFn(ctx, teamID, callerUserID, userID, inGameName, inGameID, role, jerseyNumber)
}
func (m *mockTeamService) RemoveMember(ctx context.Context, teamID, callerUserID, memberID uuid.UUID) error {
	return m.removeMemberFn(ctx, teamID, callerUserID, memberID)
}
func (m *mockTeamService) GetMyTeams(ctx context.Context, userID uuid.UUID) ([]*model.Team, error) {
	return m.getMyTeamsFn(ctx, userID)
}
func (m *mockTeamService) Approve(ctx context.Context, teamID uuid.UUID) error {
	return m.approveFn(ctx, teamID)
}
func (m *mockTeamService) Reject(ctx context.Context, teamID uuid.UUID, reason string) error {
	return m.rejectFn(ctx, teamID, reason)
}
func (m *mockTeamService) GenerateInviteLink(ctx context.Context, teamID, captainUserID uuid.UUID, maxUses int, expiresIn time.Duration) (string, *model.TeamInvite, error) {
	return "", nil, nil
}
func (m *mockTeamService) JoinViaInvite(ctx context.Context, inviteCode string, userID uuid.UUID, inGameName string, inGameID *string) error {
	return nil
}
func (m *mockTeamService) GetTeamInvites(ctx context.Context, teamID, userID uuid.UUID) ([]*model.TeamInvite, error) {
	return nil, nil
}
func (m *mockTeamService) DeactivateInvite(ctx context.Context, teamID, inviteID, userID uuid.UUID) error {
	return nil
}
func (m *mockTeamService) GetInviteInfo(ctx context.Context, code string) (map[string]interface{}, error) {
	return nil, nil
}

func (m *mockTeamService) FindGameBySlug(ctx context.Context, slug string) (*model.Game, error) {
	return nil, nil
}

func (m *mockTeamService) GetByIDEnriched(ctx context.Context, id uuid.UUID) (*service.EnrichedTeam, error) {
	return nil, nil
}
func (m *mockTeamService) Delete(ctx context.Context, teamID, captainUserID uuid.UUID) error {
	return nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func newTestTeam() *model.Team {
	gameID := uuid.New()
	schoolID := uuid.New()
	captainID := uuid.New()
	return &model.Team{
		ID:            uuid.New(),
		Name:          "Team Alpha",
		GameID:        gameID,
		SchoolID:      &schoolID,
		CaptainUserID: &captainID,
		Status:        "pending",
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

func setupTeamApp(mock *mockTeamService) *fiber.App {
	app := fiber.New()
	h := NewTeamHandlerWithInterface(mock)

	authMw := middleware.AuthMiddleware(testJWTSecret)
	adminMw := middleware.RoleMiddleware("admin", "superadmin")

	h.RegisterRoutes(app, authMw, adminMw, adminMw)

	return app
}

// ---------------------------------------------------------------------------
// POST /teams - Create Team
// ---------------------------------------------------------------------------

func TestCreateTeam_Success(t *testing.T) {
	team := newTestTeam()
	gameID := team.GameID
	schoolID := *team.SchoolID
	userID := uuid.New()

	mock := &mockTeamService{
		createFn: func(_ context.Context, name string, gID, sID, captainUID uuid.UUID) (*model.Team, error) {
			assert.Equal(t, "Team Alpha", name)
			assert.Equal(t, gameID, gID)
			assert.Equal(t, schoolID, sID)
			assert.Equal(t, userID, captainUID)
			return team, nil
		},
	}

	app := setupTeamApp(mock)
	body := `{"name":"Team Alpha","game_id":"` + gameID.String() + `","school_id":"` + schoolID.String() + `"}`
	req := httptest.NewRequest("POST", "/teams", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(userID, "player"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.True(t, result["success"].(bool))
	data := result["data"].(map[string]interface{})
	assert.Equal(t, "Team Alpha", data["name"])
}

func TestCreateTeam_ValidationError(t *testing.T) {
	mock := &mockTeamService{}
	app := setupTeamApp(mock)
	userID := uuid.New()

	// Name too short, invalid UUIDs
	body := `{"name":"AB","game_id":"not-uuid","school_id":"not-uuid"}`
	req := httptest.NewRequest("POST", "/teams", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(userID, "player"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)

	result := parseBody(t, resp.Body)
	errBody := result["error"].(map[string]interface{})
	assert.Equal(t, "VALIDATION_ERROR", errBody["code"])
	details := errBody["details"].(map[string]interface{})
	assert.Contains(t, details, "name")
	assert.Contains(t, details, "game_id")
	assert.Contains(t, details, "school_id")
}

func TestCreateTeam_Unauthenticated(t *testing.T) {
	mock := &mockTeamService{}
	app := setupTeamApp(mock)

	body := `{"name":"Team Alpha","game_id":"` + uuid.New().String() + `","school_id":"` + uuid.New().String() + `"}`
	req := httptest.NewRequest("POST", "/teams", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	// No auth header

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)
}

// ---------------------------------------------------------------------------
// GET /teams - List Teams (paginated)
// ---------------------------------------------------------------------------

func TestListTeams_Success(t *testing.T) {
	team1 := newTestTeam()
	team2 := newTestTeam()
	team2.Name = "Team Beta"

	mock := &mockTeamService{
		listFn: func(_ context.Context, filter model.TeamFilter) ([]*model.Team, int, error) {
			assert.Equal(t, 1, filter.Page)
			assert.Equal(t, 20, filter.Limit)
			return []*model.Team{team1, team2}, 2, nil
		},
	}

	app := setupTeamApp(mock)
	req := httptest.NewRequest("GET", "/teams", nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.True(t, result["success"].(bool))

	data := result["data"].([]interface{})
	assert.Len(t, data, 2)

	meta := result["meta"].(map[string]interface{})
	assert.Equal(t, float64(1), meta["page"])
	assert.Equal(t, float64(20), meta["per_page"])
	assert.Equal(t, float64(2), meta["total"])
	assert.Equal(t, float64(1), meta["total_pages"])
}

func TestListTeams_WithPagination(t *testing.T) {
	mock := &mockTeamService{
		listFn: func(_ context.Context, filter model.TeamFilter) ([]*model.Team, int, error) {
			assert.Equal(t, 2, filter.Page)
			assert.Equal(t, 5, filter.Limit)
			return []*model.Team{}, 10, nil
		},
	}

	app := setupTeamApp(mock)
	req := httptest.NewRequest("GET", "/teams?page=2&per_page=5", nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	result := parseBody(t, resp.Body)
	meta := result["meta"].(map[string]interface{})
	assert.Equal(t, float64(2), meta["page"])
	assert.Equal(t, float64(5), meta["per_page"])
	assert.Equal(t, float64(10), meta["total"])
	assert.Equal(t, float64(2), meta["total_pages"])
}

// ---------------------------------------------------------------------------
// PUT /admin/teams/:id/approve - Requires Admin
// ---------------------------------------------------------------------------

func TestApproveTeam_AsAdmin(t *testing.T) {
	teamID := uuid.New()
	mock := &mockTeamService{
		approveFn: func(_ context.Context, id uuid.UUID) error {
			assert.Equal(t, teamID, id)
			return nil
		},
	}

	app := setupTeamApp(mock)
	req := httptest.NewRequest("PUT", "/admin/teams/"+teamID.String()+"/approve", nil)
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(uuid.New(), "admin"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.True(t, result["success"].(bool))
}

func TestApproveTeam_AsPlayer_Forbidden(t *testing.T) {
	mock := &mockTeamService{}
	app := setupTeamApp(mock)

	teamID := uuid.New()
	req := httptest.NewRequest("PUT", "/admin/teams/"+teamID.String()+"/approve", nil)
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(uuid.New(), "player"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 403, resp.StatusCode)

	result := parseBody(t, resp.Body)
	assert.False(t, result["success"].(bool))
	errBody := result["error"].(map[string]interface{})
	assert.Equal(t, "FORBIDDEN", errBody["code"])
}

func TestApproveTeam_Unauthenticated(t *testing.T) {
	mock := &mockTeamService{}
	app := setupTeamApp(mock)

	teamID := uuid.New()
	req := httptest.NewRequest("PUT", "/admin/teams/"+teamID.String()+"/approve", nil)
	// No auth header

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)
}

func TestApproveTeam_NotFound(t *testing.T) {
	mock := &mockTeamService{
		approveFn: func(_ context.Context, _ uuid.UUID) error {
			return apperror.NotFound("TEAM")
		},
	}

	app := setupTeamApp(mock)
	teamID := uuid.New()
	req := httptest.NewRequest("PUT", "/admin/teams/"+teamID.String()+"/approve", nil)
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(uuid.New(), "admin"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 404, resp.StatusCode)
}

// ---------------------------------------------------------------------------
// PUT /admin/teams/:id/reject - Requires Admin
// ---------------------------------------------------------------------------

func TestRejectTeam_AsAdmin(t *testing.T) {
	teamID := uuid.New()
	mock := &mockTeamService{
		rejectFn: func(_ context.Context, id uuid.UUID, reason string) error {
			assert.Equal(t, teamID, id)
			assert.Equal(t, "Dokumen tidak lengkap", reason)
			return nil
		},
	}

	app := setupTeamApp(mock)
	body := `{"reason":"Dokumen tidak lengkap"}`
	req := httptest.NewRequest("PUT", "/admin/teams/"+teamID.String()+"/reject", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+generateTestJWT(uuid.New(), "admin"))

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}
