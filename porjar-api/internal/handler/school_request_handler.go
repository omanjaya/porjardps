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
	"github.com/porjar-denpasar/porjar-api/internal/pkg/validator"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type SchoolRequestHandler struct {
	service *service.SchoolRequestService
}

func NewSchoolRequestHandler(svc *service.SchoolRequestService) *SchoolRequestHandler {
	return &SchoolRequestHandler{service: svc}
}

func (h *SchoolRequestHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Player
	app.Post("/school-requests", authMw, h.Create)
	// Admin
	app.Get("/admin/school-requests", authMw, adminMw, h.List)
	app.Post("/admin/school-requests/:id/approve", authMw, adminMw, h.Approve)
	app.Post("/admin/school-requests/:id/reject", authMw, adminMw, h.Reject)
}

type createSchoolRequestBody struct {
	Name  string `json:"name"`
	Level string `json:"level"`
}

func (h *SchoolRequestHandler) Create(c *fiber.Ctx) error {
	var req createSchoolRequestBody
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	if !validator.ValidateStringLength(req.Name, 3, 100) {
		details["name"] = "Nama sekolah harus 3-100 karakter"
	}
	validLevels := map[string]bool{"SD": true, "SMP": true, "SMA": true, "SMK": true, "MTs": true, "MA": true}
	if !validLevels[req.Level] {
		details["level"] = "Jenjang tidak valid"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	userID := middleware.GetUserID(c)
	sr, err := h.service.Create(c.Context(), validator.TrimString(req.Name), req.Level, userID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Created(c, sr)
}

func (h *SchoolRequestHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("per_page", "20"))
	if limit > 100 {
		limit = 100
	}

	filter := model.SchoolRequestFilter{
		Page:  page,
		Limit: limit,
	}
	if s := c.Query("status"); s != "" {
		filter.Status = &s
	}

	requests, total, err := h.service.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Paginated(c, requests, response.Meta{
		Page:       page,
		PerPage:    limit,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(limit))),
	})
}

type approveSchoolRequestBody struct {
	City string `json:"city"`
}

func (h *SchoolRequestHandler) Approve(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req approveSchoolRequestBody
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.City == "" {
		req.City = "Denpasar"
	}

	school, err := h.service.Approve(c.Context(), id, validator.TrimString(req.City))
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, school)
}

type rejectSchoolRequestBody struct {
	Reason string `json:"reason"`
}

func (h *SchoolRequestHandler) Reject(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req rejectSchoolRequestBody
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.Reason == "" {
		return response.BadRequest(c, "Alasan penolakan wajib diisi")
	}

	if err := h.service.Reject(c.Context(), id, req.Reason); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Permintaan ditolak"})
}
