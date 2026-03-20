package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type MediaHandler struct {
	mediaRepo model.MediaRepository
}

func NewMediaHandler(mediaRepo model.MediaRepository) *MediaHandler {
	return &MediaHandler{mediaRepo: mediaRepo}
}

func (h *MediaHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Public routes
	app.Get("/media", h.GetByEntity)
	app.Get("/media/highlights", h.GetHighlights)

	// Admin routes
	app.Post("/admin/media", authMw, adminMw, h.Create)
	app.Put("/admin/media/:id", authMw, adminMw, h.Update)
	app.Delete("/admin/media/:id", authMw, adminMw, h.Delete)
}

type createMediaRequest struct {
	EntityType   string  `json:"entity_type"`
	EntityID     *string `json:"entity_id"`
	FileURL      string  `json:"file_url"`
	ThumbnailURL *string `json:"thumbnail_url"`
	FileType     string  `json:"file_type"`
	Title        *string `json:"title"`
	Description  *string `json:"description"`
	IsHighlight  bool    `json:"is_highlight"`
	SortOrder    int     `json:"sort_order"`
}

func (h *MediaHandler) Create(c *fiber.Ctx) error {
	var req createMediaRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate entity_type
	validTypes := map[string]bool{"match": true, "tournament": true, "team": true, "lobby": true, "general": true}
	if !validTypes[req.EntityType] {
		return response.BadRequest(c, "entity_type tidak valid")
	}

	// Validate file_type
	validFileTypes := map[string]bool{"image": true, "video_link": true}
	if !validFileTypes[req.FileType] {
		return response.BadRequest(c, "file_type tidak valid")
	}

	if req.FileURL == "" {
		return response.BadRequest(c, "file_url wajib diisi")
	}

	userID := middleware.GetUserID(c)

	m := &model.Media{
		UploadedBy:   &userID,
		EntityType:   req.EntityType,
		FileURL:      req.FileURL,
		ThumbnailURL: req.ThumbnailURL,
		FileType:     req.FileType,
		Title:        req.Title,
		Description:  req.Description,
		IsHighlight:  req.IsHighlight,
		SortOrder:    req.SortOrder,
	}

	if req.EntityID != nil {
		id, err := uuid.Parse(*req.EntityID)
		if err != nil {
			return response.BadRequest(c, "entity_id tidak valid")
		}
		m.EntityID = &id
	}

	result, err := h.mediaRepo.Create(c.Context(), m)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Created(c, result)
}

func (h *MediaHandler) GetByEntity(c *fiber.Ctx) error {
	entityType := c.Query("entity_type")
	entityIDStr := c.Query("entity_id")

	if entityType == "" || entityIDStr == "" {
		return response.BadRequest(c, "entity_type dan entity_id wajib diisi")
	}

	entityID, err := uuid.Parse(entityIDStr)
	if err != nil {
		return response.BadRequest(c, "entity_id tidak valid")
	}

	media, err := h.mediaRepo.FindByEntity(c.Context(), entityType, entityID)
	if err != nil {
		return response.HandleError(c, err)
	}

	if media == nil {
		media = []*model.Media{}
	}

	return response.OK(c, media)
}

func (h *MediaHandler) GetHighlights(c *fiber.Ctx) error {
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if limit <= 0 || limit > 50 {
		limit = 20
	}

	media, err := h.mediaRepo.FindHighlights(c.Context(), limit)
	if err != nil {
		return response.HandleError(c, err)
	}

	if media == nil {
		media = []*model.Media{}
	}

	return response.OK(c, media)
}

type updateMediaRequest struct {
	Title        *string `json:"title"`
	Description  *string `json:"description"`
	IsHighlight  *bool   `json:"is_highlight"`
	SortOrder    *int    `json:"sort_order"`
	ThumbnailURL *string `json:"thumbnail_url"`
}

func (h *MediaHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	existing, err := h.mediaRepo.FindByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, err)
	}
	if existing == nil {
		return response.HandleError(c, apperror.NotFound("media"))
	}

	var req updateMediaRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Title != nil {
		existing.Title = req.Title
	}
	if req.Description != nil {
		existing.Description = req.Description
	}
	if req.IsHighlight != nil {
		existing.IsHighlight = *req.IsHighlight
	}
	if req.SortOrder != nil {
		existing.SortOrder = *req.SortOrder
	}
	if req.ThumbnailURL != nil {
		existing.ThumbnailURL = req.ThumbnailURL
	}

	result, err := h.mediaRepo.Update(c.Context(), existing)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, result)
}

func (h *MediaHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	existing, err := h.mediaRepo.FindByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, err)
	}
	if existing == nil {
		return response.HandleError(c, apperror.NotFound("media"))
	}

	if err := h.mediaRepo.Delete(c.Context(), id); err != nil {
		return response.HandleError(c, err)
	}

	return response.NoContent(c)
}
