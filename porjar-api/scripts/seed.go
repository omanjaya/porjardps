package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

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

	fmt.Println("seeding games...")
	seedGames(ctx, db)

	fmt.Println("seeding schools...")
	seedSchools(ctx, db)

	fmt.Println("seeding test accounts...")
	seedUsers(ctx, db)

	fmt.Println("seeding achievements...")
	seedAchievements(ctx, db)

	fmt.Println("seeding e2e test data...")
	seedE2EData(ctx, db)

	fmt.Println("seed complete!")
}

func seedGames(ctx context.Context, db *pgxpool.Pool) {
	games := []struct {
		name, slug, gameType string
		min, max, subs       int
	}{
		{"Honor of Kings", "hok", "bracket", 5, 5, 1},
		{"Mobile Legends: Bang Bang", "ml", "bracket", 5, 5, 1},
		{"Free Fire", "ff", "battle_royale", 4, 4, 1},
		{"PUBG Mobile", "pubgm", "battle_royale", 4, 4, 1},
		{"eFootball", "efootball", "bracket", 1, 1, 0},
	}

	for _, g := range games {
		_, err := db.Exec(ctx,
			`INSERT INTO games (name, slug, min_team_members, max_team_members, max_substitutes, game_type)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (slug) DO NOTHING`,
			g.name, g.slug, g.min, g.max, g.subs, g.gameType,
		)
		if err != nil {
			log.Printf("  warn: game %s: %v", g.slug, err)
		}
	}
}

func seedSchools(ctx context.Context, db *pgxpool.Pool) {
	schools := []struct {
		name, level string
	}{
		// SMP Negeri
		{"SMP Negeri 1 Denpasar", "SMP"},
		{"SMP Negeri 2 Denpasar", "SMP"},
		{"SMP Negeri 3 Denpasar", "SMP"},
		{"SMP Negeri 4 Denpasar", "SMP"},
		{"SMP Negeri 5 Denpasar", "SMP"},
		{"SMP Negeri 6 Denpasar", "SMP"},
		{"SMP Negeri 7 Denpasar", "SMP"},
		{"SMP Negeri 8 Denpasar", "SMP"},
		{"SMP Negeri 9 Denpasar", "SMP"},
		{"SMP Negeri 10 Denpasar", "SMP"},
		{"SMP Negeri 11 Denpasar", "SMP"},
		{"SMP Negeri 12 Denpasar", "SMP"},
		// SMA Negeri
		{"SMA Negeri 1 Denpasar", "SMA"},
		{"SMA Negeri 2 Denpasar", "SMA"},
		{"SMA Negeri 3 Denpasar", "SMA"},
		{"SMA Negeri 4 Denpasar", "SMA"},
		{"SMA Negeri 5 Denpasar", "SMA"},
		{"SMA Negeri 6 Denpasar", "SMA"},
		{"SMA Negeri 7 Denpasar", "SMA"},
		{"SMA Negeri 8 Denpasar", "SMA"},
		// SMK Negeri
		{"SMK Negeri 1 Denpasar", "SMK"},
		{"SMK Negeri 2 Denpasar", "SMK"},
		{"SMK Negeri 3 Denpasar", "SMK"},
		{"SMK Negeri 4 Denpasar", "SMK"},
		{"SMK Negeri 5 Denpasar", "SMK"},
		// Swasta
		{"SMP Dwijendra Denpasar", "SMP"},
		{"SMA Dwijendra Denpasar", "SMA"},
		{"SMP Harapan Denpasar", "SMP"},
		{"SMA Harapan Denpasar", "SMA"},
		{"SMP Saraswati Denpasar", "SMP"},
		{"SMA Saraswati Denpasar", "SMA"},
		{"SMP Santo Yoseph Denpasar", "SMP"},
		{"SMA Santo Yoseph Denpasar", "SMA"},
		// SMA Negeri tambahan
		{"SMA Negeri 9 Denpasar", "SMA"},
		{"SMA Negeri 10 Denpasar", "SMA"},
		{"SMA Negeri 11 Denpasar", "SMA"},
		{"SMA Negeri 12 Denpasar", "SMA"},
		// SMK Negeri tambahan
		{"SMK Negeri 6 Denpasar", "SMK"},
		{"SMK Negeri 7 Denpasar", "SMK"},
		// SMA Swasta tambahan
		{"SMA Muhammadiyah Denpasar", "SMA"},
		{"SMA Kristen Harapan Denpasar", "SMA"},
		{"SMA CHIS Denpasar", "SMA"},
		{"MA Al-Kalifa Denpasar", "SMA"},
		{"SMA Tunas Daud Denpasar", "SMA"},
		// SMK Swasta tambahan
		{"SMK Bina Madina Denpasar", "SMK"},
		{"SMK Kertha Wisata Denpasar", "SMK"},
		{"SMK Penerbangan Denpasar", "SMK"},
		{"SMK PGRI 1 Denpasar", "SMK"},
		{"SMK PGRI 3 Denpasar", "SMK"},
	}

	for _, s := range schools {
		_, err := db.Exec(ctx,
			`INSERT INTO schools (name, level) VALUES ($1, $2)
			 ON CONFLICT DO NOTHING`,
			s.name, s.level,
		)
		if err != nil {
			log.Printf("  warn: school %s: %v", s.name, err)
		}
	}
}

func seedAchievements(ctx context.Context, db *pgxpool.Pool) {
	achievements := []struct {
		slug, name, description, icon, category string
		criteria                                string
	}{
		{
			"first_blood", "Pertama Kali Menang", "Menangkan pertandingan pertama kamu",
			"Trophy", "match", `{"wins": 1}`,
		},
		{
			"mvp_star", "Bintang MVP", "Dapatkan MVP sebanyak 3 kali",
			"Star", "match", `{"mvp_count": 3}`,
		},
		{
			"champion", "Juara", "Menangkan sebuah turnamen",
			"Crown", "tournament", `{"tournament_win": 1}`,
		},
		{
			"undefeated", "Tak Terkalahkan", "Menangkan 5 pertandingan berturut-turut",
			"ShieldCheck", "match", `{"win_streak": 5}`,
		},
		{
			"team_player", "Pemain Tim", "Bermain di 3 tim yang berbeda",
			"UsersThree", "social", `{"team_count": 3}`,
		},
		{
			"veteran", "Veteran", "Bermain lebih dari 10 pertandingan",
			"Medal", "match", `{"matches_played": 10}`,
		},
		{
			"killer", "Top Fragger", "Dapatkan 50+ total kills di game Battle Royale",
			"Crosshair", "match", `{"total_kills": 50}`,
		},
	}

	for _, a := range achievements {
		_, err := db.Exec(ctx,
			`INSERT INTO achievements (slug, name, description, icon, category, criteria)
			 VALUES ($1, $2, $3, $4, $5, $6::jsonb)
			 ON CONFLICT (slug) DO NOTHING`,
			a.slug, a.name, a.description, a.icon, a.category, a.criteria,
		)
		if err != nil {
			log.Printf("  warn: achievement %s: %v", a.slug, err)
		}
	}
}

func seedUsers(ctx context.Context, db *pgxpool.Pool) {
	users := []struct {
		email, password, name, role string
	}{
		{"admin@porjar.test", "Admin1234", "Admin Porjar", "admin"},
		{"superadmin@porjar.test", "Super1234", "Super Admin Porjar", "superadmin"},
		{"player1@porjar.test", "Player1234", "Player Satu", "player"},
		{"player2@porjar.test", "Player1234", "Player Dua", "player"},
	}

	for _, u := range users {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), bcrypt.DefaultCost)
		if err != nil {
			log.Printf("  warn: hash for %s: %v", u.email, err)
			continue
		}

		_, err = db.Exec(ctx,
			`INSERT INTO users (email, password_hash, full_name, role)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (email) DO NOTHING`,
			u.email, string(hash), u.name, u.role,
		)
		if err != nil {
			log.Printf("  warn: user %s: %v", u.email, err)
		}
	}
}

// seedE2EData creates the additional test data required by the Playwright E2E tests.
// It is idempotent — all inserts use ON CONFLICT DO NOTHING.
func seedE2EData(ctx context.Context, db *pgxpool.Pool) {
	// ── Fetch prerequisite IDs ──────────────────────────────────────────────

	// Get player1 and player2 user IDs
	var player1ID, player2ID string
	err := db.QueryRow(ctx, `SELECT id FROM users WHERE email = 'player1@porjar.test'`).Scan(&player1ID)
	if err != nil {
		log.Fatalf("  fatal: player1 not found (run seed first): %v", err)
	}
	err = db.QueryRow(ctx, `SELECT id FROM users WHERE email = 'player2@porjar.test'`).Scan(&player2ID)
	if err != nil {
		log.Fatalf("  fatal: player2 not found: %v", err)
	}

	// Get game IDs
	var mlGameID, ffGameID string
	err = db.QueryRow(ctx, `SELECT id FROM games WHERE slug = 'ml'`).Scan(&mlGameID)
	if err != nil {
		log.Fatalf("  fatal: ml game not found: %v", err)
	}
	err = db.QueryRow(ctx, `SELECT id FROM games WHERE slug = 'ff'`).Scan(&ffGameID)
	if err != nil {
		log.Fatalf("  fatal: ff game not found: %v", err)
	}

	// Get a school ID
	var school1ID string
	err = db.QueryRow(ctx, `SELECT id FROM schools WHERE name = 'SMA Negeri 1 Denpasar'`).Scan(&school1ID)
	if err != nil {
		log.Fatalf("  fatal: school not found: %v", err)
	}
	var school2ID string
	err = db.QueryRow(ctx, `SELECT id FROM schools WHERE name = 'SMA Negeri 2 Denpasar'`).Scan(&school2ID)
	if err != nil {
		log.Fatalf("  fatal: school2 not found: %v", err)
	}

	// ── Teams ───────────────────────────────────────────────────────────────

	// Team for player1 (captain) — for team-detail tests
	var team1ID string
	err = db.QueryRow(ctx,
		`INSERT INTO teams (name, school_id, game_id, captain_user_id, status)
		 VALUES ('Alpha Dragons', $1, $2, $3, 'approved')
		 ON CONFLICT (name, game_id) DO NOTHING
		 RETURNING id`,
		school1ID, mlGameID, player1ID,
	).Scan(&team1ID)
	if err != nil {
		// Team may already exist — look it up
		err = db.QueryRow(ctx,
			`SELECT id FROM teams WHERE name = 'Alpha Dragons' AND game_id = $1`, mlGameID,
		).Scan(&team1ID)
		if err != nil {
			log.Fatalf("  fatal: could not create/find team1: %v", err)
		}
	}
	fmt.Printf("  team1 (Alpha Dragons): %s\n", team1ID)

	// Team for player2 — for public team tests and as opponent
	var team2ID string
	err = db.QueryRow(ctx,
		`INSERT INTO teams (name, school_id, game_id, captain_user_id, status)
		 VALUES ('Beta Warriors', $1, $2, $3, 'approved')
		 ON CONFLICT (name, game_id) DO NOTHING
		 RETURNING id`,
		school2ID, mlGameID, player2ID,
	).Scan(&team2ID)
	if err != nil {
		err = db.QueryRow(ctx,
			`SELECT id FROM teams WHERE name = 'Beta Warriors' AND game_id = $1`, mlGameID,
		).Scan(&team2ID)
		if err != nil {
			log.Fatalf("  fatal: could not create/find team2: %v", err)
		}
	}
	fmt.Printf("  team2 (Beta Warriors): %s\n", team2ID)

	// BR team for player1 — Free Fire
	var team1BrID string
	err = db.QueryRow(ctx,
		`INSERT INTO teams (name, school_id, game_id, captain_user_id, status)
		 VALUES ('Alpha Fire Squad', $1, $2, $3, 'approved')
		 ON CONFLICT (name, game_id) DO NOTHING
		 RETURNING id`,
		school1ID, ffGameID, player1ID,
	).Scan(&team1BrID)
	if err != nil {
		err = db.QueryRow(ctx,
			`SELECT id FROM teams WHERE name = 'Alpha Fire Squad' AND game_id = $1`, ffGameID,
		).Scan(&team1BrID)
		if err != nil {
			log.Fatalf("  fatal: could not create/find team1BR: %v", err)
		}
	}
	fmt.Printf("  team1BR (Alpha Fire Squad): %s\n", team1BrID)

	// ── Team Members ────────────────────────────────────────────────────────

	// player1 as captain of team1
	_, err = db.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, in_game_name, role)
		 VALUES ($1, $2, 'AlphaCaptain', 'captain')
		 ON CONFLICT (team_id, user_id) DO NOTHING`,
		team1ID, player1ID,
	)
	if err != nil {
		log.Printf("  warn: team_member player1 in team1: %v", err)
	}

	// player2 as captain of team2
	_, err = db.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, in_game_name, role)
		 VALUES ($1, $2, 'BetaCaptain', 'captain')
		 ON CONFLICT (team_id, user_id) DO NOTHING`,
		team2ID, player2ID,
	)
	if err != nil {
		log.Printf("  warn: team_member player2 in team2: %v", err)
	}

	// player1 as captain of BR team
	_, err = db.Exec(ctx,
		`INSERT INTO team_members (team_id, user_id, in_game_name, role)
		 VALUES ($1, $2, 'AlphaFireCaptain', 'captain')
		 ON CONFLICT (team_id, user_id) DO NOTHING`,
		team1BrID, player1ID,
	)
	if err != nil {
		log.Printf("  warn: team_member player1 in team1BR: %v", err)
	}

	// ── Tournaments ─────────────────────────────────────────────────────────

	// Bracket tournament (ML) — ongoing
	var tournamentMLID string
	now := time.Now()
	err = db.QueryRow(ctx,
		`INSERT INTO tournaments
		   (name, game_id, format, stage, best_of, max_teams, status,
		    registration_start, registration_end, start_date, end_date)
		 VALUES ('Porjar ML Championship 2025', $1, 'single_elimination', 'main', 3, 16, 'ongoing',
		         $2, $3, $4, $5)
		 ON CONFLICT DO NOTHING
		 RETURNING id`,
		mlGameID,
		now.Add(-30*24*time.Hour),
		now.Add(-7*24*time.Hour),
		now.Add(-3*24*time.Hour),
		now.Add(30*24*time.Hour),
	).Scan(&tournamentMLID)
	if err != nil {
		err = db.QueryRow(ctx,
			`SELECT id FROM tournaments WHERE name = 'Porjar ML Championship 2025'`,
		).Scan(&tournamentMLID)
		if err != nil {
			log.Fatalf("  fatal: could not create/find ML tournament: %v", err)
		}
	}
	fmt.Printf("  tournament ML: %s\n", tournamentMLID)

	// BR tournament (Free Fire) — ongoing
	var tournamentFFID string
	err = db.QueryRow(ctx,
		`INSERT INTO tournaments
		   (name, game_id, format, stage, best_of, max_teams, status,
		    registration_start, registration_end, start_date, end_date)
		 VALUES ('Porjar Free Fire Cup 2025', $1, 'battle_royale_points', 'main', 1, 32, 'ongoing',
		         $2, $3, $4, $5)
		 ON CONFLICT DO NOTHING
		 RETURNING id`,
		ffGameID,
		now.Add(-30*24*time.Hour),
		now.Add(-7*24*time.Hour),
		now.Add(-3*24*time.Hour),
		now.Add(30*24*time.Hour),
	).Scan(&tournamentFFID)
	if err != nil {
		err = db.QueryRow(ctx,
			`SELECT id FROM tournaments WHERE name = 'Porjar Free Fire Cup 2025'`,
		).Scan(&tournamentFFID)
		if err != nil {
			log.Fatalf("  fatal: could not create/find FF tournament: %v", err)
		}
	}
	fmt.Printf("  tournament FF: %s\n", tournamentFFID)

	// ── Tournament Team Enrollments ──────────────────────────────────────────

	_, err = db.Exec(ctx,
		`INSERT INTO tournament_teams (tournament_id, team_id, status)
		 VALUES ($1, $2, 'active')
		 ON CONFLICT (tournament_id, team_id) DO NOTHING`,
		tournamentMLID, team1ID,
	)
	if err != nil {
		log.Printf("  warn: tournament_team team1 in ML: %v", err)
	}

	_, err = db.Exec(ctx,
		`INSERT INTO tournament_teams (tournament_id, team_id, status)
		 VALUES ($1, $2, 'active')
		 ON CONFLICT (tournament_id, team_id) DO NOTHING`,
		tournamentMLID, team2ID,
	)
	if err != nil {
		log.Printf("  warn: tournament_team team2 in ML: %v", err)
	}

	_, err = db.Exec(ctx,
		`INSERT INTO tournament_teams (tournament_id, team_id, status)
		 VALUES ($1, $2, 'active')
		 ON CONFLICT (tournament_id, team_id) DO NOTHING`,
		tournamentFFID, team1BrID,
	)
	if err != nil {
		log.Printf("  warn: tournament_team team1BR in FF: %v", err)
	}

	// ── Pending Teams (for admin approve/reject tests) ───────────────────────

	// Two pending teams — approve test takes the first, reject test takes the second.
	// Reset status to 'pending' so tests can always find them in the moderation queue.
	var pendingTeam1ID, pendingTeam2ID string
	err = db.QueryRow(ctx,
		`INSERT INTO teams (name, school_id, game_id, captain_user_id, status)
		 VALUES ('Gamma Strike', $1, $2, $3, 'pending')
		 ON CONFLICT (name, game_id) DO UPDATE SET status = 'pending'
		 RETURNING id`,
		school1ID, mlGameID, player1ID,
	).Scan(&pendingTeam1ID)
	if err != nil {
		log.Printf("  warn: could not create/reset pending team1: %v", err)
	}
	if pendingTeam1ID != "" {
		_, _ = db.Exec(ctx,
			`INSERT INTO team_members (team_id, user_id, in_game_name, role)
			 VALUES ($1, $2, 'GammaCaptain', 'captain')
			 ON CONFLICT (team_id, user_id) DO NOTHING`,
			pendingTeam1ID, player1ID,
		)
		fmt.Printf("  pending_team1 (Gamma Strike): %s\n", pendingTeam1ID)
	}

	err = db.QueryRow(ctx,
		`INSERT INTO teams (name, school_id, game_id, captain_user_id, status)
		 VALUES ('Delta Force', $1, $2, $3, 'pending')
		 ON CONFLICT (name, game_id) DO UPDATE SET status = 'pending'
		 RETURNING id`,
		school2ID, mlGameID, player2ID,
	).Scan(&pendingTeam2ID)
	if err != nil {
		log.Printf("  warn: could not create/reset pending team2: %v", err)
	}
	if pendingTeam2ID != "" {
		_, _ = db.Exec(ctx,
			`INSERT INTO team_members (team_id, user_id, in_game_name, role)
			 VALUES ($1, $2, 'DeltaCaptain', 'captain')
			 ON CONFLICT (team_id, user_id) DO NOTHING`,
			pendingTeam2ID, player2ID,
		)
		fmt.Printf("  pending_team2 (Delta Force): %s\n", pendingTeam2ID)
	}

	// ── Bracket Matches ──────────────────────────────────────────────────────

	// Active (scheduled) bracket match — player1's team vs team2
	var bracketMatch1ID string
	scheduledAt := now.Add(2 * time.Hour)
	err = db.QueryRow(ctx,
		`INSERT INTO bracket_matches
		   (tournament_id, round, match_number, bracket_position,
		    team_a_id, team_b_id, status, scheduled_at)
		 VALUES ($1, 1, 1, 'R1M1', $2, $3, 'scheduled', $4)
		 ON CONFLICT DO NOTHING
		 RETURNING id`,
		tournamentMLID, team1ID, team2ID, scheduledAt,
	).Scan(&bracketMatch1ID)
	if err != nil {
		err = db.QueryRow(ctx,
			`SELECT id FROM bracket_matches
			 WHERE tournament_id = $1 AND round = 1 AND match_number = 1`,
			tournamentMLID,
		).Scan(&bracketMatch1ID)
		if err != nil {
			log.Fatalf("  fatal: could not create/find bracket match 1: %v", err)
		}
	}
	fmt.Printf("  bracket_match1 (scheduled): %s\n", bracketMatch1ID)

	// Completed bracket match — for /matches/recent API and /matches/[id] page
	var bracketMatch2ID string
	completedAt := now.Add(-24 * time.Hour)
	err = db.QueryRow(ctx,
		`INSERT INTO bracket_matches
		   (tournament_id, round, match_number, bracket_position,
		    team_a_id, team_b_id, winner_id, score_a, score_b,
		    status, scheduled_at, completed_at)
		 VALUES ($1, 1, 2, 'R1M2', $2, $3, $2, 2, 0, 'completed', $4, $5)
		 ON CONFLICT DO NOTHING
		 RETURNING id`,
		tournamentMLID, team1ID, team2ID,
		completedAt.Add(-2*time.Hour), completedAt,
	).Scan(&bracketMatch2ID)
	if err != nil {
		err = db.QueryRow(ctx,
			`SELECT id FROM bracket_matches
			 WHERE tournament_id = $1 AND round = 1 AND match_number = 2`,
			tournamentMLID,
		).Scan(&bracketMatch2ID)
		if err != nil {
			log.Printf("  warn: could not create/find completed bracket match: %v", err)
		}
	}
	fmt.Printf("  bracket_match2 (completed): %s\n", bracketMatch2ID)

	// ── Match Submissions (for admin submission detail/approve/reject tests) ──
	// Reset or insert pending submissions — tests may approve/reject them, so we
	// always restore them to 'pending' so the admin workflow tests can run.

	// Submission from team1 for bracketMatch1 — status pending
	var sub1ID string
	err = db.QueryRow(ctx,
		`UPDATE match_submissions
		    SET status = 'pending', verified_by = NULL, verified_at = NULL,
		        rejection_reason = NULL, admin_notes = NULL
		  WHERE bracket_match_id = $1 AND team_id = $2
		  RETURNING id`,
		bracketMatch1ID, team1ID,
	).Scan(&sub1ID)
	if err != nil {
		// No existing row — insert fresh
		err = db.QueryRow(ctx,
			`INSERT INTO match_submissions
			   (bracket_match_id, submitted_by, team_id, claimed_winner_id,
			    claimed_score_a, claimed_score_b, screenshot_urls, status)
			 VALUES ($1, $2, $3, $3, 2, 0, ARRAY['https://example.com/screenshot1.png'], 'pending')
			 RETURNING id`,
			bracketMatch1ID, player1ID, team1ID,
		).Scan(&sub1ID)
		if err != nil {
			log.Printf("  warn: could not create/reset submission1: %v", err)
		}
	}
	if sub1ID != "" {
		fmt.Printf("  submission1 (pending, team1): %s\n", sub1ID)
	}

	// Submission from team2 for bracketMatch1 — status pending (for reject test)
	var sub2ID string
	err = db.QueryRow(ctx,
		`UPDATE match_submissions
		    SET status = 'pending', verified_by = NULL, verified_at = NULL,
		        rejection_reason = NULL, admin_notes = NULL
		  WHERE bracket_match_id = $1 AND team_id = $2
		  RETURNING id`,
		bracketMatch1ID, team2ID,
	).Scan(&sub2ID)
	if err != nil {
		// No existing row — insert fresh
		err = db.QueryRow(ctx,
			`INSERT INTO match_submissions
			   (bracket_match_id, submitted_by, team_id, claimed_winner_id,
			    claimed_score_a, claimed_score_b, screenshot_urls, status)
			 VALUES ($1, $2, $3, $3, 0, 2, ARRAY['https://example.com/screenshot2.png'], 'pending')
			 RETURNING id`,
			bracketMatch1ID, player2ID, team2ID,
		).Scan(&sub2ID)
		if err != nil {
			log.Printf("  warn: could not create/reset submission2: %v", err)
		}
	}
	if sub2ID != "" {
		fmt.Printf("  submission2 (pending, team2): %s\n", sub2ID)
	}

	// ── BR Lobby ──────────────────────────────────────────────────────────────

	// Active (scheduled) BR lobby — player1's FF team participates
	var brLobbyID string
	brScheduledAt := now.Add(3 * time.Hour)
	err = db.QueryRow(ctx,
		`INSERT INTO br_lobbies
		   (tournament_id, lobby_name, lobby_number, day_number,
		    room_id, room_password, status, scheduled_at)
		 VALUES ($1, 'Lobby Alpha Day 1', 1, 1, 'ROOM001', 'pass123', 'scheduled', $2)
		 ON CONFLICT DO NOTHING
		 RETURNING id`,
		tournamentFFID, brScheduledAt,
	).Scan(&brLobbyID)
	if err != nil {
		err = db.QueryRow(ctx,
			`SELECT id FROM br_lobbies WHERE tournament_id = $1 AND lobby_number = 1 AND day_number = 1`,
			tournamentFFID,
		).Scan(&brLobbyID)
		if err != nil {
			log.Fatalf("  fatal: could not create/find BR lobby: %v", err)
		}
	}
	fmt.Printf("  br_lobby1 (scheduled): %s\n", brLobbyID)

	// Enroll player1's BR team in the lobby
	_, err = db.Exec(ctx,
		`INSERT INTO br_lobby_teams (lobby_id, team_id)
		 VALUES ($1, $2)
		 ON CONFLICT (lobby_id, team_id) DO NOTHING`,
		brLobbyID, team1BrID,
	)
	if err != nil {
		log.Printf("  warn: br_lobby_team for team1BR: %v", err)
	}

	fmt.Println("  e2e seed data complete.")
}
