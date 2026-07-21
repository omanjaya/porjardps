package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// GetAllowedEventIDs returns:
//   - nil, true  → superadmin, no event restriction
//   - []uuid.UUID, true → admin restricted to these event IDs (may be empty = see nothing)
//   - nil, false → error (response already written)
func GetAllowedEventIDs(c *fiber.Ctx, eventAdminRepo model.EventAdminRepository) ([]uuid.UUID, bool) {
	role := GetUserRole(c)
	if role == "superadmin" {
		return nil, true
	}
	userID := GetUserID(c)
	ids, err := eventAdminRepo.ListByUser(c.UserContext(), userID)
	if err != nil {
		response.HandleError(c, err)
		return nil, false
	}
	// Ensure non-nil so callers can distinguish "unrestricted" (nil) from "empty" ([])
	if ids == nil {
		ids = []uuid.UUID{}
	}
	return ids, true
}

// TournamentScopeMw checks that the requesting admin is allowed to manage the
// tournament identified by the `:id` route parameter.
// Superadmins bypass the check. Regular admins must be assigned to the
// tournament's event via the event_admins table.
func TournamentScopeMw(tournamentRepo model.TournamentRepository, eventAdminRepo model.EventAdminRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := GetUserRole(c)
		if role == "superadmin" {
			return c.Next()
		}

		// Only scope admin-level routes (non-admins are handled by adminMw upstream)
		if role != "admin" {
			return c.Next()
		}

		tournamentID, err := uuid.Parse(c.Params("id"))
		if err != nil {
			// If the param can't be parsed as UUID let the handler return the error
			return c.Next()
		}

		tournament, err := tournamentRepo.FindByID(c.UserContext(), tournamentID)
		if err != nil {
			return response.HandleError(c, err)
		}
		if tournament == nil {
			// Not found — let the handler return 404
			return c.Next()
		}

		userID := GetUserID(c)
		allowed, err := eventAdminRepo.IsAdminOfEvent(c.UserContext(), userID, tournament.EventID)
		if err != nil {
			return response.HandleError(c, err)
		}
		if !allowed {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"success": false,
				"error": fiber.Map{
					"code":    "FORBIDDEN",
					"message": "Kamu tidak memiliki akses ke turnamen ini",
				},
			})
		}

		return c.Next()
	}
}
