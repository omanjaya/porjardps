package handler

import (
	"context"
	"math"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/validator"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

// TeamServiceInterface defines the methods the team handler needs from the service layer.
type TeamServiceInterface interface {
	Create(ctx context.Context, name string, gameID, schoolID, captainUserID uuid.UUID) (*model.Team, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Team, error)
	Update(ctx context.Context, id uuid.UUID, name string, logoURL *string, callerUserID uuid.UUID) (*model.Team, error)
	List(ctx context.Context, filter model.TeamFilter) ([]*model.Team, int, error)
	ListEnriched(ctx context.Context, filter model.TeamFilter) ([]*service.EnrichedTeam, int, error)
	AddMember(ctx context.Context, teamID, callerUserID, userID uuid.UUID, inGameName string, inGameID *string, role string, jerseyNumber *int) (*model.TeamMember, error)
	RemoveMember(ctx context.Context, teamID, callerUserID, memberID uuid.UUID) error
	GetMyTeams(ctx context.Context, userID uuid.UUID) ([]*model.Team, error)
	GetMyTeamsEnriched(ctx context.Context, userID uuid.UUID) ([]*service.EnrichedTeam, error)
	Approve(ctx context.Context, teamID uuid.UUID) error
	Reject(ctx context.Context, teamID uuid.UUID, reason string) error
	GenerateInviteLink(ctx context.Context, teamID, captainUserID uuid.UUID, maxUses int, expiresIn time.Duration) (string, *model.TeamInvite, error)
	JoinViaInvite(ctx context.Context, inviteCode string, userID uuid.UUID, inGameName string, inGameID *string) error
	GetTeamInvites(ctx context.Context, teamID, userID uuid.UUID) ([]*model.TeamInvite, error)
	DeactivateInvite(ctx context.Context, teamID, inviteID, userID uuid.UUID) error
	FindGameBySlug(ctx context.Context, slug string) (*model.Game, error)
	GetByIDEnriched(ctx context.Context, id uuid.UUID) (*service.EnrichedTeam, error)
	GetInviteInfo(ctx context.Context, code string) (map[string]interface{}, error)
	Delete(ctx context.Context, teamID, captainUserID uuid.UUID) error
	AdminUpdate(ctx context.Context, id uuid.UUID, name string) (*model.Team, error)
	AdminDelete(ctx context.Context, teamID uuid.UUID) error
}

type TeamHandler struct {
	teamService TeamServiceInterface
}

func NewTeamHandler(teamService *service.TeamService) *TeamHandler {
	return &TeamHandler{teamService: teamService}
}

// NewTeamHandlerWithInterface creates a TeamHandler with any TeamServiceInterface implementation.
func NewTeamHandlerWithInterface(teamService TeamServiceInterface) *TeamHandler {
	return &TeamHandler{teamService: teamService}
}

func (h *TeamHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, superadminMw, publicRL fiber.Handler) {
	// Public routes (specific paths before parameterized)
	app.Get("/teams", publicRL, h.List)
	app.Get("/teams/invite/:code", h.GetInviteInfo)

	// Authenticated specific paths before /:id
	app.Post("/teams", authMw, h.Create)
	app.Get("/teams/my", authMw, h.GetMyTeams)
	app.Post("/teams/join/:code", authMw, h.JoinViaInvite)

	// Parameterized routes
	app.Get("/teams/:id", h.GetByID)
	app.Put("/teams/:id", authMw, h.Update)
	app.Post("/teams/:id/members", authMw, h.AddMember)
	app.Delete("/teams/:id/members/:uid", authMw, h.RemoveMember)
	app.Post("/teams/:id/invite", authMw, h.GenerateInvite)
	app.Get("/teams/:id/invites", authMw, h.ListInvites)
	app.Delete("/teams/:id/invites/:inviteId", authMw, h.DeactivateInvite)

	app.Delete("/teams/:id", authMw, h.Delete)

	// Admin routes
	app.Put("/admin/teams/:id/approve", authMw, adminMw, h.Approve)
	app.Put("/admin/teams/:id/reject", authMw, adminMw, h.Reject)
	app.Put("/admin/teams/:id", authMw, adminMw, h.AdminUpdate)
	app.Delete("/admin/teams/:id", authMw, adminMw, h.AdminDelete)
}

type createTeamRequest struct {
	Name     string `json:"name"`
	GameID   string `json:"game_id"`
	SchoolID string `json:"school_id"`
}

func (h *TeamHandler) Create(c *fiber.Ctx) error {
	var req createTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate
	details := make(map[string]string)
	if !validator.ValidateStringLength(req.Name, 3, 50) {
		details["name"] = "Nama tim harus 3-50 karakter"
	}
	gameID, err := uuid.Parse(req.GameID)
	if err != nil {
		details["game_id"] = "Game ID tidak valid"
	}
	schoolID, err := uuid.Parse(req.SchoolID)
	if err != nil {
		details["school_id"] = "School ID tidak valid"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	userID := middleware.GetUserID(c)
	team, svcErr := h.teamService.Create(c.Context(), validator.TrimString(req.Name), gameID, schoolID, userID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, team)
}

func (h *TeamHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	// Return enriched team with members, school, game info
	enriched, svcErr := h.teamService.GetByIDEnriched(c.Context(), id)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, enriched)
}

type updateTeamRequest struct {
	Name    string  `json:"name"`
	LogoURL *string `json:"logo_url"`
}

func (h *TeamHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req updateTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Name != "" && !validator.ValidateStringLength(req.Name, 3, 50) {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"name": "Nama tim harus 3-50 karakter",
		}))
	}

	userID := middleware.GetUserID(c)
	team, svcErr := h.teamService.Update(c.Context(), id, validator.TrimString(req.Name), req.LogoURL, userID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, team)
}

func (h *TeamHandler) List(c *fiber.Ctx) error {
	filter := model.TeamFilter{
		Page:  1,
		Limit: 20,
	}

	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 && v <= 10000 {
			filter.Page = v
		}
	}
	if pp := c.Query("per_page"); pp != "" {
		if v, err := strconv.Atoi(pp); err == nil && v > 0 && v <= 100 {
			filter.Limit = v
		}
	}
	if gid := c.Query("game_id"); gid != "" {
		if id, err := uuid.Parse(gid); err == nil {
			filter.GameID = &id
		}
	}
	if gs := c.Query("game_slug"); gs != "" {
		game, err := h.teamService.FindGameBySlug(c.Context(), gs)
		if err == nil && game != nil {
			filter.GameID = &game.ID
		}
	}
	if sid := c.Query("school_id"); sid != "" {
		if id, err := uuid.Parse(sid); err == nil {
			filter.SchoolID = &id
		}
	}
	if st := c.Query("status"); st != "" {
		filter.Status = &st
	}
	if s := c.Query("search"); s != "" {
		trimmed := validator.TrimString(s)
		if len(trimmed) >= 2 {
			filter.Search = &trimmed
		}
	}

	teams, total, err := h.teamService.ListEnriched(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.Limit)))
	return response.Paginated(c, teams, response.Meta{
		Page:       filter.Page,
		PerPage:    filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

type addMemberRequest struct {
	UserID       string `json:"user_id"`
	InGameName   string `json:"in_game_name"`
	InGameID     string `json:"in_game_id"`
	Role         string `json:"role"`
	JerseyNumber *int   `json:"jersey_number"`
}

func (h *TeamHandler) AddMember(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	var req addMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	userID, err := uuid.Parse(req.UserID)
	if err != nil {
		details["user_id"] = "User ID tidak valid"
	}
	if !validator.ValidateStringLength(req.InGameName, 1, 50) {
		details["in_game_name"] = "In-game name harus 1-50 karakter"
	}
	if req.Role == "" {
		details["role"] = "Role wajib diisi"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	var inGameID *string
	if req.InGameID != "" {
		inGameID = &req.InGameID
	}

	callerUserID := middleware.GetUserID(c)
	member, svcErr := h.teamService.AddMember(c.Context(), teamID, callerUserID, userID, validator.TrimString(req.InGameName), inGameID, req.Role, req.JerseyNumber)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, member)
}

func (h *TeamHandler) RemoveMember(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	memberID, err := uuid.Parse(c.Params("uid"))
	if err != nil {
		return response.BadRequest(c, "Member ID tidak valid")
	}

	callerUserID := middleware.GetUserID(c)
	if svcErr := h.teamService.RemoveMember(c.Context(), teamID, callerUserID, memberID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.NoContent(c)
}

func (h *TeamHandler) GetMyTeams(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	teams, err := h.teamService.GetMyTeamsEnriched(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, teams)
}

type rejectTeamRequest struct {
	Reason string `json:"reason"`
}

func (h *TeamHandler) Approve(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	if svcErr := h.teamService.Approve(c.Context(), id); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Tim berhasil disetujui"})
}

func (h *TeamHandler) Reject(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req rejectTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if svcErr := h.teamService.Reject(c.Context(), id, req.Reason); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Tim berhasil ditolak"})
}

// === Team Invite Handlers ===

type generateInviteRequest struct {
	MaxUses   int `json:"max_uses"`
	ExpiryDays int `json:"expiry_days"`
}

func (h *TeamHandler) GenerateInvite(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	var req generateInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Default values
	if req.MaxUses <= 0 {
		req.MaxUses = 1
	}
	if req.ExpiryDays <= 0 {
		req.ExpiryDays = 7
	}
	if req.ExpiryDays > 30 {
		req.ExpiryDays = 30
	}

	// 0 means unlimited
	maxUses := req.MaxUses
	if maxUses > 100 {
		maxUses = 0 // treat large values as unlimited
	}

	userID := middleware.GetUserID(c)
	expiresIn := time.Duration(req.ExpiryDays) * 24 * time.Hour

	code, invite, svcErr := h.teamService.GenerateInviteLink(c.Context(), teamID, userID, maxUses, expiresIn)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, fiber.Map{
		"invite_code": code,
		"invite_url":  "/teams/join/" + code,
		"expires_at":  invite.ExpiresAt,
		"max_uses":    invite.MaxUses,
	})
}

type joinViaInviteRequest struct {
	InGameName string `json:"in_game_name"`
	InGameID   string `json:"in_game_id"`
}

func (h *TeamHandler) JoinViaInvite(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return response.BadRequest(c, "Kode invite tidak valid")
	}

	var req joinViaInviteRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if !validator.ValidateStringLength(req.InGameName, 1, 50) {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"in_game_name": "In-game name harus 1-50 karakter",
		}))
	}

	userID := middleware.GetUserID(c)

	var inGameID *string
	if req.InGameID != "" {
		inGameID = &req.InGameID
	}

	if svcErr := h.teamService.JoinViaInvite(c.Context(), code, userID, validator.TrimString(req.InGameName), inGameID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Berhasil bergabung ke tim"})
}

func (h *TeamHandler) ListInvites(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	userID := middleware.GetUserID(c)

	invites, svcErr := h.teamService.GetTeamInvites(c.Context(), teamID, userID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, invites)
}

func (h *TeamHandler) DeactivateInvite(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	inviteID, err := uuid.Parse(c.Params("inviteId"))
	if err != nil {
		return response.BadRequest(c, "Invite ID tidak valid")
	}

	userID := middleware.GetUserID(c)

	if svcErr := h.teamService.DeactivateInvite(c.Context(), teamID, inviteID, userID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Invite berhasil dinonaktifkan"})
}

func (h *TeamHandler) GetInviteInfo(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return response.BadRequest(c, "Kode invite tidak valid")
	}

	// This is a read-only endpoint to get team info from invite code
	// We need to access the invite repo through the service
	// For now, just use GetByID after resolving through the service
	// The service needs a method for this
	invite, err := h.teamService.GetInviteInfo(c.Context(), code)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, invite)
}

func (h *TeamHandler) AdminUpdate(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req updateTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Name != "" && !validator.ValidateStringLength(req.Name, 3, 50) {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"name": "Nama tim harus 3-50 karakter",
		}))
	}

	team, svcErr := h.teamService.AdminUpdate(c.Context(), id, validator.TrimString(req.Name))
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, team)
}

func (h *TeamHandler) AdminDelete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	if svcErr := h.teamService.AdminDelete(c.Context(), id); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.NoContent(c)
}

func (h *TeamHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	userID := middleware.GetUserID(c)
	if svcErr := h.teamService.Delete(c.Context(), id, userID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.NoContent(c)
}
