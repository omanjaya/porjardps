package handler

import (
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type EventPointsHandler struct {
	service *service.EventPointsService
}

func NewEventPointsHandler(svc *service.EventPointsService) *EventPointsHandler {
	return &EventPointsHandler{service: svc}
}

func (h *EventPointsHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, publicRL, eventScopeMw fiber.Handler) {
	// Public: leaderboards
	app.Get("/leaderboards/teams", publicRL, h.TeamLeaderboard)
	app.Get("/leaderboards/users", publicRL, h.UserLeaderboard)
	app.Get("/leaderboards/schools", publicRL, h.SchoolLeaderboard)

	// Public: event registrations
	app.Get("/events/:eventId/registrations", publicRL, h.ListRegistrations)

	// Authenticated: register team to event
	app.Post("/events/:eventId/register", authMw, h.RegisterTeam)

	// Authenticated: user's own data
	app.Get("/my-points", authMw, h.GetMyPoints)
	app.Get("/my-events", authMw, h.GetMyEvents)

	// Admin: point rule management
	app.Get("/admin/events/:eventId/point-rules", authMw, adminMw, eventScopeMw, h.GetPointRules)
	app.Put("/admin/events/:eventId/point-rules", authMw, adminMw, eventScopeMw, h.UpdatePointRules)

	// Admin: manual point distribution (tournament-scoped param, not event)
	app.Post("/admin/tournaments/:id/distribute-points", authMw, adminMw, h.DistributePoints)

	// Admin: auto-assign event registrations to tournament
	app.Post("/admin/events/:eventId/auto-assign/:tournamentId", authMw, adminMw, eventScopeMw, h.AutoAssignToTournament)

	// Admin: remove registration
	app.Delete("/admin/events/:eventId/registrations/:teamId", authMw, adminMw, eventScopeMw, h.RemoveRegistration)
}

// ──────────────────────────────────────────────
// Leaderboards
// ──────────────────────────────────────────────

func (h *EventPointsHandler) TeamLeaderboard(c *fiber.Ctx) error {
	limit, offset := parsePagination(c)
	eventID := parseOptionalUUID(c.Query("event_id"))

	entries, total, err := h.service.TeamLeaderboard(c.Context(), eventID, limit, offset)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Paginated(c, entries, response.Meta{
		Page:       (offset / limit) + 1,
		PerPage:    limit,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (h *EventPointsHandler) UserLeaderboard(c *fiber.Ctx) error {
	limit, offset := parsePagination(c)
	eventID := parseOptionalUUID(c.Query("event_id"))

	entries, total, err := h.service.UserLeaderboard(c.Context(), eventID, limit, offset)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Paginated(c, entries, response.Meta{
		Page:       (offset / limit) + 1,
		PerPage:    limit,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(limit))),
	})
}

func (h *EventPointsHandler) SchoolLeaderboard(c *fiber.Ctx) error {
	limit, offset := parsePagination(c)
	eventID := parseOptionalUUID(c.Query("event_id"))

	entries, total, err := h.service.SchoolLeaderboard(c.Context(), eventID, limit, offset)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Paginated(c, entries, response.Meta{
		Page:       (offset / limit) + 1,
		PerPage:    limit,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(limit))),
	})
}

// ──────────────────────────────────────────────
// Event Registrations
// ──────────────────────────────────────────────

func (h *EventPointsHandler) ListRegistrations(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("eventId"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	regs, count, err := h.service.GetRegistrations(c.Context(), eventID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{
		"registrations": regs,
		"count":         count,
	})
}

func (h *EventPointsHandler) RegisterTeam(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("eventId"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	var req struct {
		TeamID uuid.UUID `json:"team_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.TeamID == uuid.Nil {
		return response.BadRequest(c, "team_id wajib diisi")
	}

	userID := middleware.GetUserID(c)
	reg, err := h.service.RegisterTeam(c.Context(), eventID, req.TeamID, userID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Created(c, reg)
}

func (h *EventPointsHandler) RemoveRegistration(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("eventId"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}
	teamID, err := uuid.Parse(c.Params("teamId"))
	if err != nil {
		return response.BadRequest(c, "ID tim tidak valid")
	}

	if err := h.service.RemoveRegistration(c.Context(), eventID, teamID); err != nil {
		return response.HandleError(c, err)
	}

	return response.NoContent(c)
}

// ──────────────────────────────────────────────
// Point Rules (Admin)
// ──────────────────────────────────────────────

func (h *EventPointsHandler) GetPointRules(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("eventId"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	rules, err := h.service.GetPointRules(c.Context(), eventID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, rules)
}

func (h *EventPointsHandler) UpdatePointRules(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("eventId"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	var req struct {
		Rules []service.PointRuleInput `json:"rules"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if err := h.service.UpdatePointRules(c.Context(), eventID, req.Rules); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Point rules berhasil diperbarui"})
}

// ──────────────────────────────────────────────
// Point Distribution (Admin)
// ──────────────────────────────────────────────

func (h *EventPointsHandler) DistributePoints(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tournament tidak valid")
	}

	if err := h.service.DistributePoints(c.Context(), tournamentID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Point berhasil didistribusikan"})
}

// ──────────────────────────────────────────────
// Auto-Assign (Admin)
// ──────────────────────────────────────────────

func (h *EventPointsHandler) AutoAssignToTournament(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("eventId"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}
	tournamentID, err := uuid.Parse(c.Params("tournamentId"))
	if err != nil {
		return response.BadRequest(c, "ID tournament tidak valid")
	}

	assigned, err := h.service.AutoAssignToTournament(c.Context(), eventID, tournamentID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{
		"message":  "Tim berhasil di-assign ke tournament",
		"assigned": assigned,
	})
}

// ──────────────────────────────────────────────
// My Points (Authenticated)
// ──────────────────────────────────────────────

func (h *EventPointsHandler) GetMyPoints(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	points, err := h.service.GetMyPoints(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, points)
}

func (h *EventPointsHandler) GetMyEvents(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	events, err := h.service.GetMyEvents(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, events)
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

func parsePagination(c *fiber.Ctx) (limit, offset int) {
	limit = 50
	if l, err := strconv.Atoi(c.Query("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	page := 1
	if p, err := strconv.Atoi(c.Query("page")); err == nil && p > 0 {
		page = p
	}
	offset = (page - 1) * limit
	return
}

func parseOptionalUUID(s string) *uuid.UUID {
	if s == "" {
		return nil
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return nil
	}
	return &id
}
