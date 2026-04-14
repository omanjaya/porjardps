package handler

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type EventAnnouncementHandler struct {
	svc       *service.EventAnnouncementService
	eventRepo model.EventRepository
}

func NewEventAnnouncementHandler(svc *service.EventAnnouncementService, eventRepo model.EventRepository) *EventAnnouncementHandler {
	return &EventAnnouncementHandler{svc: svc, eventRepo: eventRepo}
}

func (h *EventAnnouncementHandler) RegisterRoutes(api fiber.Router, authMw, adminMw fiber.Handler) {
	api.Get("/events/:slug/announcements", h.ListByEventSlug)
	api.Get("/announcements/active", h.ListActive)
	api.Post("/admin/events/:eventId/announcements", authMw, adminMw, h.Create)
	api.Delete("/admin/announcements/:id", authMw, adminMw, h.Delete)
}

func (h *EventAnnouncementHandler) ListByEventSlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	event, err := h.eventRepo.FindBySlug(c.Context(), slug)
	if err != nil {
		return response.HandleError(c, err)
	}
	if event == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}
	items, err := h.svc.List(c.Context(), event.ID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if items == nil {
		items = []*model.EventAnnouncement{}
	}
	return response.OK(c, items)
}

func (h *EventAnnouncementHandler) ListActive(c *fiber.Ctx) error {
	items, err := h.svc.ListActive(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}
	if items == nil {
		items = []*model.EventAnnouncement{}
	}
	return response.OK(c, items)
}

type createAnnouncementRequest struct {
	Title     string     `json:"title"`
	Message   string     `json:"message"`
	Priority  string     `json:"priority"`
	ExpiresAt *time.Time `json:"expires_at"`
}

func (h *EventAnnouncementHandler) Create(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("eventId"))
	if err != nil {
		return response.BadRequest(c, "Event ID tidak valid")
	}
	var req createAnnouncementRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if len(req.Title) > 255 {
		return response.BadRequest(c, "Judul terlalu panjang (maks 255 karakter)")
	}
	if len(req.Message) > 2000 {
		return response.BadRequest(c, "Pesan terlalu panjang (maks 2000 karakter)")
	}
	if req.ExpiresAt != nil && !req.ExpiresAt.After(time.Now()) {
		return response.BadRequest(c, "Tanggal kadaluarsa harus di masa depan")
	}
	var createdBy *uuid.UUID
	if uidStr, ok := c.Locals("userID").(string); ok && uidStr != "" {
		if uid, err := uuid.Parse(uidStr); err == nil {
			createdBy = &uid
		}
	}
	a, err := h.svc.Create(c.Context(), service.CreateAnnouncementInput{
		EventID:   eventID,
		Title:     req.Title,
		Message:   req.Message,
		Priority:  req.Priority,
		ExpiresAt: req.ExpiresAt,
		CreatedBy: createdBy,
	})
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.Created(c, a)
}

func (h *EventAnnouncementHandler) Delete(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}
	if err := h.svc.Delete(c.Context(), id); err != nil {
		return response.HandleError(c, err)
	}
	return response.NoContent(c)
}
