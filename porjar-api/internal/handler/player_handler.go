package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type PlayerHandler struct {
	statsService     *service.PlayerStatsService
	dashboardService *service.PlayerDashboardService
}

func NewPlayerHandler(statsService *service.PlayerStatsService, dashboardService *service.PlayerDashboardService) *PlayerHandler {
	return &PlayerHandler{statsService: statsService, dashboardService: dashboardService}
}

func (h *PlayerHandler) RegisterRoutes(app fiber.Router, authMw, publicRL fiber.Handler) {
	// Public player routes — no auth needed (rate limited)
	app.Get("/players", publicRL, h.ListPlayers) // specific before parameterized
	app.Get("/players/:id", h.GetProfile)
	app.Get("/players/:id/stats", h.GetStats)
	app.Get("/players/:id/achievements", h.GetAchievements)
	app.Get("/achievements", h.ListAchievements)

	// Authenticated player dashboard routes
	app.Get("/player/dashboard", authMw, h.GetDashboard)
	app.Get("/player/my-matches", authMw, h.GetMyMatches)
}

// GET /players?search=&page=&limit= — public paginated player list
func (h *PlayerHandler) ListPlayers(c *fiber.Ctx) error {
	search := c.Query("search")
	if len(search) < 2 {
		search = "" // ignore single-char searches to prevent full table scans
	}
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if page > 10000 {
		page = 10000
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	players, total, svcErr := h.statsService.ListPlayers(c.Context(), search, page, limit)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{
		"data":  players,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GET /players/:id — public player profile with stats
func (h *PlayerHandler) GetProfile(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	profile, svcErr := h.statsService.GetPlayerProfile(c.Context(), id)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, profile)
}

// GET /players/:id/stats?game=<slug> — detailed stats per game
func (h *PlayerHandler) GetStats(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	gameSlug := c.Query("game")
	if gameSlug == "" {
		// Return all games
		profile, svcErr := h.statsService.GetPlayerProfile(c.Context(), id)
		if svcErr != nil {
			return response.HandleError(c, svcErr)
		}
		return response.OK(c, profile.GameStats)
	}

	stats, svcErr := h.statsService.GetPlayerGameStats(c.Context(), id, gameSlug)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, stats)
}

// GET /players/:id/achievements — list earned achievements
func (h *PlayerHandler) GetAchievements(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	profile, svcErr := h.statsService.GetPlayerProfile(c.Context(), id)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, profile.Achievements)
}

// GET /achievements — list all available achievements
func (h *PlayerHandler) ListAchievements(c *fiber.Ctx) error {
	achievements, err := h.statsService.GetAllAchievements(c.Context())
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "list achievements"))
	}

	return response.OK(c, achievements)
}

// GET /player/dashboard — authenticated player dashboard
func (h *PlayerHandler) GetDashboard(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	data, err := h.dashboardService.GetDashboard(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, data)
}

// GET /player/my-matches — authenticated player match history
func (h *PlayerHandler) GetMyMatches(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	data, err := h.dashboardService.GetMyMatches(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, data)
}
