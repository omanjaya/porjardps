package handler

import (
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// EventHealthHandler powers a read-only "Event Health" command-center for
// admins/superadmins: a citywide rollup plus a per-event health card
// (GET /admin/events/health), and a single-event drill-down
// (GET /admin/events/:id/overview). Every query here is SELECT-only — this
// handler never mutates data.
//
// Scoping follows the same convention as every other List/Get handler in this
// package: middleware.GetAllowedEventIDs(c, h.eventAdminRepo) returns nil for
// superadmins (no restriction) or a (possibly empty) []uuid.UUID for scoped
// admins, and requireEventAccess (scope_helpers.go) is reused for the
// single-event endpoint so a scoped admin can't probe another event's health
// by guessing its UUID.
type EventHealthHandler struct {
	db             *pgxpool.Pool
	eventAdminRepo model.EventAdminRepository
}

func NewEventHealthHandler(db *pgxpool.Pool, eventAdminRepo model.EventAdminRepository) *EventHealthHandler {
	return &EventHealthHandler{db: db, eventAdminRepo: eventAdminRepo}
}

func (h *EventHealthHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/admin/events/health", authMw, adminMw, h.Health)
	app.Get("/admin/events/:id/overview", authMw, adminMw, h.Overview)
}

// --- shared row/scan helpers -------------------------------------------------

type eventHealthEventRow struct {
	ID           uuid.UUID
	Slug         string
	Name         string
	Status       string
	StartDate    *time.Time
	EndDate      *time.Time
	LogoURL      *string
	PrimaryColor string
}

// scanEventUUIDCounts reads a two-column (event_id uuid, count int) result set
// into a map. Used for every "COUNT(*) ... GROUP BY event_id" aggregate below.
func scanEventUUIDCounts(rows pgx.Rows) (map[uuid.UUID]int, error) {
	defer rows.Close()
	out := make(map[uuid.UUID]int)
	for rows.Next() {
		var id uuid.UUID
		var cnt int
		if err := rows.Scan(&id, &cnt); err != nil {
			return nil, err
		}
		out[id] = cnt
	}
	return out, rows.Err()
}

// --- GET /admin/events/health ------------------------------------------------

func (h *EventHealthHandler) Health(c *fiber.Ctx) error {
	ctx := c.UserContext()

	allowedIDs, ok := middleware.GetAllowedEventIDs(c, h.eventAdminRepo)
	if !ok {
		return nil // response already written
	}

	// 1. Events in scope, ordered for display.
	query := `SELECT id, slug, name, status, start_date, end_date, logo_url, primary_color
	          FROM events`
	var args []interface{}
	if allowedIDs != nil {
		// Non-nil (even empty) means "restrict to these" — an admin assigned to
		// no events must see nothing, matching EventHandler.List's convention.
		query += ` WHERE id = ANY($1)`
		args = append(args, allowedIDs)
	}
	query += ` ORDER BY sort_order ASC`

	rows, err := h.db.Query(ctx, query, args...)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: list events: %w", err))
	}
	var events []*eventHealthEventRow
	for rows.Next() {
		e := &eventHealthEventRow{}
		if err := rows.Scan(&e.ID, &e.Slug, &e.Name, &e.Status, &e.StartDate, &e.EndDate, &e.LogoURL, &e.PrimaryColor); err != nil {
			rows.Close()
			return response.HandleError(c, fmt.Errorf("events health: scan event: %w", err))
		}
		events = append(events, e)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return response.HandleError(c, fmt.Errorf("events health: rows: %w", err))
	}
	rows.Close()

	eventIDs := make([]uuid.UUID, len(events))
	for i, e := range events {
		eventIDs[i] = e.ID
	}

	// citywide.pending_approvals: teams awaiting approval can't be reliably
	// attributed to a single event (a freshly-created team may not be entered
	// into any tournament_teams row yet), so this is always the GLOBAL pending
	// count regardless of admin scope — a deliberate choice, documented here
	// per the task spec's "your call, document it".
	var pendingApprovals int
	if err := h.db.QueryRow(ctx, `SELECT COUNT(*) FROM teams WHERE status = 'pending'`).Scan(&pendingApprovals); err != nil {
		return response.HandleError(c, fmt.Errorf("events health: pending approvals: %w", err))
	}

	if len(eventIDs) == 0 {
		return response.OK(c, fiber.Map{
			"citywide": fiber.Map{
				"pending_approvals":    pendingApprovals,
				"disputed_submissions": 0,
				"live_matches":         0,
				"events_ongoing":       0,
			},
			"events": []fiber.Map{},
		})
	}

	// 2. Tournaments per event, bucketed by status.
	tRows, err := h.db.Query(ctx, `
		SELECT event_id, status, COUNT(*)
		FROM tournaments
		WHERE event_id = ANY($1)
		GROUP BY event_id, status`, eventIDs)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: tournaments by status: %w", err))
	}
	tournamentsByEvent := make(map[uuid.UUID]map[string]int)
	for tRows.Next() {
		var eid uuid.UUID
		var status string
		var cnt int
		if err := tRows.Scan(&eid, &status, &cnt); err != nil {
			tRows.Close()
			return response.HandleError(c, fmt.Errorf("events health: scan tournament status: %w", err))
		}
		if tournamentsByEvent[eid] == nil {
			tournamentsByEvent[eid] = make(map[string]int)
		}
		tournamentsByEvent[eid][status] = cnt
	}
	if err := tRows.Err(); err != nil {
		tRows.Close()
		return response.HandleError(c, fmt.Errorf("events health: tournament rows: %w", err))
	}
	tRows.Close()

	// 3. Distinct teams per event (via tournament_teams -> tournaments).
	teamsRows, err := h.db.Query(ctx, `
		SELECT t.event_id, COUNT(DISTINCT tt.team_id)
		FROM tournament_teams tt
		JOIN tournaments t ON t.id = tt.tournament_id
		WHERE t.event_id = ANY($1)
		GROUP BY t.event_id`, eventIDs)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: teams total: %w", err))
	}
	teamsByEvent, err := scanEventUUIDCounts(teamsRows)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: scan teams total: %w", err))
	}

	// 4. Live bracket matches per event (status = 'live').
	liveRows, err := h.db.Query(ctx, `
		SELECT t.event_id, COUNT(*)
		FROM bracket_matches bm
		JOIN tournaments t ON t.id = bm.tournament_id
		WHERE t.event_id = ANY($1) AND bm.status = 'live'
		GROUP BY t.event_id`, eventIDs)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: live matches: %w", err))
	}
	liveByEvent, err := scanEventUUIDCounts(liveRows)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: scan live matches: %w", err))
	}

	// 5. Disputed submissions per event. A submission hangs off EITHER a
	// bracket_match OR a br_lobby (never both), so resolve its tournament via
	// COALESCE of both possible joins.
	disputedRows, err := h.db.Query(ctx, `
		SELECT t.event_id, COUNT(*)
		FROM match_submissions ms
		LEFT JOIN bracket_matches bm ON bm.id = ms.bracket_match_id
		LEFT JOIN br_lobbies bl ON bl.id = ms.br_lobby_id
		JOIN tournaments t ON t.id = COALESCE(bm.tournament_id, bl.tournament_id)
		WHERE ms.status = 'disputed' AND t.event_id = ANY($1)
		GROUP BY t.event_id`, eventIDs)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: disputed submissions: %w", err))
	}
	disputedByEvent, err := scanEventUUIDCounts(disputedRows)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: scan disputed submissions: %w", err))
	}

	// 6. Overdue matches per event: a schedule entry in the past whose match
	// (when it's a bracket match) hasn't completed, and whose own status isn't
	// already a terminal one. Schedules for br_lobby matches have no
	// bracket_matches row to check, so we fall back to the schedule's own
	// status in that case.
	overdueRows, err := h.db.Query(ctx, `
		SELECT t.event_id, COUNT(*)
		FROM schedules s
		JOIN tournaments t ON t.id = s.tournament_id
		LEFT JOIN bracket_matches bm ON bm.id = s.bracket_match_id
		WHERE t.event_id = ANY($1)
		  AND s.scheduled_at < now()
		  AND s.status NOT IN ('completed', 'cancelled')
		  AND (s.bracket_match_id IS NULL OR bm.status <> 'completed')
		GROUP BY t.event_id`, eventIDs)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: overdue matches: %w", err))
	}
	overdueByEvent, err := scanEventUUIDCounts(overdueRows)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("events health: scan overdue matches: %w", err))
	}

	// 7. Assemble per-event cards + citywide sums.
	citywideDisputed := 0
	citywideLive := 0
	citywideOngoing := 0

	eventCards := make([]fiber.Map, 0, len(events))
	for _, e := range events {
		statusCounts := tournamentsByEvent[e.ID]
		total := 0
		for _, n := range statusCounts {
			total += n
		}
		ongoing := statusCounts["ongoing"]
		completed := statusCounts["completed"]
		// "upcoming" bucket covers tournaments not yet ongoing/completed
		// (status IN ('upcoming', 'registration')); 'cancelled' tournaments are
		// counted in `total` only and don't fall into any of the three buckets.
		upcoming := statusCounts["upcoming"] + statusCounts["registration"]

		disputed := disputedByEvent[e.ID]
		overdue := overdueByEvent[e.ID]
		live := liveByEvent[e.ID]

		if e.Status == "ongoing" {
			citywideOngoing++
		}
		citywideDisputed += disputed
		citywideLive += live

		eventCards = append(eventCards, fiber.Map{
			"id":            e.ID,
			"slug":          e.Slug,
			"name":          e.Name,
			"status":        e.Status,
			"start_date":    e.StartDate,
			"end_date":      e.EndDate,
			"logo_url":      e.LogoURL,
			"primary_color": e.PrimaryColor,
			"tournaments": fiber.Map{
				"total":     total,
				"ongoing":   ongoing,
				"completed": completed,
				"upcoming":  upcoming,
			},
			"teams_total":  teamsByEvent[e.ID],
			"live_matches": live,
			"attention": fiber.Map{
				"disputed_submissions": disputed,
				"overdue_matches":      overdue,
				"total":                disputed + overdue,
			},
		})
	}

	return response.OK(c, fiber.Map{
		"citywide": fiber.Map{
			"pending_approvals":    pendingApprovals,
			"disputed_submissions": citywideDisputed,
			"live_matches":         citywideLive,
			"events_ongoing":       citywideOngoing,
		},
		"events": eventCards,
	})
}

// --- GET /admin/events/:id/overview -----------------------------------------

func (h *EventHealthHandler) Overview(c *fiber.Ctx) error {
	ctx := c.UserContext()

	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	if err := requireEventAccess(c, h.eventAdminRepo, eventID); err != nil {
		return err
	}

	e := &eventHealthEventRow{}
	err = h.db.QueryRow(ctx, `
		SELECT id, slug, name, status, start_date, end_date, logo_url, primary_color
		FROM events WHERE id = $1`, eventID).
		Scan(&e.ID, &e.Slug, &e.Name, &e.Status, &e.StartDate, &e.EndDate, &e.LogoURL, &e.PrimaryColor)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return response.NotFound(c, "Event tidak ditemukan")
		}
		return response.HandleError(c, fmt.Errorf("event overview: find event: %w", err))
	}

	// Tournaments in this event, with per-tournament bracket match rollups.
	// t.id is this table's primary key so every other t.* column is
	// functionally dependent on it and doesn't need to appear in GROUP BY.
	rows, err := h.db.Query(ctx, `
		SELECT t.id, t.name, COALESCE(g.name, ''), COALESCE(g.slug, ''), t.format, t.status,
		       t.champion_team_name,
		       COUNT(bm.id) AS matches_total,
		       COUNT(bm.id) FILTER (WHERE bm.status = 'completed') AS matches_completed,
		       COUNT(bm.id) FILTER (WHERE bm.status = 'live') AS live_matches
		FROM tournaments t
		LEFT JOIN games g ON g.id = t.game_id
		LEFT JOIN bracket_matches bm ON bm.tournament_id = t.id
		WHERE t.event_id = $1
		GROUP BY t.id
		ORDER BY t.name ASC`, eventID)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("event overview: list tournaments: %w", err))
	}
	tournamentCards := []fiber.Map{}
	totalLiveMatches := 0
	tournamentCount := 0
	for rows.Next() {
		var (
			tID              uuid.UUID
			tName            string
			gameName         string
			gameSlug         string
			format           string
			status           string
			championName     *string
			matchesTotal     int
			matchesCompleted int
			liveMatches      int
		)
		if err := rows.Scan(&tID, &tName, &gameName, &gameSlug, &format, &status, &championName,
			&matchesTotal, &matchesCompleted, &liveMatches); err != nil {
			rows.Close()
			return response.HandleError(c, fmt.Errorf("event overview: scan tournament: %w", err))
		}
		tournamentCount++
		totalLiveMatches += liveMatches
		tournamentCards = append(tournamentCards, fiber.Map{
			"id":                 tID,
			"name":               tName,
			"game_name":          gameName,
			"game_slug":          gameSlug,
			"format":             format,
			"status":             status,
			"matches_total":      matchesTotal,
			"matches_completed":  matchesCompleted,
			"live_matches":       liveMatches,
			"champion_team_name": championName,
		})
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		return response.HandleError(c, fmt.Errorf("event overview: tournament rows: %w", err))
	}
	rows.Close()

	// Distinct teams entered across this event's tournaments.
	var teamsTotal int
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT tt.team_id)
		FROM tournament_teams tt
		JOIN tournaments t ON t.id = tt.tournament_id
		WHERE t.event_id = $1`, eventID).Scan(&teamsTotal); err != nil {
		return response.HandleError(c, fmt.Errorf("event overview: teams total: %w", err))
	}

	// Disputed submissions scoped to this event (same COALESCE join as Health).
	var disputed int
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM match_submissions ms
		LEFT JOIN bracket_matches bm ON bm.id = ms.bracket_match_id
		LEFT JOIN br_lobbies bl ON bl.id = ms.br_lobby_id
		JOIN tournaments t ON t.id = COALESCE(bm.tournament_id, bl.tournament_id)
		WHERE ms.status = 'disputed' AND t.event_id = $1`, eventID).Scan(&disputed); err != nil {
		return response.HandleError(c, fmt.Errorf("event overview: disputed submissions: %w", err))
	}

	// Overdue matches scoped to this event (same rule as Health).
	var overdue int
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM schedules s
		JOIN tournaments t ON t.id = s.tournament_id
		LEFT JOIN bracket_matches bm ON bm.id = s.bracket_match_id
		WHERE t.event_id = $1
		  AND s.scheduled_at < now()
		  AND s.status NOT IN ('completed', 'cancelled')
		  AND (s.bracket_match_id IS NULL OR bm.status <> 'completed')`, eventID).Scan(&overdue); err != nil {
		return response.HandleError(c, fmt.Errorf("event overview: overdue matches: %w", err))
	}

	return response.OK(c, fiber.Map{
		"event": fiber.Map{
			"id":            e.ID,
			"slug":          e.Slug,
			"name":          e.Name,
			"status":        e.Status,
			"start_date":    e.StartDate,
			"end_date":      e.EndDate,
			"logo_url":      e.LogoURL,
			"primary_color": e.PrimaryColor,
		},
		"tournaments": tournamentCards,
		"totals": fiber.Map{
			"teams":        teamsTotal,
			"live_matches": totalLiveMatches,
			"tournaments":  tournamentCount,
		},
		"attention": fiber.Map{
			"disputed_submissions": disputed,
			"overdue_matches":      overdue,
			"total":                disputed + overdue,
		},
	})
}
