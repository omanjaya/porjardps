package handler

import (
	"errors"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// EventReportHandler builds a read-only, printable event-level recap
// (GET /admin/events/:id/report): one card per tournament in the event with
// its champion and top-3 standings, plus an event-wide totals strip. It sits
// one level above the existing single-tournament report (report_handler.go),
// which this handler does not touch or depend on.
//
// Scoping follows the same convention as EventHealthHandler.Overview:
// requireEventAccess (scope_helpers.go) ensures a scoped event-admin can't
// pull the recap for an event they aren't assigned to.
type EventReportHandler struct {
	db             *pgxpool.Pool
	eventAdminRepo model.EventAdminRepository
}

func NewEventReportHandler(db *pgxpool.Pool, eventAdminRepo model.EventAdminRepository) *EventReportHandler {
	return &EventReportHandler{db: db, eventAdminRepo: eventAdminRepo}
}

func (h *EventReportHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/admin/events/:id/report", authMw, adminMw, h.Report)
}

type eventReportStanding struct {
	RankPosition int     `json:"rank_position"`
	TeamName     string  `json:"team_name"`
	SchoolName   *string `json:"school_name"`
}

type eventReportTournament struct {
	ID               uuid.UUID             `json:"id"`
	Name             string                `json:"name"`
	GameName         string                `json:"game_name"`
	GameSlug         string                `json:"game_slug"`
	Format           string                `json:"format"`
	Status           string                `json:"status"`
	ChampionTeamName *string               `json:"champion_team_name"`
	Standings        []eventReportStanding `json:"standings"`
}

// GET /admin/events/:id/report
func (h *EventReportHandler) Report(c *fiber.Ctx) error {
	ctx := c.UserContext()

	eventID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	if err := requireEventAccess(c, h.eventAdminRepo, eventID); err != nil {
		return err
	}

	// 1. The event itself.
	var (
		slug         string
		name         string
		status       string
		startDate    *time.Time
		endDate      *time.Time
		venue        *string
		organizer    *string
		logoURL      *string
		primaryColor string
	)
	err = h.db.QueryRow(ctx, `
		SELECT slug, name, status, start_date, end_date, venue, organizer, logo_url, primary_color
		FROM events WHERE id = $1`, eventID).
		Scan(&slug, &name, &status, &startDate, &endDate, &venue, &organizer, &logoURL, &primaryColor)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return response.NotFound(c, "Event tidak ditemukan")
		}
		return response.HandleError(c, fmt.Errorf("event report: find event: %w", err))
	}

	// 2. Tournaments in this event, with champion + game info.
	tRows, err := h.db.Query(ctx, `
		SELECT t.id, t.name, COALESCE(g.name, ''), COALESCE(g.slug, ''), t.format, t.status,
		       t.champion_team_name
		FROM tournaments t
		LEFT JOIN games g ON g.id = t.game_id
		WHERE t.event_id = $1
		ORDER BY t.name ASC`, eventID)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("event report: list tournaments: %w", err))
	}
	tournaments := make([]*eventReportTournament, 0)
	tournamentIDs := make([]uuid.UUID, 0)
	for tRows.Next() {
		tr := &eventReportTournament{Standings: []eventReportStanding{}}
		if err := tRows.Scan(&tr.ID, &tr.Name, &tr.GameName, &tr.GameSlug, &tr.Format, &tr.Status,
			&tr.ChampionTeamName); err != nil {
			tRows.Close()
			return response.HandleError(c, fmt.Errorf("event report: scan tournament: %w", err))
		}
		tournaments = append(tournaments, tr)
		tournamentIDs = append(tournamentIDs, tr.ID)
	}
	if err := tRows.Err(); err != nil {
		tRows.Close()
		return response.HandleError(c, fmt.Errorf("event report: tournament rows: %w", err))
	}
	tRows.Close()

	// 3. Top-3 standings for every tournament in this event, in one query.
	standingsByTournament := make(map[uuid.UUID][]eventReportStanding)
	if len(tournamentIDs) > 0 {
		sRows, err := h.db.Query(ctx, `
			SELECT s.tournament_id, s.rank_position, tm.name, sc.name
			FROM standings s
			JOIN teams tm ON tm.id = s.team_id
			LEFT JOIN schools sc ON sc.id = tm.school_id
			WHERE s.tournament_id = ANY($1) AND s.rank_position IS NOT NULL AND s.rank_position <= 3
			ORDER BY s.tournament_id, s.rank_position ASC`, tournamentIDs)
		if err != nil {
			return response.HandleError(c, fmt.Errorf("event report: standings: %w", err))
		}
		for sRows.Next() {
			var tID uuid.UUID
			var st eventReportStanding
			if err := sRows.Scan(&tID, &st.RankPosition, &st.TeamName, &st.SchoolName); err != nil {
				sRows.Close()
				return response.HandleError(c, fmt.Errorf("event report: scan standing: %w", err))
			}
			standingsByTournament[tID] = append(standingsByTournament[tID], st)
		}
		if err := sRows.Err(); err != nil {
			sRows.Close()
			return response.HandleError(c, fmt.Errorf("event report: standings rows: %w", err))
		}
		sRows.Close()
	}
	for _, tr := range tournaments {
		if s, ok := standingsByTournament[tr.ID]; ok {
			tr.Standings = s
		}
	}

	// 4. Totals: teams/players/schools (via tournament_teams, same convention as
	// EventHealthHandler), matches_completed (bracket_matches status='completed').
	var teamsTotal, matchesCompleted int
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT tt.team_id)
		FROM tournament_teams tt
		JOIN tournaments t ON t.id = tt.tournament_id
		WHERE t.event_id = $1`, eventID).Scan(&teamsTotal); err != nil {
		return response.HandleError(c, fmt.Errorf("event report: teams total: %w", err))
	}
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM bracket_matches bm
		JOIN tournaments t ON t.id = bm.tournament_id
		WHERE t.event_id = $1 AND bm.status = 'completed'`, eventID).Scan(&matchesCompleted); err != nil {
		return response.HandleError(c, fmt.Errorf("event report: matches completed: %w", err))
	}

	var playersTotal, schoolsTotal int
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT tmm.id)
		FROM tournament_teams tt
		JOIN tournaments t ON t.id = tt.tournament_id
		JOIN team_members tmm ON tmm.team_id = tt.team_id
		WHERE t.event_id = $1`, eventID).Scan(&playersTotal); err != nil {
		return response.HandleError(c, fmt.Errorf("event report: players total: %w", err))
	}
	if err := h.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT tm.school_id)
		FROM tournament_teams tt
		JOIN tournaments t ON t.id = tt.tournament_id
		JOIN teams tm ON tm.id = tt.team_id
		WHERE t.event_id = $1 AND tm.school_id IS NOT NULL`, eventID).Scan(&schoolsTotal); err != nil {
		return response.HandleError(c, fmt.Errorf("event report: schools total: %w", err))
	}

	return response.OK(c, fiber.Map{
		"event": fiber.Map{
			"id":            eventID,
			"slug":          slug,
			"name":          name,
			"status":        status,
			"start_date":    startDate,
			"end_date":      endDate,
			"venue":         venue,
			"organizer":     organizer,
			"logo_url":      logoURL,
			"primary_color": primaryColor,
		},
		"totals": fiber.Map{
			"tournaments":       len(tournaments),
			"teams":             teamsTotal,
			"players":           playersTotal,
			"schools":           schoolsTotal,
			"matches_completed": matchesCompleted,
		},
		"tournaments": tournaments,
	})
}
