package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type CoachHandler struct {
	coachService *service.CoachService
}

func NewCoachHandler(coachService *service.CoachService) *CoachHandler {
	return &CoachHandler{coachService: coachService}
}

func (h *CoachHandler) RegisterRoutes(api fiber.Router, authMw, coachMw, adminMw fiber.Handler) {
	// Coach routes
	api.Get("/coach/dashboard", authMw, coachMw, h.GetDashboard)
	api.Get("/coach/teams", authMw, coachMw, h.GetTeams)
	api.Get("/coach/results", authMw, coachMw, h.GetResults)
	api.Get("/coach/submissions", authMw, coachMw, h.GetSubmissions)

	// Admin routes for coach management
	api.Post("/admin/coaches/:userId/assign-school", authMw, adminMw, h.AssignSchool)
	api.Get("/admin/coaches", authMw, adminMw, h.ListCoaches)
}

// --- Request DTOs ---

type assignSchoolRequest struct {
	SchoolID string `json:"school_id"`
}

// --- Handlers ---

func (h *CoachHandler) GetDashboard(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	tournamentIDStr := c.Query("tournament_id", "")
	var tournamentID *uuid.UUID
	if tournamentIDStr != "" {
		id, err := uuid.Parse(tournamentIDStr)
		if err != nil {
			return response.BadRequest(c, "Tournament ID tidak valid")
		}
		tournamentID = &id
	}

	dashboards, svcErr := h.coachService.GetSchoolResults(c.Context(), userID, tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, dashboards)
}

func (h *CoachHandler) GetTeams(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	teams, svcErr := h.coachService.GetSchoolTeams(c.Context(), userID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, teams)
}

func (h *CoachHandler) GetResults(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	tournamentIDStr := c.Query("tournament_id", "")
	var tournamentID *uuid.UUID
	if tournamentIDStr != "" {
		id, err := uuid.Parse(tournamentIDStr)
		if err != nil {
			return response.BadRequest(c, "Tournament ID tidak valid")
		}
		tournamentID = &id
	}

	dashboards, svcErr := h.coachService.GetSchoolResults(c.Context(), userID, tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, dashboards)
}

func (h *CoachHandler) GetSubmissions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	subs, svcErr := h.coachService.GetCoachSubmissions(c.Context(), userID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, subs)
}

func (h *CoachHandler) AssignSchool(c *fiber.Ctx) error {
	coachUserIDStr := c.Params("userId")
	coachUserID, err := uuid.Parse(coachUserIDStr)
	if err != nil {
		return response.BadRequest(c, "User ID tidak valid")
	}

	var req assignSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	schoolID, err := uuid.Parse(req.SchoolID)
	if err != nil {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"school_id": "School ID tidak valid",
		}))
	}

	if svcErr := h.coachService.AssignSchool(c.Context(), coachUserID, schoolID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, fiber.Map{
		"message": "Coach berhasil ditugaskan ke sekolah",
	})
}

func (h *CoachHandler) ListCoaches(c *fiber.Ctx) error {
	// For now, return a simple message. Full implementation would query users with coach role
	// and their assigned schools. This is a placeholder for the route.
	return response.OK(c, fiber.Map{
		"message": "List coaches endpoint - to be enhanced with user queries",
	})
}
