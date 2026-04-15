package handler

import (
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type CoachHandler struct {
	coachService    *service.CoachService
	userRepo        model.UserRepository
	schoolRepo      model.SchoolRepository
	coachSchoolRepo model.CoachSchoolRepository
}

func NewCoachHandler(coachService *service.CoachService) *CoachHandler {
	return &CoachHandler{coachService: coachService}
}

// SetRepositories wires repositories used by admin coach-management endpoints.
// Optional: ListCoaches gracefully returns an empty list when not configured.
func (h *CoachHandler) SetRepositories(userRepo model.UserRepository, schoolRepo model.SchoolRepository, coachSchoolRepo model.CoachSchoolRepository) {
	h.userRepo = userRepo
	h.schoolRepo = schoolRepo
	h.coachSchoolRepo = coachSchoolRepo
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

// coachListItem is the admin-facing shape for /admin/coaches.
// Exposes identity + contact info + associated school (if any).
type coachListItem struct {
	ID       uuid.UUID      `json:"id"`
	FullName string         `json:"full_name"`
	Email    string         `json:"email"`
	Phone    *string        `json:"phone"`
	Schools  []*model.School `json:"schools"`
}

func (h *CoachHandler) ListCoaches(c *fiber.Ctx) error {
	if h.userRepo == nil {
		// Defensive fallback — dependencies not wired. Return empty list rather than 500.
		return response.OK(c, []coachListItem{})
	}

	// Pagination
	page := 1
	limit := 50
	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 && v <= 10000 {
			page = v
		}
	}
	if pp := c.Query("per_page"); pp != "" {
		if v, err := strconv.Atoi(pp); err == nil && v > 0 && v <= 200 {
			limit = v
		}
	}

	role := "coach"
	filter := model.UserFilter{
		Role:  &role,
		Page:  page,
		Limit: limit,
	}
	if search := c.Query("search"); len(search) >= 2 {
		filter.Search = &search
	}

	coaches, total, err := h.userRepo.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "list coaches"))
	}

	results := make([]coachListItem, 0, len(coaches))
	for _, u := range coaches {
		item := coachListItem{
			ID:       u.ID,
			FullName: u.FullName,
			Email:    u.Email,
			Phone:    u.Phone,
			Schools:  []*model.School{},
		}

		// Populate associated schools (best-effort; don't fail the list on lookup errors).
		if h.coachSchoolRepo != nil && h.schoolRepo != nil {
			assignments, err := h.coachSchoolRepo.FindByUser(c.Context(), u.ID)
			if err == nil {
				for _, cs := range assignments {
					school, err := h.schoolRepo.FindByID(c.Context(), cs.SchoolID)
					if err != nil || school == nil {
						continue
					}
					item.Schools = append(item.Schools, school)
				}
			}
		}

		results = append(results, item)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	return response.Paginated(c, results, response.Meta{
		Page:       page,
		PerPage:    limit,
		Total:      total,
		TotalPages: totalPages,
	})
}
