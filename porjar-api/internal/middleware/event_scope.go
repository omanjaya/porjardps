package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// EventScopeMw checks the admin is assigned to the event named by the route
// param. It reads the event id from param ":id", falling back to ":eventId".
// Superadmins bypass. Non-admins pass through (adminMw upstream handles them).
func EventScopeMw(eventAdminRepo model.EventAdminRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := GetUserRole(c)
		if role == "superadmin" {
			return c.Next()
		}
		if role != "admin" {
			return c.Next()
		}

		idStr := c.Params("id")
		if idStr == "" {
			idStr = c.Params("eventId")
		}
		eventID, err := uuid.Parse(idStr)
		if err != nil {
			// let the handler return its own error
			return c.Next()
		}

		userID := GetUserID(c)
		allowed, err := eventAdminRepo.IsAdminOfEvent(c.UserContext(), userID, eventID)
		if err != nil {
			return response.HandleError(c, err)
		}
		if !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "FORBIDDEN",
					"message": "Kamu tidak memiliki akses ke event ini",
				},
			})
		}

		return c.Next()
	}
}
