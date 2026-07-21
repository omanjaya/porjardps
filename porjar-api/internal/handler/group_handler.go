package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type GroupHandler struct {
	groupService   *service.GroupService
	groupRepo      model.GroupRepository
	tournamentRepo model.TournamentRepository
	eventAdminRepo model.EventAdminRepository
}

func NewGroupHandler(groupService *service.GroupService) *GroupHandler {
	return &GroupHandler{groupService: groupService}
}

// The three setters below wire the read-only repos needed to resolve
// group ID -> tournament -> event for the in-handler RBAC checks added to
// this file (see scope_helpers.go). GroupHandler previously only held
// groupService, which has no exposed way to fetch a bare group by ID.
// NEEDS ROUTES.GO WIRING:
//   groupHandler.SetGroupRepo(groupRepo)
//   groupHandler.SetTournamentRepo(tournamentRepo)
//   groupHandler.SetEventAdminRepo(eventAdminRepo)
func (h *GroupHandler) SetGroupRepo(repo model.GroupRepository) { h.groupRepo = repo }
func (h *GroupHandler) SetTournamentRepo(repo model.TournamentRepository) {
	h.tournamentRepo = repo
}
func (h *GroupHandler) SetEventAdminRepo(repo model.EventAdminRepository) {
	h.eventAdminRepo = repo
}

// checkGroupAccess gates a mutating /admin/groups/:id/* route: resolves
// groupID -> tournament -> event and verifies the requesting admin manages
// that event. Superadmins always pass; if groupRepo isn't wired yet this
// fails open (see scope_helpers.go header).
func (h *GroupHandler) checkGroupAccess(c *fiber.Ctx, groupID uuid.UUID) error {
	if h.groupRepo == nil {
		return nil
	}
	group, err := h.groupRepo.FindGroupByID(c.Context(), groupID)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "find group"))
	}
	if group == nil {
		return nil
	}
	return requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, group.TournamentID)
}

// groupAccessMw is route middleware wrapping every `/admin/groups/:id/*`
// route (whose handler may live in group_standings_handler.go,
// group_admin_handler.go or swiss_handler.go — files outside this task's
// edit scope). It re-checks group -> tournament -> event access using the
// group ID in the `:id` route param before calling into the handler chain.
func (h *GroupHandler) groupAccessMw(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Next() // let the real handler return its own validation error
	}
	if err := h.checkGroupAccess(c, groupID); err != nil {
		return err
	}
	return c.Next()
}

func (h *GroupHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Public routes
	app.Get("/tournaments/:id/groups", h.ListGroups)
	app.Get("/groups/:id/matches", h.GetGroupMatches)
	app.Get("/groups/:id/standings", h.GetGroupStandings)

	// Admin routes — explicit middleware params (no slice append).
	// Every `/admin/groups/:id/*` route gets groupAccessMw after adminMw so a
	// scoped admin can't mutate another event's group via a guessed group ID.
	app.Post("/admin/groups", authMw, adminMw, h.CreateGroup)
	app.Put("/admin/groups/:id", authMw, adminMw, h.groupAccessMw, h.UpdateGroup)
	app.Delete("/admin/groups/:id", authMw, adminMw, h.groupAccessMw, h.DeleteGroup)
	app.Post("/admin/groups/:id/teams", authMw, adminMw, h.groupAccessMw, h.AddTeams)
	app.Delete("/admin/groups/:id/teams/:teamId", authMw, adminMw, h.groupAccessMw, h.RemoveTeam)
	app.Post("/admin/groups/:id/generate", authMw, adminMw, h.groupAccessMw, h.GenerateMatches)
	app.Put("/admin/groups/:id/matches/:matchId", authMw, adminMw, h.groupAccessMw, h.UpdateMatchScore)
	app.Put("/admin/groups/:id/matches/:matchId/live", authMw, adminMw, h.groupAccessMw, h.SetMatchLive)
	app.Post("/admin/tournaments/:id/auto-draw", authMw, adminMw, h.AutoDraw)
	app.Post("/admin/tournaments/:id/advance-playoff", authMw, adminMw, h.AdvanceToPlayoff)
	app.Put("/admin/groups/:id/standings/:teamId/penalty", authMw, adminMw, h.groupAccessMw, h.SetPenaltyPoints)
	app.Post("/admin/tournaments/:id/groups/reset-results", authMw, adminMw, h.ResetGroupResults)
	app.Post("/admin/groups/:id/reset-results", authMw, adminMw, h.groupAccessMw, h.ResetSingleGroupResults)
	app.Get("/admin/tournaments/:id/groups/export-pdf", authMw, adminMw, h.ExportStandingsPDF)

	// Swiss routes
	app.Post("/admin/tournaments/:id/swiss/init", authMw, adminMw, h.InitSwiss)
	app.Post("/admin/groups/:id/swiss/generate-round", authMw, adminMw, h.groupAccessMw, h.GenerateSwissRound)
	app.Get("/groups/:id/swiss/status", h.GetSwissStatus)
}

// --- Request DTOs ---

type createGroupRequest struct {
	TournamentID string `json:"tournament_id"`
	Name         string `json:"name"`
	GroupOrder   int    `json:"group_order"`
	AdvanceCount int    `json:"advance_count"`
	Legs         int    `json:"legs"`
}

type updateGroupRequest struct {
	Name         string `json:"name"`
	AdvanceCount int    `json:"advance_count"`
}

type addTeamsRequest struct {
	TeamIDs []string `json:"team_ids"`
}

type updateGroupMatchScoreRequest struct {
	ScoreA      int     `json:"score_a"`
	ScoreB      int     `json:"score_b"`
	ScheduledAt *string `json:"scheduled_at"` // RFC3339, optional
}

// --- Handlers ---

func (h *GroupHandler) CreateGroup(c *fiber.Ctx) error {
	var req createGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format data tidak valid")
	}

	if req.Name == "" {
		return response.BadRequest(c, "Nama grup harus diisi")
	}

	tournamentID, err := uuid.Parse(req.TournamentID)
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}
	if err := requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, tournamentID); err != nil {
		return err
	}

	if req.AdvanceCount <= 0 {
		req.AdvanceCount = 2
	}
	if req.GroupOrder <= 0 {
		req.GroupOrder = 1
	}
	if req.Legs <= 0 {
		req.Legs = 1
	}

	group, err := h.groupService.CreateGroup(c.Context(), tournamentID, req.Name, req.GroupOrder, req.AdvanceCount, req.Legs)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Created(c, group)
}

func (h *GroupHandler) UpdateGroup(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	var req updateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format data tidak valid")
	}

	if req.Name == "" {
		return response.BadRequest(c, "Nama grup harus diisi")
	}

	group, err := h.groupService.UpdateGroup(c.Context(), groupID, req.Name, req.AdvanceCount)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, group)
}

func (h *GroupHandler) DeleteGroup(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	if err := h.groupService.DeleteGroup(c.Context(), groupID); err != nil {
		return response.HandleError(c, err)
	}

	return response.NoContent(c)
}

// ListGroups returns all groups for a tournament.
// Pagination is not needed here because groups per tournament are naturally limited (<100).
func (h *GroupHandler) ListGroups(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	groups, err := h.groupService.ListGroups(c.Context(), tournamentID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, groups)
}

func (h *GroupHandler) AddTeams(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	var req addTeamsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format data tidak valid")
	}

	if len(req.TeamIDs) == 0 {
		return response.BadRequest(c, "Minimal 1 tim harus dipilih")
	}

	teamIDs := make([]uuid.UUID, 0, len(req.TeamIDs))
	for _, idStr := range req.TeamIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			return response.BadRequest(c, "Team ID tidak valid: "+idStr)
		}
		teamIDs = append(teamIDs, id)
	}

	if err := h.groupService.AddTeams(c.Context(), groupID, teamIDs); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Tim berhasil ditambahkan ke grup"})
}

func (h *GroupHandler) RemoveTeam(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	teamID, err := uuid.Parse(c.Params("teamId"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	if err := h.groupService.RemoveTeam(c.Context(), groupID, teamID); err != nil {
		return response.HandleError(c, err)
	}

	return response.NoContent(c)
}

func (h *GroupHandler) GenerateMatches(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	matches, err := h.groupService.GenerateMatches(c.Context(), groupID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, matches)
}

func (h *GroupHandler) UpdateMatchScore(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("matchId"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	var req updateGroupMatchScoreRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format data tidak valid")
	}

	if req.ScoreA < 0 || req.ScoreB < 0 {
		return response.BadRequest(c, "Skor tidak boleh negatif")
	}

	var scheduledAt *time.Time
	if req.ScheduledAt != nil && *req.ScheduledAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ScheduledAt)
		if err == nil {
			scheduledAt = &t
		}
	}

	match, err := h.groupService.SubmitMatchResult(c.Context(), matchID, req.ScoreA, req.ScoreB, scheduledAt)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, match)
}

func (h *GroupHandler) GetGroupMatches(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	matches, err := h.groupService.GetGroupMatches(c.Context(), groupID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, matches)
}
