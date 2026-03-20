package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type EventSettingsHandler struct {
	repo model.EventSettingsRepository
}

func NewEventSettingsHandler(repo model.EventSettingsRepository) *EventSettingsHandler {
	return &EventSettingsHandler{repo: repo}
}

func (h *EventSettingsHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Public route
	app.Get("/event-settings", h.Get)

	// Admin route
	app.Put("/admin/event-settings", authMw, adminMw, h.Update)
}

func (h *EventSettingsHandler) Get(c *fiber.Ctx) error {
	settings, err := h.repo.Get(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, settings)
}

type updateEventSettingsRequest struct {
	EventName          string  `json:"event_name"`
	EventDescription   string  `json:"event_description"`
	EventLogoURL       *string `json:"event_logo_url"`
	EventBannerURL     *string `json:"event_banner_url"`
	Venue              string  `json:"venue"`
	City               string  `json:"city"`
	StartDate          *string `json:"start_date"`
	EndDate            *string `json:"end_date"`
	Organizer          string  `json:"organizer"`
	ContactPhone       *string `json:"contact_phone"`
	ContactEmail       *string `json:"contact_email"`
	InstagramURL       *string `json:"instagram_url"`
	Announcement       *string `json:"announcement"`
	AnnouncementActive bool    `json:"announcement_active"`
	RegistrationOpen   bool    `json:"registration_open"`
	RulesPublished     bool    `json:"rules_published"`
}

func (h *EventSettingsHandler) Update(c *fiber.Ctx) error {
	var req updateEventSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.EventName == "" {
		return response.BadRequest(c, "Nama event wajib diisi")
	}

	// Get existing to preserve ID
	existing, err := h.repo.Get(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}

	settings := &model.EventSettings{
		ID:                 existing.ID,
		EventName:          req.EventName,
		EventDescription:   req.EventDescription,
		EventLogoURL:       req.EventLogoURL,
		EventBannerURL:     req.EventBannerURL,
		Venue:              req.Venue,
		City:               req.City,
		StartDate:          req.StartDate,
		EndDate:            req.EndDate,
		Organizer:          req.Organizer,
		ContactPhone:       req.ContactPhone,
		ContactEmail:       req.ContactEmail,
		InstagramURL:       req.InstagramURL,
		Announcement:       req.Announcement,
		AnnouncementActive: req.AnnouncementActive,
		RegistrationOpen:   req.RegistrationOpen,
		RulesPublished:     req.RulesPublished,
	}

	result, err := h.repo.Update(c.Context(), settings)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, result)
}
