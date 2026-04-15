package handler

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type EventSectionHandler struct {
	eventRepo   model.EventRepository
	sectionRepo model.EventSectionRepository
}

func NewEventSectionHandler(eventRepo model.EventRepository, sectionRepo model.EventSectionRepository) *EventSectionHandler {
	return &EventSectionHandler{eventRepo: eventRepo, sectionRepo: sectionRepo}
}

func (h *EventSectionHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Public — returns only enabled sections
	app.Get("/events/:slug/sections", h.ListPublic)

	// Admin — returns all sections
	app.Get("/admin/events/:id/sections", authMw, adminMw, h.ListAdmin)
	app.Post("/admin/events/:id/sections", authMw, adminMw, h.Create)
	app.Put("/admin/events/:id/sections/reorder", authMw, adminMw, h.Reorder)
	app.Put("/admin/events/:id/sections/:sectionId", authMw, adminMw, h.Update)
	app.Delete("/admin/events/:id/sections/:sectionId", authMw, adminMw, h.Delete)
}

// ListPublic returns enabled sections for a public event (identified by slug).
func (h *EventSectionHandler) ListPublic(c *fiber.Ctx) error {
	slug := c.Params("slug")
	event, err := h.eventRepo.FindBySlug(c.Context(), slug)
	if err != nil {
		return response.HandleError(c, err)
	}
	if event == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}

	sections, err := h.sectionRepo.ListByEvent(c.Context(), event.ID, true)
	if err != nil {
		return response.HandleError(c, err)
	}
	if sections == nil {
		sections = []*model.EventSection{}
	}
	return response.OK(c, sections)
}

// ListAdmin returns all sections (including disabled) for an event.
func (h *EventSectionHandler) ListAdmin(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	event, err := h.eventRepo.FindByID(c.Context(), eventID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if event == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}

	sections, err := h.sectionRepo.ListByEvent(c.Context(), eventID, false)
	if err != nil {
		return response.HandleError(c, err)
	}
	if sections == nil {
		sections = []*model.EventSection{}
	}
	return response.OK(c, sections)
}

type createSectionRequest struct {
	SectionType string          `json:"section_type"`
	SortOrder   int             `json:"sort_order"`
	Enabled     bool            `json:"enabled"`
	Config      json.RawMessage `json:"config"`
}

// Create adds a new section to an event.
func (h *EventSectionHandler) Create(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	event, err := h.eventRepo.FindByID(c.Context(), eventID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if event == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}

	var req createSectionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.SectionType == "" {
		return response.BadRequest(c, "section_type wajib diisi")
	}

	now := time.Now()
	cfg := req.Config
	if len(cfg) == 0 {
		cfg = json.RawMessage("{}")
	}

	section := &model.EventSection{
		ID:          uuid.New(),
		EventID:     eventID,
		SectionType: req.SectionType,
		SortOrder:   req.SortOrder,
		Enabled:     req.Enabled,
		Config:      cfg,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.sectionRepo.Create(c.Context(), section); err != nil {
		return response.HandleError(c, err)
	}
	return response.Created(c, section)
}

type updateSectionRequest struct {
	SectionType string          `json:"section_type"`
	SortOrder   int             `json:"sort_order"`
	Enabled     bool            `json:"enabled"`
	Config      json.RawMessage `json:"config"`
}

// Update modifies a section.
func (h *EventSectionHandler) Update(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	sectionID, err := uuid.Parse(c.Params("sectionId"))
	if err != nil {
		return response.BadRequest(c, "ID section tidak valid")
	}

	existing, err := h.sectionRepo.FindByID(c.Context(), sectionID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if existing == nil || existing.EventID != eventID {
		return response.NotFound(c, "Section tidak ditemukan")
	}

	var req updateSectionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.SectionType == "" {
		return response.BadRequest(c, "section_type wajib diisi")
	}

	cfg := req.Config
	if len(cfg) == 0 {
		cfg = json.RawMessage("{}")
	}

	existing.SectionType = req.SectionType
	existing.SortOrder = req.SortOrder
	existing.Enabled = req.Enabled
	existing.Config = cfg
	existing.UpdatedAt = time.Now()

	if err := h.sectionRepo.Update(c.Context(), existing); err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, existing)
}

// Delete removes a section.
func (h *EventSectionHandler) Delete(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	sectionID, err := uuid.Parse(c.Params("sectionId"))
	if err != nil {
		return response.BadRequest(c, "ID section tidak valid")
	}

	existing, err := h.sectionRepo.FindByID(c.Context(), sectionID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if existing == nil || existing.EventID != eventID {
		return response.NotFound(c, "Section tidak ditemukan")
	}

	if err := h.sectionRepo.Delete(c.Context(), sectionID); err != nil {
		return response.HandleError(c, err)
	}
	return response.NoContent(c)
}

type reorderSectionsRequest struct {
	OrderedIDs []uuid.UUID `json:"ordered_ids"`
}

// Reorder updates sort_order for a list of sections.
func (h *EventSectionHandler) Reorder(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	var req reorderSectionsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if len(req.OrderedIDs) == 0 {
		return response.BadRequest(c, "ordered_ids tidak boleh kosong")
	}

	if err := h.sectionRepo.Reorder(c.Context(), eventID, req.OrderedIDs); err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, fiber.Map{"message": "Urutan section berhasil diperbarui"})
}
