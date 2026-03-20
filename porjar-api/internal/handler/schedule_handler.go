package handler

import (
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/validator"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type ScheduleHandler struct {
	scheduleService *service.ScheduleService
}

func NewScheduleHandler(scheduleService *service.ScheduleService) *ScheduleHandler {
	return &ScheduleHandler{scheduleService: scheduleService}
}

func (h *ScheduleHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, publicRL fiber.Handler) {
	// Public routes (rate limited)
	app.Get("/schedules", publicRL, h.List)
	app.Get("/schedules/today", h.GetToday)
	app.Get("/schedules/upcoming", h.GetUpcoming)

	// Admin routes
	app.Post("/admin/schedules", authMw, adminMw, h.Create)
	app.Put("/admin/schedules/:id", authMw, adminMw, h.Update)
	app.Delete("/admin/schedules/:id", authMw, adminMw, h.Delete)
}

type createScheduleRequest struct {
	TournamentID   string  `json:"tournament_id"`
	BracketMatchID *string `json:"bracket_match_id"`
	BRLobbyID      *string `json:"br_lobby_id"`
	Title          string  `json:"title"`
	Description    *string `json:"description"`
	Venue          *string `json:"venue"`
	ScheduledAt    string  `json:"scheduled_at"`
	EndAt          *string `json:"end_at"`
	Status         *string `json:"status"`
}

func (h *ScheduleHandler) Create(c *fiber.Ctx) error {
	var req createScheduleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	tournamentID, err := uuid.Parse(req.TournamentID)
	if err != nil {
		details["tournament_id"] = "Tournament ID tidak valid"
	}
	if !validator.ValidateStringLength(req.Title, 3, 200) {
		details["title"] = "Judul jadwal harus 3-200 karakter"
	}
	scheduledAt, err := parseTime(req.ScheduledAt)
	if err != nil {
		details["scheduled_at"] = "Format waktu tidak valid (gunakan RFC3339 atau YYYY-MM-DD)"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	input := service.CreateScheduleInput{
		TournamentID: tournamentID,
		Title:        validator.TrimString(req.Title),
		Description:  req.Description,
		Venue:        req.Venue,
		ScheduledAt:  scheduledAt,
	}

	if req.BracketMatchID != nil {
		if id, err := uuid.Parse(*req.BracketMatchID); err == nil {
			input.BracketMatchID = &id
		}
	}
	if req.BRLobbyID != nil {
		if id, err := uuid.Parse(*req.BRLobbyID); err == nil {
			input.BRLobbyID = &id
		}
	}
	if req.EndAt != nil {
		if t, err := parseTime(*req.EndAt); err == nil {
			input.EndAt = &t
		}
	}
	if req.Status != nil {
		input.Status = *req.Status
	}

	schedule, svcErr := h.scheduleService.Create(c.Context(), input)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, schedule)
}

type updateScheduleRequest struct {
	TournamentID   *string `json:"tournament_id"`
	BracketMatchID *string `json:"bracket_match_id"`
	BRLobbyID      *string `json:"br_lobby_id"`
	Title          *string `json:"title"`
	Description    *string `json:"description"`
	Venue          *string `json:"venue"`
	ScheduledAt    *string `json:"scheduled_at"`
	EndAt          *string `json:"end_at"`
	Status         *string `json:"status"`
}

func (h *ScheduleHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req updateScheduleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Title != nil && !validator.ValidateStringLength(*req.Title, 3, 200) {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"title": "Judul jadwal harus 3-200 karakter",
		}))
	}

	input := service.UpdateScheduleInput{
		Title:       req.Title,
		Description: req.Description,
		Venue:       req.Venue,
		Status:      req.Status,
	}

	if req.TournamentID != nil {
		if tid, err := uuid.Parse(*req.TournamentID); err == nil {
			input.TournamentID = &tid
		}
	}
	if req.BracketMatchID != nil {
		if bmid, err := uuid.Parse(*req.BracketMatchID); err == nil {
			input.BracketMatchID = &bmid
		}
	}
	if req.BRLobbyID != nil {
		if blid, err := uuid.Parse(*req.BRLobbyID); err == nil {
			input.BRLobbyID = &blid
		}
	}
	if req.ScheduledAt != nil {
		if t, err := parseTime(*req.ScheduledAt); err == nil {
			input.ScheduledAt = &t
		}
	}
	if req.EndAt != nil {
		if t, err := parseTime(*req.EndAt); err == nil {
			input.EndAt = &t
		}
	}

	schedule, svcErr := h.scheduleService.Update(c.Context(), id, input)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, schedule)
}

func (h *ScheduleHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	if svcErr := h.scheduleService.Delete(c.Context(), id); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.NoContent(c)
}

func (h *ScheduleHandler) List(c *fiber.Ctx) error {
	filter := model.ScheduleFilter{
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
	if tid := c.Query("tournament_id"); tid != "" {
		if id, err := uuid.Parse(tid); err == nil {
			filter.TournamentID = &id
		}
	}
	if st := c.Query("status"); st != "" {
		filter.Status = &st
	}
	if from := c.Query("from"); from != "" {
		if t, err := parseTime(from); err == nil {
			filter.From = &t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := parseTime(to); err == nil {
			filter.To = &t
		}
	}

	schedules, total, err := h.scheduleService.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, err)
	}
	if schedules == nil {
		schedules = []*model.Schedule{}
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.Limit)))
	return response.Paginated(c, schedules, response.Meta{
		Page:       filter.Page,
		PerPage:    filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *ScheduleHandler) GetToday(c *fiber.Ctx) error {
	schedules, err := h.scheduleService.GetToday(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, schedules)
}

func (h *ScheduleHandler) GetUpcoming(c *fiber.Ctx) error {
	limit := 5
	if l := c.Query("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 && v <= 50 {
			limit = v
		}
	}

	schedules, err := h.scheduleService.GetUpcoming(c.Context(), limit)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, schedules)
}
