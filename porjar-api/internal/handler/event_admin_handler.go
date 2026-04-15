package handler

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type EventAdminHandler struct {
	eventRepo      model.EventRepository
	eventAdminRepo model.EventAdminRepository
}

func NewEventAdminHandler(eventRepo model.EventRepository, eventAdminRepo model.EventAdminRepository) *EventAdminHandler {
	return &EventAdminHandler{eventRepo: eventRepo, eventAdminRepo: eventAdminRepo}
}

func (h *EventAdminHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Event admins management
	app.Get("/admin/events/:id/admins", authMw, adminMw, h.List)
	app.Post("/admin/events/:id/admins", authMw, adminMw, h.Add)
	app.Delete("/admin/events/:id/admins/:userId", authMw, adminMw, h.Remove)

	// Logged-in user: list events they are admin of
	app.Get("/admin/me/events", authMw, h.MyEvents)
}

// List returns all admins assigned to an event.
func (h *EventAdminHandler) List(c *fiber.Ctx) error {
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

	admins, err := h.eventAdminRepo.ListByEvent(c.Context(), eventID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if admins == nil {
		admins = []*model.EventAdmin{}
	}
	return response.OK(c, admins)
}

type assignEventAdminRequest struct {
	UserID uuid.UUID `json:"user_id"`
}

// Add assigns a user as admin of an event.
func (h *EventAdminHandler) Add(c *fiber.Ctx) error {
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

	var req assignEventAdminRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.UserID == uuid.Nil {
		return response.BadRequest(c, "user_id wajib diisi")
	}

	callerID := middleware.GetUserID(c)
	ea := &model.EventAdmin{
		ID:         uuid.New(),
		EventID:    eventID,
		UserID:     req.UserID,
		AssignedBy: &callerID,
		CreatedAt:  time.Now(),
	}

	if err := h.eventAdminRepo.Add(c.Context(), ea); err != nil {
		return response.HandleError(c, err)
	}
	return response.Created(c, ea)
}

// Remove removes a user as admin from an event.
func (h *EventAdminHandler) Remove(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	userID, err := uuid.Parse(c.Params("userId"))
	if err != nil {
		return response.BadRequest(c, "ID user tidak valid")
	}

	event, err := h.eventRepo.FindByID(c.Context(), eventID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if event == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}

	if err := h.eventAdminRepo.Remove(c.Context(), eventID, userID); err != nil {
		return response.HandleError(c, err)
	}
	return response.NoContent(c)
}

// MyEvents returns the events that the currently logged-in user is admin of.
func (h *EventAdminHandler) MyEvents(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	events, err := h.eventAdminRepo.ListEventsByUser(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if events == nil {
		events = []*model.Event{}
	}
	return response.OK(c, events)
}
