package handler

import (
	"math"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type NewsHandler struct {
	service *service.NewsService
}

func NewNewsHandler(svc *service.NewsService) *NewsHandler {
	return &NewsHandler{service: svc}
}

func (h *NewsHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/news", h.List)
	app.Get("/news/:slug", h.GetBySlug)
	app.Post("/news", authMw, adminMw, h.Create)
	app.Put("/news/:id", authMw, adminMw, h.Update)
	app.Delete("/news/:id", authMw, adminMw, h.Delete)
}

func (h *NewsHandler) List(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	perPage, _ := strconv.Atoi(c.Query("per_page", "20"))
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	items, total, err := h.service.List(c.Context(), page, perPage)
	if err != nil {
		return response.HandleError(c, err)
	}
	if items == nil {
		items = []*model.News{}
	}

	return response.Paginated(c, items, response.Meta{
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: int(math.Ceil(float64(total) / float64(perPage))),
	})
}

func (h *NewsHandler) GetBySlug(c *fiber.Ctx) error {
	slug := strings.TrimSpace(c.Params("slug"))
	if slug == "" {
		return response.BadRequest(c, "Slug tidak valid")
	}
	n, err := h.service.GetBySlug(c.Context(), slug)
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, n)
}

type newsBody struct {
	Title       string  `json:"title"`
	Slug        string  `json:"slug"`
	Excerpt     string  `json:"excerpt"`
	Content     string  `json:"content"`
	Category    string  `json:"category"`
	ImageURL    *string `json:"image_url"`
	PublishedAt string  `json:"published_at"`
}

func (h *NewsHandler) Create(c *fiber.Ctx) error {
	var req newsBody
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Slug) == "" {
		return response.BadRequest(c, "Title dan slug wajib diisi")
	}
	n := &model.News{
		Title:    strings.TrimSpace(req.Title),
		Slug:     strings.TrimSpace(req.Slug),
		Excerpt:  req.Excerpt,
		Content:  req.Content,
		Category: req.Category,
		ImageURL: req.ImageURL,
	}
	if err := h.service.Create(c.Context(), n); err != nil {
		return response.HandleError(c, err)
	}
	return response.Created(c, n)
}

func (h *NewsHandler) Update(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}
	var req newsBody
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	existing, err := h.service.GetByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, err)
	}
	if req.Title != "" {
		existing.Title = req.Title
	}
	if req.Slug != "" {
		existing.Slug = req.Slug
	}
	existing.Excerpt = req.Excerpt
	existing.Content = req.Content
	if req.Category != "" {
		existing.Category = req.Category
	}
	existing.ImageURL = req.ImageURL
	if err := h.service.Update(c.Context(), existing); err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, existing)
}

func (h *NewsHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}
	if err := h.service.Delete(c.Context(), id); err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, fiber.Map{"message": "Berita dihapus"})
}
