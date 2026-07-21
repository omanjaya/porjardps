package handler

import (
	"context"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/validator"
)

// PointDistributor awards event points for a completed tournament. Satisfied by
// service.EventPointsService (and service.PointDistributor); defined locally here to
// avoid a handler->service import purely for an interface type.
type PointDistributor interface {
	DistributePoints(ctx context.Context, tournamentID uuid.UUID) error
}

type EventHandler struct {
	eventRepo        model.EventRepository
	tournamentRepo   model.TournamentRepository
	eventAdminRepo   model.EventAdminRepository
	pointDistributor PointDistributor
}

func NewEventHandler(eventRepo model.EventRepository, tournamentRepo model.TournamentRepository) *EventHandler {
	return &EventHandler{eventRepo: eventRepo, tournamentRepo: tournamentRepo}
}

func (h *EventHandler) SetEventAdminRepo(repo model.EventAdminRepository) {
	h.eventAdminRepo = repo
}

// SetPointDistributor wires the event-points distributor used to award points when
// this handler's event-completion cascade auto-completes child tournaments. Not
// required to be set — if nil, distribution is skipped (best-effort, matches the
// existing "tournament repo not available" nil-guard style below).
func (h *EventHandler) SetPointDistributor(pd PointDistributor) {
	h.pointDistributor = pd
}

// validEventTransitions defines allowed status transitions.
// Any status can also transition to "draft" (reset).
var validEventTransitions = map[string]string{
	"draft":     "published",
	"published": "ongoing",
	"ongoing":   "completed",
	"completed": "archived",
}

func isValidEventTransition(from, to string) bool {
	if to == "draft" {
		return true
	}
	return validEventTransitions[from] == to
}

func (h *EventHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, superadminMw, publicRL, eventScopeMw fiber.Handler) {
	// Public
	app.Get("/events", publicRL, h.ListPublished)
	app.Get("/events/:slug", publicRL, h.GetBySlug)
	// Admin
	app.Get("/admin/events", authMw, adminMw, h.List)
	app.Post("/admin/events", authMw, superadminMw, h.Create)
	app.Get("/admin/events/:id", authMw, adminMw, eventScopeMw, h.GetByID)
	app.Put("/admin/events/:id", authMw, adminMw, eventScopeMw, h.Update)
	app.Delete("/admin/events/:id", authMw, superadminMw, h.Delete)
}

type createEventRequest struct {
	Slug           string  `json:"slug"`
	Name           string  `json:"name"`
	ShortName      string  `json:"short_name"`
	Description    *string `json:"description"`
	PrimaryColor   string  `json:"primary_color"`
	Venue          *string `json:"venue"`
	City           *string `json:"city"`
	Organizer      *string `json:"organizer"`
	ContactPhone   *string `json:"contact_phone"`
	ContactEmail   *string `json:"contact_email"`
	InstagramURL   *string `json:"instagram_url"`
	RequiresSchool bool                       `json:"requires_school"`
	RulesContent   []model.EventRulesSection `json:"rules_content"`
}

type updateEventRequest struct {
	Slug               string     `json:"slug"`
	Name               string     `json:"name"`
	ShortName          string     `json:"short_name"`
	Description        *string    `json:"description"`
	LogoURL            *string    `json:"logo_url"`
	BannerURL          *string    `json:"banner_url"`
	PrimaryColor       string     `json:"primary_color"`
	SecondaryColor     *string    `json:"secondary_color"`
	Venue              *string    `json:"venue"`
	City               *string    `json:"city"`
	Organizer          *string    `json:"organizer"`
	StartDate          *time.Time `json:"start_date"`
	EndDate            *time.Time `json:"end_date"`
	RegistrationStart  *time.Time `json:"registration_start"`
	RegistrationEnd    *time.Time `json:"registration_end"`
	Status             string     `json:"status"`
	ContactPhone       *string    `json:"contact_phone"`
	ContactEmail       *string    `json:"contact_email"`
	InstagramURL       *string    `json:"instagram_url"`
	WebsiteURL         *string    `json:"website_url"`
	Announcement       *string    `json:"announcement"`
	AnnouncementActive bool       `json:"announcement_active"`
	RegistrationOpen   bool       `json:"registration_open"`
	RulesPublished     bool                      `json:"rules_published"`
	RulesContent       []model.EventRulesSection `json:"rules_content"`
	RequiresSchool     bool                      `json:"requires_school"`
	SortOrder          int                       `json:"sort_order"`
}

func (h *EventHandler) ListPublished(c *fiber.Ctx) error {
	events, err := h.eventRepo.ListPublished(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, events)
}

func (h *EventHandler) GetBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	event, err := h.eventRepo.FindBySlug(c.Context(), slug)
	if err != nil {
		return response.HandleError(c, err)
	}
	if event == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}

	// Draft/archived events are only visible to admin/superadmin; anonymous
	// visitors (and any other role) get the same 404 as a missing event.
	switch event.Status {
	case "published", "ongoing", "completed":
		// public
	default:
		role := middleware.GetUserRole(c)
		if role != model.RoleAdmin && role != model.RoleSuperAdmin {
			return response.NotFound(c, "Event tidak ditemukan")
		}
	}

	return response.OK(c, event)
}

func (h *EventHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}
	event, err := h.eventRepo.FindByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, err)
	}
	if event == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}
	return response.OK(c, event)
}

func (h *EventHandler) List(c *fiber.Ctx) error {
	filter := model.EventFilter{}
	if status := c.Query("status"); status != "" {
		filter.Status = &status
	}

	// Scope admin users to their assigned events
	if h.eventAdminRepo != nil {
		allowedIDs, ok := middleware.GetAllowedEventIDs(c, h.eventAdminRepo)
		if !ok {
			return nil
		}
		// nil means superadmin — no restriction; non-nil (even empty) means restrict
		if allowedIDs != nil {
			filter.IDs = allowedIDs
		}
	}

	events, err := h.eventRepo.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, events)
}

func (h *EventHandler) Create(c *fiber.Ctx) error {
	var req createEventRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	if !validator.ValidateStringLength(req.Name, 3, 100) {
		details["name"] = "Nama event harus 3-100 karakter"
	}
	if !validator.ValidateStringLength(req.Slug, 2, 50) {
		details["slug"] = "Slug harus 2-50 karakter"
	}
	if !validator.ValidateStringLength(req.ShortName, 2, 20) {
		details["short_name"] = "Nama singkat harus 2-20 karakter"
	}
	if req.Description != nil && len(*req.Description) > 5000 {
		details["description"] = "Deskripsi terlalu panjang (maks 5000 karakter)"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	now := time.Now()
	primaryColor := req.PrimaryColor
	if primaryColor == "" {
		primaryColor = "#000000"
	}

	event := &model.Event{
		ID:           uuid.New(),
		Slug:         validator.TrimString(req.Slug),
		Name:         validator.TrimString(req.Name),
		ShortName:    validator.TrimString(req.ShortName),
		Description:  req.Description,
		PrimaryColor: primaryColor,
		Venue:        req.Venue,
		City:         req.City,
		Organizer:    req.Organizer,
		Status:       "draft",
		ContactPhone:   req.ContactPhone,
		ContactEmail:   req.ContactEmail,
		InstagramURL:   req.InstagramURL,
		RequiresSchool: req.RequiresSchool,
		RulesContent:   req.RulesContent,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := h.eventRepo.Create(c.Context(), event); err != nil {
		return response.HandleError(c, err)
	}

	return response.Created(c, event)
}

func (h *EventHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	existing, err := h.eventRepo.FindByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, err)
	}
	if existing == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}

	var req updateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	if !validator.ValidateStringLength(req.Name, 3, 100) {
		details["name"] = "Nama event harus 3-100 karakter"
	}
	if !validator.ValidateStringLength(req.Slug, 2, 50) {
		details["slug"] = "Slug harus 2-50 karakter"
	}
	if !validator.ValidateStringLength(req.ShortName, 2, 20) {
		details["short_name"] = "Nama singkat harus 2-20 karakter"
	}
	if req.Description != nil && len(*req.Description) > 5000 {
		details["description"] = "Deskripsi terlalu panjang (maks 5000 karakter)"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	oldStatus := existing.Status

	// Status transition validation (soft — warn but don't block)
	if req.Status != oldStatus {
		if !isValidEventTransition(oldStatus, req.Status) {
			slog.Warn("invalid event status transition",
				"event_id", id,
				"from", oldStatus,
				"to", req.Status,
			)
		}
	}

	// Auto-close registration when completing
	if req.Status == "completed" {
		req.RegistrationOpen = false
	}

	existing.Slug = validator.TrimString(req.Slug)
	existing.Name = validator.TrimString(req.Name)
	existing.ShortName = validator.TrimString(req.ShortName)
	existing.Description = req.Description
	existing.LogoURL = req.LogoURL
	existing.BannerURL = req.BannerURL
	existing.PrimaryColor = req.PrimaryColor
	existing.SecondaryColor = req.SecondaryColor
	existing.Venue = req.Venue
	existing.City = req.City
	existing.Organizer = req.Organizer
	existing.StartDate = req.StartDate
	existing.EndDate = req.EndDate
	existing.RegistrationStart = req.RegistrationStart
	existing.RegistrationEnd = req.RegistrationEnd
	existing.Status = req.Status
	existing.ContactPhone = req.ContactPhone
	existing.ContactEmail = req.ContactEmail
	existing.InstagramURL = req.InstagramURL
	existing.WebsiteURL = req.WebsiteURL
	existing.Announcement = req.Announcement
	existing.AnnouncementActive = req.AnnouncementActive
	existing.RegistrationOpen = req.RegistrationOpen
	existing.RulesPublished = req.RulesPublished
	existing.RulesContent = req.RulesContent
	existing.RequiresSchool = req.RequiresSchool
	existing.SortOrder = req.SortOrder
	existing.UpdatedAt = time.Now()

	if err := h.eventRepo.Update(c.Context(), existing); err != nil {
		return response.HandleError(c, err)
	}

	// Cascade: auto-complete all tournaments under this event
	if req.Status == "completed" && oldStatus != "completed" {
		h.cascadeCompleteTournaments(c, id)
	}

	return response.OK(c, existing)
}

func (h *EventHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	existing, err := h.eventRepo.FindByID(c.Context(), id)
	if err != nil {
		return response.HandleError(c, err)
	}
	if existing == nil {
		return response.NotFound(c, "Event tidak ditemukan")
	}

	if err := h.eventRepo.Delete(c.Context(), id); err != nil {
		return response.HandleError(c, err)
	}

	return response.NoContent(c)
}

// cascadeCompleteTournaments sets all tournaments under the event to "completed".
// Best-effort: errors are logged but do not fail the event update.
func (h *EventHandler) cascadeCompleteTournaments(c *fiber.Ctx, eventID uuid.UUID) {
	if h.tournamentRepo == nil {
		slog.Warn("tournament repo not available for cascade completion", "event_id", eventID)
		return
	}

	tournaments, _, err := h.tournamentRepo.List(c.Context(), model.TournamentFilter{
		EventID: &eventID,
		Page:    1,
		Limit:   1000,
	})
	if err != nil {
		slog.Error("failed to list tournaments for cascade completion",
			"event_id", eventID,
			"error", err,
		)
		return
	}

	updated := 0
	for _, t := range tournaments {
		if t.Status == "completed" || t.Status == "archived" {
			continue
		}
		if err := h.tournamentRepo.UpdateStatus(c.Context(), t.ID, "completed"); err != nil {
			slog.Error("failed to cascade-complete tournament",
				"event_id", eventID,
				"tournament_id", t.ID,
				"tournament_name", t.Name,
				"error", err,
			)
			continue
		}
		updated++

		if h.pointDistributor != nil {
			if err := h.pointDistributor.DistributePoints(c.Context(), t.ID); err != nil {
				slog.Error("failed to distribute event points during cascade completion",
					"event_id", eventID,
					"tournament_id", t.ID,
					"tournament_name", t.Name,
					"error", err,
				)
			}
		} else {
			slog.Warn("point distributor not available for cascade completion, skipping point distribution",
				"event_id", eventID,
				"tournament_id", t.ID,
			)
		}
	}

	slog.Info("event completion cascade",
		"event_id", eventID,
		"tournaments_updated", updated,
		"tournaments_total", len(tournaments),
	)
}
