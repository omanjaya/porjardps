package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// This file holds small, reusable in-handler RBAC helpers used by handlers
// whose mutating routes live OUTSIDE the `/admin/tournaments/:id/*` and
// `/admin/events/:id/*` prefixes already scoped by
// middleware.TournamentScopeMw / middleware.EventScopeMw. Those two
// middlewares only look at the `:id` route param, so any route that takes
// some other entity ID (match, group, lobby, stage, submission, card, ...)
// and resolves it to a tournament/event server-side must re-check access
// itself — otherwise a scoped ("admin") event-admin can mutate another
// event's data simply by knowing/guessing an entity UUID.
//
// Both helpers below:
//   - always allow role == "superadmin"
//   - always allow any role other than "admin" (non-admin roles are kept out
//     of /admin/* routes entirely by adminMw upstream; this file only needs
//     to further restrict "admin")
//   - if a required repo dependency is nil (i.e. not yet wired into the
//     handler via its Setter — see each handler's NewXxxHandler/SetXxxRepo),
//     they FAIL OPEN (return nil / allow the request) rather than block
//     every admin request. This preserves current behavior until the
//     necessary `handler.SetXxxRepo(...)` calls are added in routes.go.
//     Search this codebase for "NEEDS ROUTES.GO WIRING" to find every call
//     site that still needs to be wired up.
//   - on failure, write the 403 JSON response themselves (same shape as
//     EventScopeMw/TournamentScopeMw) and return a non-nil error. Callers
//     must treat a non-nil return as "stop processing, response already
//     written" i.e. `if err := requireXxx(...); err != nil { return err }`.

// requireEventAccess checks that the current user (if role == "admin") is
// assigned to eventID via the event_admins table. Superadmins always pass.
func requireEventAccess(c *fiber.Ctx, eventAdminRepo model.EventAdminRepository, eventID uuid.UUID) error {
	role := middleware.GetUserRole(c)
	if role != "admin" {
		return nil
	}
	if eventAdminRepo == nil {
		// Not wired into this handler yet — fail open (see file header).
		return nil
	}
	userID := middleware.GetUserID(c)
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
	return nil
}

// requireTournamentAccess resolves tournamentID -> tournament.EventID via
// tournamentRepo, then delegates to requireEventAccess. Superadmins always
// pass. If tournamentRepo (or eventAdminRepo) is nil, or the tournament
// can't be found, it fails open and lets the handler's own not-found logic
// run — this helper only ever narrows access, never widens it.
func requireTournamentAccess(c *fiber.Ctx, tournamentRepo model.TournamentRepository, eventAdminRepo model.EventAdminRepository, tournamentID uuid.UUID) error {
	role := middleware.GetUserRole(c)
	if role != "admin" {
		return nil
	}
	if tournamentRepo == nil {
		// Not wired into this handler yet — fail open (see file header).
		return nil
	}
	tournament, err := tournamentRepo.FindByID(c.UserContext(), tournamentID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if tournament == nil {
		return nil
	}
	return requireEventAccess(c, eventAdminRepo, tournament.EventID)
}
