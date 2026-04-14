//go:build ignore

// gen_brackets.go generates bracket matches for all tournaments listed in
// /tmp/bracket_seeds.json (produced by setup_tournaments.py).
//
// Run inside the Docker container:
//
//	docker exec porjar-api-dev sh -c "cd /app && set -a && source .env && set +a && go run ./scripts/gen_brackets.go"
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/porjar-denpasar/porjar-api/internal/config"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

const seedsFile = "/tmp/bracket_seeds.json"

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

	if err := db.Ping(ctx); err != nil {
		log.Fatal("database ping failed:", err)
	}
	fmt.Println("Database connected.")

	// ── Read seeds file ──────────────────────────────────────────────────────
	data, err := os.ReadFile(seedsFile)
	if err != nil {
		log.Fatalf("failed to read %s: %v", seedsFile, err)
	}

	// JSON structure: { "tournament_id": { "team_id": seed, ... }, ... }
	var rawSeeds map[string]map[string]int
	if err := json.Unmarshal(data, &rawSeeds); err != nil {
		log.Fatalf("failed to parse %s: %v", seedsFile, err)
	}
	fmt.Printf("Loaded seeds for %d tournaments from %s\n", len(rawSeeds), seedsFile)

	// ── Instantiate repositories ─────────────────────────────────────────────
	tournamentRepo := repository.NewTournamentRepo(db)
	teamRepo       := repository.NewTeamRepo(db)
	bracketRepo    := repository.NewBracketRepo(db)
	ttRepo         := repository.NewTournamentTeamRepo(db)
	standingsRepo  := repository.NewStandingsRepo(db)
	matchGameRepo  := repository.NewMatchGameRepo(db)

	// WebSocket hub is not needed for bracket generation; pass nil.
	bracketSvc := service.NewBracketService(
		bracketRepo,
		matchGameRepo,
		tournamentRepo,
		ttRepo,
		teamRepo,
		standingsRepo,
		nil, // hub — not needed for generation
	)

	// ── Generate brackets ────────────────────────────────────────────────────
	var (
		generated int
		skipped   int
		failed    int
	)

	for tournamentIDStr, seedMap := range rawSeeds {
		tournamentID, err := uuid.Parse(tournamentIDStr)
		if err != nil {
			log.Printf("[ERROR] Invalid tournament UUID '%s': %v", tournamentIDStr, err)
			failed++
			continue
		}

		// Fetch tournament for display name
		t, err := tournamentRepo.FindByID(ctx, tournamentID)
		if err != nil || t == nil {
			log.Printf("[ERROR] Tournament %s not found: %v", tournamentIDStr, err)
			failed++
			continue
		}

		fmt.Printf("\n── %s (%s) ──────────────────────────────\n", t.Name, tournamentIDStr)

		// Check if bracket already exists
		existing, err := bracketRepo.ListByTournament(ctx, tournamentID)
		if err != nil {
			log.Printf("[ERROR] Failed to check existing bracket for '%s': %v", t.Name, err)
			failed++
			continue
		}
		if len(existing) > 0 {
			fmt.Printf("   [SKIP] Bracket already generated (%d matches exist)\n", len(existing))
			skipped++
			continue
		}

		// Convert seed map: map[string]int → map[uuid.UUID]int
		// Normalize seeds to 1..N (preserving relative order) to handle
		// Challonge seeds that have gaps or numbers larger than the team count.
		type teamSeed struct {
			id   uuid.UUID
			seed int
		}
		var pairs []teamSeed
		for teamIDStr, seed := range seedMap {
			teamID, err := uuid.Parse(teamIDStr)
			if err != nil {
				log.Printf("   [WARN] Invalid team UUID '%s': %v", teamIDStr, err)
				continue
			}
			pairs = append(pairs, teamSeed{id: teamID, seed: seed})
		}
		// Sort by original Challonge seed
		sort.Slice(pairs, func(i, j int) bool { return pairs[i].seed < pairs[j].seed })
		// Re-assign contiguous seeds 1..N
		manualSeeds := make(map[uuid.UUID]int, len(pairs))
		for i, p := range pairs {
			manualSeeds[p.id] = i + 1
		}

		matchesCreated, totalRounds, err := bracketSvc.GenerateBracket(ctx, tournamentID, manualSeeds)
		if err != nil {
			log.Printf("   [ERROR] GenerateBracket failed for '%s': %v", t.Name, err)
			failed++
			continue
		}

		fmt.Printf("   [OK] Generated %d matches across %d rounds\n", matchesCreated, totalRounds)
		generated++
	}

	// ── Summary ──────────────────────────────────────────────────────────────
	fmt.Println()
	fmt.Println("═══════════════════════════════════════")
	fmt.Printf("Brackets generated: %d\n", generated)
	fmt.Printf("Skipped (existing): %d\n", skipped)
	fmt.Printf("Errors:             %d\n", failed)
	fmt.Println("═══════════════════════════════════════")
}
