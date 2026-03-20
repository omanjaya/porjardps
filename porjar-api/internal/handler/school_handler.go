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

type SchoolHandler struct {
	schoolService *service.SchoolService
}

func NewSchoolHandler(schoolService *service.SchoolService) *SchoolHandler {
	return &SchoolHandler{schoolService: schoolService}
}

func (h *SchoolHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, publicRL fiber.Handler) {
	// Public (rate limited)
	app.Get("/schools", publicRL, h.List)
	// Admin
	app.Get("/admin/schools", authMw, adminMw, h.List)
	app.Post("/admin/schools", authMw, adminMw, h.Create)
	app.Put("/admin/schools/:id", authMw, adminMw, h.Update)
	app.Get("/admin/schools/:id", authMw, adminMw, h.GetByID)
	app.Delete("/admin/schools/:id", authMw, adminMw, h.Delete)
}

type createSchoolRequest struct {
	Name    string  `json:"name"`
	Level   string  `json:"level"`
	City    string  `json:"city"`
	Address *string `json:"address"`
}

func (h *SchoolHandler) Create(c *fiber.Ctx) error {
	var req createSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	if !validator.ValidateStringLength(req.Name, 3, 100) {
		details["name"] = "Nama sekolah harus 3-100 karakter"
	}
	if req.Level == "" {
		details["level"] = "Level wajib diisi"
	}
	if !validator.ValidateStringLength(req.City, 2, 50) {
		details["city"] = "Kota harus 2-50 karakter"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	school, err := h.schoolService.Create(
		c.Context(),
		validator.TrimString(req.Name),
		req.Level,
		validator.TrimString(req.City),
		req.Address,
	)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Created(c, school)
}

func (h *SchoolHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	school, svcErr := h.schoolService.GetByID(c.Context(), id)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, school)
}

type updateSchoolRequest struct {
	Name    *string `json:"name"`
	Level   *string `json:"level"`
	City    *string `json:"city"`
	Address *string `json:"address"`
	LogoURL *string `json:"logo_url"`
}

func (h *SchoolHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req updateSchoolRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Name != nil && !validator.ValidateStringLength(*req.Name, 3, 100) {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"name": "Nama sekolah harus 3-100 karakter",
		}))
	}

	// Trim name if provided
	if req.Name != nil {
		trimmed := validator.TrimString(*req.Name)
		req.Name = &trimmed
	}

	school, svcErr := h.schoolService.Update(c.Context(), id, req.Name, req.Level, req.City, req.Address, req.LogoURL)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, school)
}

func (h *SchoolHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	if svcErr := h.schoolService.Delete(c.Context(), id); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.NoContent(c)
}

func (h *SchoolHandler) List(c *fiber.Ctx) error {
	filter := model.SchoolFilter{
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
	if lv := c.Query("level"); lv != "" {
		filter.Level = &lv
	}
	if s := c.Query("search"); s != "" {
		trimmed := validator.TrimString(s)
		if len(trimmed) >= 2 {
			filter.Search = &trimmed
		}
	}

	schools, total, err := h.schoolService.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.Limit)))
	return response.Paginated(c, schools, response.Meta{
		Page:       filter.Page,
		PerPage:    filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	})
}
