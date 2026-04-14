package handler

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type BadgeServiceInterface interface {
	ListAll(ctx context.Context) ([]*model.Badge, error)
	GetUserBadges(ctx context.Context, userID uuid.UUID) ([]*model.UserBadge, error)
	AwardBySlug(ctx context.Context, userID uuid.UUID, slug string) error
}

type BadgeHandler struct {
	badgeService BadgeServiceInterface
}

func NewBadgeHandler(badgeService *service.BadgeService) *BadgeHandler {
	return &BadgeHandler{badgeService: badgeService}
}

func (h *BadgeHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, publicRL fiber.Handler) {
	// Public
	app.Get("/badges", publicRL, h.ListAll)
	app.Get("/users/:id/badges", publicRL, h.GetUserBadges)

	// Authenticated
	app.Get("/me/badges", authMw, h.GetMyBadges)

	// Admin
	app.Post("/admin/badges/award", authMw, adminMw, h.AdminAward)
}

// ListAll returns all available badges.
func (h *BadgeHandler) ListAll(c *fiber.Ctx) error {
	badges, err := h.badgeService.ListAll(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}
	if badges == nil {
		badges = []*model.Badge{}
	}
	return response.OK(c, badges)
}

// GetUserBadges returns badges earned by a specific user.
func (h *BadgeHandler) GetUserBadges(c *fiber.Ctx) error {
	userID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Invalid user ID")
	}

	badges, err := h.badgeService.GetUserBadges(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if badges == nil {
		badges = []*model.UserBadge{}
	}
	return response.OK(c, badges)
}

// GetMyBadges returns badges for the authenticated user.
func (h *BadgeHandler) GetMyBadges(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	badges, err := h.badgeService.GetUserBadges(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if badges == nil {
		badges = []*model.UserBadge{}
	}
	return response.OK(c, badges)
}

// AdminAward manually awards a badge to a user.
func (h *BadgeHandler) AdminAward(c *fiber.Ctx) error {
	var body struct {
		UserID    string `json:"user_id"`
		BadgeSlug string `json:"badge_slug"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if body.UserID == "" || body.BadgeSlug == "" {
		return response.BadRequest(c, "user_id and badge_slug are required")
	}

	userID, err := uuid.Parse(body.UserID)
	if err != nil {
		return response.BadRequest(c, "Invalid user_id")
	}

	if err := h.badgeService.AwardBySlug(c.Context(), userID, body.BadgeSlug); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Badge awarded"})
}
