package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/porjar-denpasar/porjar-api/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("failed to load config:", err)
	}

	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBSSLMode,
	)

	ctx := context.Background()
	db, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatal("failed to connect to database:", err)
	}
	defer db.Close()

	rows, err := db.Query(ctx, `
		SELECT id, format, name
		FROM tournaments
		WHERE status = 'completed' AND champion_team_id IS NULL
		ORDER BY end_date NULLS LAST
	`)
	if err != nil {
		log.Fatal("query tournaments:", err)
	}

	type tRow struct {
		ID     string
		Format string
		Name   string
	}
	var tournaments []tRow
	for rows.Next() {
		var t tRow
		if err := rows.Scan(&t.ID, &t.Format, &t.Name); err != nil {
			log.Fatal("scan tournament:", err)
		}
		tournaments = append(tournaments, t)
	}
	rows.Close()

	total := len(tournaments)
	updated := 0
	skipped := 0

	for _, t := range tournaments {
		var winnerTeamID sql.NullString
		var err error

		switch t.Format {
		case "single_elimination", "double_elimination":
			winnerTeamID, err = findBracketWinner(ctx, db, t.ID)
		case "battle_royale_points":
			winnerTeamID, err = findBRWinner(ctx, db, t.ID)
		case "group_stage_playoff", "round_robin", "swiss":
			winnerTeamID, err = findGroupWinner(ctx, db, t.ID)
		default:
			log.Printf("[skip] tournament %s: unsupported format %q", t.ID, t.Format)
			skipped++
			continue
		}

		if err != nil {
			log.Printf("[error] tournament %s (%s): %v", t.ID, t.Name, err)
			skipped++
			continue
		}
		if !winnerTeamID.Valid || winnerTeamID.String == "" {
			log.Printf("[skip] tournament %s (%s): no winner found", t.ID, t.Name)
			skipped++
			continue
		}

		teamName, teamLogo, err := lookupTeam(ctx, db, winnerTeamID.String)
		if err != nil {
			log.Printf("[error] tournament %s lookup team %s: %v", t.ID, winnerTeamID.String, err)
			skipped++
			continue
		}

		_, err = db.Exec(ctx, `
			UPDATE tournaments
			SET champion_team_id = $1, champion_team_name = $2, champion_team_logo = $3, updated_at = NOW()
			WHERE id = $4
		`, winnerTeamID.String, teamName, nullableString(teamLogo), t.ID)
		if err != nil {
			log.Printf("[error] update tournament %s: %v", t.ID, err)
			skipped++
			continue
		}

		updated++
		log.Printf("[ok] %s (%s) -> %s", t.Name, t.Format, teamName)
	}

	fmt.Printf("\nUpdated %d of %d tournaments (%d skipped)\n", updated, total, skipped)
}

func findBracketWinner(ctx context.Context, db *pgxpool.Pool, tournamentID string) (sql.NullString, error) {
	var winnerID sql.NullString
	// Final match: completed, no next_match_id (in single elim) OR the match with the highest round
	// that has no next_match_id and a winner. For double elim, the grand final also has no next_match_id.
	err := db.QueryRow(ctx, `
		SELECT winner_id
		FROM bracket_matches
		WHERE tournament_id = $1
		  AND status = 'completed'
		  AND next_match_id IS NULL
		  AND winner_id IS NOT NULL
		ORDER BY round DESC, match_number DESC
		LIMIT 1
	`, tournamentID).Scan(&winnerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return sql.NullString{}, nil
		}
		return sql.NullString{}, err
	}
	return winnerID, nil
}

func findBRWinner(ctx context.Context, db *pgxpool.Pool, tournamentID string) (sql.NullString, error) {
	var winnerID sql.NullString
	err := db.QueryRow(ctx, `
		SELECT r.team_id
		FROM br_lobby_results r
		JOIN br_lobbies l ON l.id = r.lobby_id
		WHERE l.tournament_id = $1 AND r.team_id IS NOT NULL
		GROUP BY r.team_id
		ORDER BY SUM(COALESCE(r.total_points, 0)) DESC
		LIMIT 1
	`, tournamentID).Scan(&winnerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return sql.NullString{}, nil
		}
		return sql.NullString{}, err
	}
	return winnerID, nil
}

func findGroupWinner(ctx context.Context, db *pgxpool.Pool, tournamentID string) (sql.NullString, error) {
	// Prefer playoff bracket winner if any bracket_matches exist for this tournament
	winner, err := findBracketWinner(ctx, db, tournamentID)
	if err == nil && winner.Valid {
		return winner, nil
	}
	// Otherwise, top of group_standings across all groups
	var winnerID sql.NullString
	err = db.QueryRow(ctx, `
		SELECT s.team_id
		FROM group_standings s
		JOIN tournament_groups g ON g.id = s.group_id
		WHERE g.tournament_id = $1 AND s.team_id IS NOT NULL
		ORDER BY s.points DESC, s.goal_difference DESC, s.goals_for DESC
		LIMIT 1
	`, tournamentID).Scan(&winnerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return sql.NullString{}, nil
		}
		return sql.NullString{}, err
	}
	return winnerID, nil
}

func lookupTeam(ctx context.Context, db *pgxpool.Pool, teamID string) (string, string, error) {
	var name string
	var teamLogo, schoolLogo sql.NullString
	err := db.QueryRow(ctx, `
		SELECT t.name, t.logo_url, s.logo_url
		FROM teams t
		LEFT JOIN schools s ON s.id = t.school_id
		WHERE t.id = $1
	`, teamID).Scan(&name, &teamLogo, &schoolLogo)
	if err != nil {
		return "", "", err
	}
	if teamLogo.Valid && teamLogo.String != "" {
		return name, teamLogo.String, nil
	}
	if schoolLogo.Valid {
		return name, schoolLogo.String, nil
	}
	return name, "", nil
}

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
