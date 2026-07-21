package handler

import (
	"encoding/csv"
	"fmt"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
)

const maxExportRows = 10000

// escapeCSV prevents CSV injection by escaping values that could be interpreted
// as spreadsheet formulas (starting with =, +, -, @, tab, carriage return).
func escapeCSV(val string) string {
	if len(val) == 0 {
		return val
	}
	first := val[0]
	if first == '=' || first == '+' || first == '-' || first == '@' || first == '\t' || first == '\r' {
		return "'" + val
	}
	return val
}

// AdminExportHandler handles CSV export of participants, teams, and schools
// for admin reporting. Uses streaming writes to stdlib encoding/csv to keep
// memory usage bounded even for large datasets.
type AdminExportHandler struct {
	db *pgxpool.Pool
}

func NewAdminExportHandler(db *pgxpool.Pool) *AdminExportHandler {
	return &AdminExportHandler{db: db}
}

func (h *AdminExportHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/admin/export/participants.csv", authMw, adminMw, h.ExportParticipants)
	app.Get("/admin/export/teams.csv", authMw, adminMw, h.ExportTeams)
	app.Get("/admin/export/schools.csv", authMw, adminMw, h.ExportSchools)
}

func (h *AdminExportHandler) setCSVHeaders(c *fiber.Ctx, filename string) {
	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Set("Cache-Control", "no-store")
}

// ExportParticipants: all users with role=player
// Columns: nisn, full_name, email, school_name, phone, team_name, created_at
// Note: a player can be on multiple teams; we aggregate school/team via the
// most recent team membership to keep one row per player.
func (h *AdminExportHandler) ExportParticipants(c *fiber.Ctx) error {
	ctx := c.Context()

	// Count rows BEFORE writing any bytes to the response. If the cap is
	// exceeded, return the 413 cleanly here — no CSV headers/body written yet.
	// (Writing headers/rows first and erroring mid-stream would leave Fiber's
	// error handler overwriting the body with an error string while keeping
	// the .csv filename, producing a corrupt, data-less "csv" download.)
	var rowCount int
	if err := h.db.QueryRow(ctx, `SELECT COUNT(*) FROM users u WHERE u.role = 'player'`).Scan(&rowCount); err != nil {
		slog.Error("export participants: count query failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	if rowCount > maxExportRows {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, "Export melebihi batas 10.000 baris")
	}

	ts := time.Now().Format("20060102-150405")
	h.setCSVHeaders(c, fmt.Sprintf("participants-%s.csv", ts))

	query := `
		SELECT
			COALESCE(u.nisn, '')                 AS nisn,
			u.full_name,
			u.email,
			COALESCE(s.name, '')                 AS school_name,
			COALESCE(u.phone, '')                AS phone,
			COALESCE(t.name, '')                 AS team_name,
			u.created_at
		FROM users u
		LEFT JOIN LATERAL (
			SELECT tm.team_id, tm.joined_at
			FROM team_members tm
			WHERE tm.user_id = u.id
			ORDER BY tm.joined_at DESC
			LIMIT 1
		) tm ON TRUE
		LEFT JOIN teams t   ON t.id = tm.team_id
		LEFT JOIN schools s ON s.id = t.school_id
		WHERE u.role = 'player'
		ORDER BY u.created_at DESC
	`

	rows, err := h.db.Query(ctx, query)
	if err != nil {
		slog.Error("export participants: query failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	defer rows.Close()

	w := csv.NewWriter(c.Response().BodyWriter())
	defer w.Flush()

	if err := w.Write([]string{"nisn", "full_name", "email", "school_name", "phone", "team_name", "created_at"}); err != nil {
		return err
	}

	streamedRows := 0
	for rows.Next() {
		streamedRows++
		if streamedRows > maxExportRows {
			// Defensive only: the pre-count above already rejected this request
			// before any bytes were written. If the row count grew between the
			// count query and the stream (TOCTOU), the CSV headers/body have
			// already been sent, so returning a fiber.NewError here would corrupt
			// the response instead of preventing corruption. Stop streaming and
			// flush what has been written rather than emit a mixed error body.
			slog.Warn("export participants: row count grew past cap mid-stream, truncating output")
			break
		}
		var (
			nisn, fullName, email, school, phone, team string
			createdAt                                  time.Time
		)
		if err := rows.Scan(&nisn, &fullName, &email, &school, &phone, &team, &createdAt); err != nil {
			slog.Error("export participants: scan failed", "error", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
		}
		if err := w.Write([]string{
			escapeCSV(nisn), escapeCSV(fullName), escapeCSV(email),
			escapeCSV(school), escapeCSV(phone), escapeCSV(team),
			createdAt.Format(time.RFC3339),
		}); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		slog.Error("export participants: rows iteration failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	return nil
}

// ExportTeams: all teams
// Columns: id, name, game, school, captain, members_count, status, created_at
func (h *AdminExportHandler) ExportTeams(c *fiber.Ctx) error {
	ctx := c.Context()

	// Count rows BEFORE writing any bytes — see ExportParticipants for why.
	var rowCount int
	if err := h.db.QueryRow(ctx, `SELECT COUNT(*) FROM teams t`).Scan(&rowCount); err != nil {
		slog.Error("export teams: count query failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	if rowCount > maxExportRows {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, "Export melebihi batas 10.000 baris")
	}

	ts := time.Now().Format("20060102-150405")
	h.setCSVHeaders(c, fmt.Sprintf("teams-%s.csv", ts))

	query := `
		SELECT
			t.id::text,
			t.name,
			COALESCE(g.name, '')               AS game,
			COALESCE(s.name, '')               AS school,
			COALESCE(cap.full_name, '')        AS captain,
			COALESCE(mc.cnt, 0)                AS members_count,
			t.status,
			t.created_at
		FROM teams t
		LEFT JOIN games   g   ON g.id = t.game_id
		LEFT JOIN schools s   ON s.id = t.school_id
		LEFT JOIN users   cap ON cap.id = t.captain_user_id
		LEFT JOIN (
			SELECT team_id, COUNT(*)::int AS cnt
			FROM team_members
			GROUP BY team_id
		) mc ON mc.team_id = t.id
		ORDER BY t.created_at DESC
	`

	rows, err := h.db.Query(ctx, query)
	if err != nil {
		slog.Error("export teams: query failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	defer rows.Close()

	w := csv.NewWriter(c.Response().BodyWriter())
	defer w.Flush()

	if err := w.Write([]string{"id", "name", "game", "school", "captain", "members_count", "status", "created_at"}); err != nil {
		return err
	}

	streamedRows := 0
	for rows.Next() {
		streamedRows++
		if streamedRows > maxExportRows {
			// Defensive only (TOCTOU) — see ExportParticipants. Body already
			// started streaming, so stop and flush instead of erroring mid-body.
			slog.Warn("export teams: row count grew past cap mid-stream, truncating output")
			break
		}
		var (
			id, name, game, school, captain, status string
			membersCount                            int
			createdAt                               time.Time
		)
		if err := rows.Scan(&id, &name, &game, &school, &captain, &membersCount, &status, &createdAt); err != nil {
			slog.Error("export teams: scan failed", "error", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
		}
		if err := w.Write([]string{
			id, escapeCSV(name), escapeCSV(game), escapeCSV(school), escapeCSV(captain),
			fmt.Sprintf("%d", membersCount),
			escapeCSV(status),
			createdAt.Format(time.RFC3339),
		}); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		slog.Error("export teams: rows iteration failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	return nil
}

// ExportSchools: all schools
// Columns: id, name, level, address, city, coach_phone, teams_count
// Note: schools table has no NPSN column; level/city included instead.
func (h *AdminExportHandler) ExportSchools(c *fiber.Ctx) error {
	ctx := c.Context()

	// Count rows BEFORE writing any bytes — see ExportParticipants for why.
	var rowCount int
	if err := h.db.QueryRow(ctx, `SELECT COUNT(*) FROM schools s`).Scan(&rowCount); err != nil {
		slog.Error("export schools: count query failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	if rowCount > maxExportRows {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, "Export melebihi batas 10.000 baris")
	}

	ts := time.Now().Format("20060102-150405")
	h.setCSVHeaders(c, fmt.Sprintf("schools-%s.csv", ts))

	query := `
		SELECT
			s.id::text,
			s.name,
			s.level,
			COALESCE(s.address, '')      AS address,
			COALESCE(s.city, '')         AS city,
			COALESCE(s.coach_phone, '')  AS coach_phone,
			COALESCE(tc.cnt, 0)          AS teams_count
		FROM schools s
		LEFT JOIN (
			SELECT school_id, COUNT(*)::int AS cnt
			FROM teams
			WHERE school_id IS NOT NULL
			GROUP BY school_id
		) tc ON tc.school_id = s.id
		ORDER BY s.name ASC
	`

	rows, err := h.db.Query(ctx, query)
	if err != nil {
		slog.Error("export schools: query failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	defer rows.Close()

	w := csv.NewWriter(c.Response().BodyWriter())
	defer w.Flush()

	if err := w.Write([]string{"id", "name", "level", "address", "city", "coach_phone", "teams_count"}); err != nil {
		return err
	}

	streamedRows := 0
	for rows.Next() {
		streamedRows++
		if streamedRows > maxExportRows {
			// Defensive only (TOCTOU) — see ExportParticipants. Body already
			// started streaming, so stop and flush instead of erroring mid-body.
			slog.Warn("export schools: row count grew past cap mid-stream, truncating output")
			break
		}
		var (
			id, name, level, address, city, coachPhone string
			teamsCount                                 int
		)
		if err := rows.Scan(&id, &name, &level, &address, &city, &coachPhone, &teamsCount); err != nil {
			slog.Error("export schools: scan failed", "error", err)
			return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
		}
		if err := w.Write([]string{
			id, escapeCSV(name), escapeCSV(level), escapeCSV(address), escapeCSV(city), escapeCSV(coachPhone),
			fmt.Sprintf("%d", teamsCount),
		}); err != nil {
			return err
		}
	}
	if err := rows.Err(); err != nil {
		slog.Error("export schools: rows iteration failed", "error", err)
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengekspor data")
	}
	return nil
}
