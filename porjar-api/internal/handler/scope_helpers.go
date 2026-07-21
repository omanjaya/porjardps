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

// requireTeamAccess resolves teamID -> the set of event IDs of every
// tournament the team is entered in (via TournamentTeamRepository), then
// allows the request iff the caller (when role == "admin") is an event-admin
// of AT LEAST ONE of those events. Superadmins and non-"admin" roles always
// pass, matching requireEventAccess/requireTournamentAccess. If ttRepo (or
// eventAdminRepo) is nil, it fails open — see file header.
//
// Edge case — a team entered in ZERO tournaments (e.g. a brand-new pending
// team not yet registered to any tournament): ListEventIDsByTeam returns an
// empty slice, so there is no event to check the admin against. We choose to
// ALLOW in that case rather than hard-block, for two reasons: (1) it mirrors
// requireTournamentAccess's own "tournament not found -> fail open" choice a
// few lines up, keeping the two helpers consistent; and (2) it avoids a
// footgun where a scoped event-admin can no longer act on a pending team
// simply because its captain hasn't registered it to a tournament yet. This
// is a deliberate, narrow widening (not a blanket fail-open): as soon as a
// team is entered in ANY tournament, access narrows to admins of that team's
// event(s) only.
func requireTeamAccess(c *fiber.Ctx, eventAdminRepo model.EventAdminRepository, ttRepo model.TournamentTeamRepository, teamID uuid.UUID) error {
	role := middleware.GetUserRole(c)
	if role != "admin" {
		return nil
	}
	if ttRepo == nil {
		// Not wired into this handler yet — fail open (see file header).
		return nil
	}
	eventIDs, err := ttRepo.ListEventIDsByTeam(c.UserContext(), teamID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if len(eventIDs) == 0 {
		// Team isn't tied to any tournament/event yet — see doc comment above.
		return nil
	}
	if eventAdminRepo == nil {
		// Not wired into this handler yet — fail open (see file header).
		return nil
	}
	userID := middleware.GetUserID(c)
	for _, eid := range eventIDs {
		allowed, err := eventAdminRepo.IsAdminOfEvent(c.UserContext(), userID, eid)
		if err != nil {
			return response.HandleError(c, err)
		}
		if allowed {
			return nil
		}
	}
	return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
		"success": false,
		"error": fiber.Map{
			"code":    "FORBIDDEN",
			"message": "Kamu tidak memiliki akses ke tim ini",
		},
	})
}
