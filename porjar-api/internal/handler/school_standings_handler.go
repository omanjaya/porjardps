package handler

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type SchoolStandingsHandler struct {
	db *pgxpool.Pool
}

func NewSchoolStandingsHandler(db *pgxpool.Pool) *SchoolStandingsHandler {
	return &SchoolStandingsHandler{db: db}
}

func (h *SchoolStandingsHandler) RegisterRoutes(app fiber.Router, publicRL fiber.Handler) {
	app.Get("/school-standings", publicRL, h.List)
	app.Get("/medal-standings", publicRL, h.ListByTournament)
	app.Get("/events/:eventId/stats", publicRL, h.EventStats)
}

// EventStats returns participation counts scoped to a single event: games
// contested (distinct games among the event's tournaments), and schools/players
// registered to the event. Used by the public event landing page so a new event
// shows its own numbers rather than platform-wide totals.
func (h *SchoolStandingsHandler) EventStats(c *fiber.Ctx) error {
	eventID, err := uuid.Parse(c.Params("eventId"))
	if err != nil {
		return response.BadRequest(c, "ID event tidak valid")
	}

	var totalGames, totalSchools, totalPlayers int
	// Participation is derived from teams placed in this event's tournaments
	// (tournament_teams), which is the source of truth for who is in the event.
	err = h.db.QueryRow(c.UserContext(), `
		SELECT
			(SELECT COUNT(DISTINCT game_id) FROM tournaments WHERE event_id = $1),
			(SELECT COUNT(DISTINCT t.school_id) FROM tournament_teams tt
				JOIN tournaments tr ON tr.id = tt.tournament_id
				JOIN teams t ON t.id = tt.team_id
				WHERE tr.event_id = $1 AND t.school_id IS NOT NULL),
			(SELECT COUNT(DISTINCT tm.user_id) FROM tournament_teams tt
				JOIN tournaments tr ON tr.id = tt.tournament_id
				JOIN team_members tm ON tm.team_id = tt.team_id
				WHERE tr.event_id = $1)
	`, eventID).Scan(&totalGames, &totalSchools, &totalPlayers)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("event stats: %w", err))
	}

	return response.OK(c, fiber.Map{
		"total_games":   totalGames,
		"total_schools": totalSchools,
		"total_players": totalPlayers,
	})
}

type SchoolStandingRow struct {
	ID               uuid.UUID `json:"id"`
	Name             string    `json:"name"`
	Level            string    `json:"level"`
	LogoURL          *string   `json:"logo_url"`
	City             string    `json:"city"`
	Gold             int       `json:"gold"`
	Silver           int       `json:"silver"`
	Bronze           int       `json:"bronze"`
	TotalTournaments int       `json:"total_tournaments"`
	Rank             int       `json:"rank"`
}

func (h *SchoolStandingsHandler) List(c *fiber.Ctx) error {
	level := c.Query("level")

	baseQuery := `
		SELECT
			sch.id, sch.name, sch.level, sch.logo_url, sch.city,
			COUNT(CASE WHEN st.rank_position = 1 THEN 1 END) AS gold,
			COUNT(CASE WHEN st.rank_position = 2 THEN 1 END) AS silver,
			COUNT(CASE WHEN st.rank_position = 3 THEN 1 END) AS bronze,
			COUNT(DISTINCT st.tournament_id) AS total_tournaments
		FROM standings st
		JOIN teams t ON t.id = st.team_id
		JOIN schools sch ON sch.id = t.school_id
		WHERE t.school_id IS NOT NULL
			AND st.rank_position IS NOT NULL`

	var args []interface{}
	argIdx := 0

	if level != "" {
		argIdx++
		baseQuery += fmt.Sprintf(` AND sch.level = $%d`, argIdx)
		args = append(args, level)
	}

	// Optional event scoping: only medals from tournaments in this event.
	if eid := c.Query("event_id"); eid != "" {
		if eventID, err := uuid.Parse(eid); err == nil {
			argIdx++
			baseQuery += fmt.Sprintf(` AND st.tournament_id IN (SELECT id FROM tournaments WHERE event_id = $%d)`, argIdx)
			args = append(args, eventID)
		}
	}

	baseQuery += `
		GROUP BY sch.id, sch.name, sch.level, sch.logo_url, sch.city
		HAVING COUNT(CASE WHEN st.rank_position <= 3 THEN 1 END) > 0
		ORDER BY
			COUNT(CASE WHEN st.rank_position = 1 THEN 1 END) DESC,
			COUNT(CASE WHEN st.rank_position = 2 THEN 1 END) DESC,
			COUNT(CASE WHEN st.rank_position = 3 THEN 1 END) DESC
		LIMIT 200`

	rows, err := h.db.Query(c.UserContext(), baseQuery, args...)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("fetch school standings: %w", err))
	}
	defer rows.Close()

	var results []SchoolStandingRow
	for rows.Next() {
		var row SchoolStandingRow
		if err := rows.Scan(
			&row.ID, &row.Name, &row.Level, &row.LogoURL, &row.City,
			&row.Gold, &row.Silver, &row.Bronze, &row.TotalTournaments,
		); err != nil {
			return response.HandleError(c, fmt.Errorf("scan school standings: %w", err))
		}
		results = append(results, row)
	}

	if err := rows.Err(); err != nil {
		return response.HandleError(c, fmt.Errorf("iterate school standings: %w", err))
	}

	for i := range results {
		results[i].Rank = i + 1
	}

	if results == nil {
		results = []SchoolStandingRow{}
	}

	return response.OK(c, results)
}

type MedalEntry struct {
	Rank          int     `json:"rank"`
	TeamName      string  `json:"team_name"`
	SchoolID      string  `json:"school_id"`
	SchoolName    string  `json:"school_name"`
	SchoolLogoURL *string `json:"school_logo_url"`
}

type TournamentMedals struct {
	TournamentID   string       `json:"tournament_id"`
	TournamentName string       `json:"tournament_name"`
	GameName       string       `json:"game_name"`
	GameSlug       string       `json:"game_slug"`
	SchoolLevel    string       `json:"school_level"`
	Medals         []MedalEntry `json:"medals"`
}

func (h *SchoolStandingsHandler) ListByTournament(c *fiber.Ctx) error {
	level := c.Query("level")

	query := `
		SELECT
			st.tournament_id,
			tn.name AS tournament_name,
			g.name AS game_name,
			g.slug AS game_slug,
			tn.school_level,
			st.rank_position,
			t.name AS team_name,
			sch.id AS school_id,
			sch.name AS school_name,
			sch.logo_url AS school_logo_url
		FROM standings st
		JOIN teams t ON t.id = st.team_id
		JOIN schools sch ON sch.id = t.school_id
		JOIN tournaments tn ON tn.id = st.tournament_id
		JOIN games g ON g.id = tn.game_id
		WHERE st.rank_position IN (1, 2, 3)
			AND t.school_id IS NOT NULL`

	var args []interface{}

	if level != "" {
		query += ` AND tn.school_level = $1`
		args = append(args, level)
	}

	query += ` ORDER BY tn.name, st.rank_position`

	rows, err := h.db.Query(c.UserContext(), query, args...)
	if err != nil {
		return response.HandleError(c, fmt.Errorf("fetch medal standings: %w", err))
	}
	defer rows.Close()

	tournamentMap := make(map[string]*TournamentMedals)
	var tournamentOrder []string

	for rows.Next() {
		var (
			tournamentID uuid.UUID
			schoolID     uuid.UUID
			tName        string
			gameName     string
			gameSlug     string
			schoolLevel  string
			rankPos      int
			teamName     string
			schoolName   string
			schoolLogo   *string
		)

		if err := rows.Scan(
			&tournamentID, &tName, &gameName, &gameSlug, &schoolLevel,
			&rankPos, &teamName, &schoolID, &schoolName, &schoolLogo,
		); err != nil {
			return response.HandleError(c, fmt.Errorf("scan medal standings: %w", err))
		}

		tid := tournamentID.String()

		if _, exists := tournamentMap[tid]; !exists {
			tournamentMap[tid] = &TournamentMedals{
				TournamentID:   tid,
				TournamentName: tName,
				GameName:       gameName,
				GameSlug:       gameSlug,
				SchoolLevel:    schoolLevel,
				Medals:         []MedalEntry{},
			}
			tournamentOrder = append(tournamentOrder, tid)
		}

		tournamentMap[tid].Medals = append(tournamentMap[tid].Medals, MedalEntry{
			Rank:          rankPos,
			TeamName:      teamName,
			SchoolID:      schoolID.String(),
			SchoolName:    schoolName,
			SchoolLogoURL: schoolLogo,
		})
	}

	if err := rows.Err(); err != nil {
		return response.HandleError(c, fmt.Errorf("iterate medal standings: %w", err))
	}

	results := make([]TournamentMedals, 0, len(tournamentOrder))
	for _, tid := range tournamentOrder {
		results = append(results, *tournamentMap[tid])
	}

	return response.OK(c, results)
}
