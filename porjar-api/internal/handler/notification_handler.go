package handler

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type NotificationHandler struct {
	notificationService *service.NotificationService
}

func NewNotificationHandler(notificationService *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

func (h *NotificationHandler) RegisterRoutes(app fiber.Router, authMw fiber.Handler) {
	notifications := app.Group("/notifications", authMw)
	notifications.Get("/", h.List)
	notifications.Get("/unread-count", h.UnreadCount)
	notifications.Put("/read-all", h.MarkAllRead)
	notifications.Put("/:id/read", h.MarkRead)
}

// List returns paginated notifications for the authenticated user
func (h *NotificationHandler) List(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Bound pagination parameters
	if page < 1 {
		page = 1
	}
	if page > 10000 {
		page = 10000
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	notifications, total, err := h.notificationService.GetByUser(c.Context(), userID, page, limit)
	if err != nil {
		return response.HandleError(c, err)
	}

	totalPages := total / limit
	if total%limit != 0 {
		totalPages++
	}

	return response.Paginated(c, notifications, response.Meta{
		Page:       page,
		PerPage:    limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

// MarkRead marks a single notification as read (with ownership check)
func (h *NotificationHandler) MarkRead(c *fiber.Ctx) error {
	notifID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Notification ID tidak valid")
	}

	userID := middleware.GetUserID(c)

	if svcErr := h.notificationService.MarkReadForUser(c.Context(), notifID, userID); svcErr != nil {
		errMsg := svcErr.Error()
		if strings.Contains(errMsg, "forbidden") {
			return response.Forbidden(c, "FORBIDDEN")
		}
		if strings.Contains(errMsg, "not found") {
			return response.NotFound(c, "Notifikasi tidak ditemukan")
		}
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Notifikasi ditandai telah dibaca"})
}

// MarkAllRead marks all notifications as read for the authenticated user
func (h *NotificationHandler) MarkAllRead(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	if err := h.notificationService.MarkAllRead(c.Context(), userID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Semua notifikasi ditandai telah dibaca"})
}

// UnreadCount returns the number of unread notifications
func (h *NotificationHandler) UnreadCount(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	count, err := h.notificationService.CountUnread(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"count": count})
}
