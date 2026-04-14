package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// ChallongeHandler handles importing brackets from Challonge.
type ChallongeHandler struct {
	apiKey         string
	bracketRepo    model.BracketRepository
	tournamentRepo model.TournamentRepository
	ttRepo         model.TournamentTeamRepository
	db             *pgxpool.Pool
}

func NewChallongeHandler(
	apiKey string,
	bracketRepo model.BracketRepository,
	tournamentRepo model.TournamentRepository,
	ttRepo model.TournamentTeamRepository,
	db *pgxpool.Pool,
) *ChallongeHandler {
	return &ChallongeHandler{
		apiKey:         apiKey,
		bracketRepo:    bracketRepo,
		tournamentRepo: tournamentRepo,
		ttRepo:         ttRepo,
		db:             db,
	}
}

// ── Challonge API types ──────────────────────────────────────────────

type challongeTournamentWrapper struct {
	Tournament challongeTournament `json:"tournament"`
}

type challongeTournament struct {
	ID                int    `json:"id"`
	Name              string `json:"name"`
	URL               string `json:"url"`
	TournamentType    string `json:"tournament_type"`
	State             string `json:"state"`
	ParticipantsCount int    `json:"participants_count"`
	ProgressMeter     int    `json:"progress_meter"`
}

type challongeParticipantWrapper struct {
	Participant challongeParticipant `json:"participant"`
}

type challongeParticipant struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
	Seed int    `json:"seed"`
}

type challongeMatchWrapper struct {
	Match challongeMatch `json:"match"`
}

type challongeMatch struct {
	ID                       int    `json:"id"`
	Round                    int    `json:"round"`
	SuggestedPlayOrder       int    `json:"suggested_play_order"`
	Player1ID                *int   `json:"player1_id"`
	Player2ID                *int   `json:"player2_id"`
	WinnerID                 *int   `json:"winner_id"`
	LoserID                  *int   `json:"loser_id"`
	ScoresCSV                string `json:"scores_csv"`
	State                    string `json:"state"`
	Player1PrereqMatchID     *int   `json:"player1_prereq_match_id"`
	Player2PrereqMatchID     *int   `json:"player2_prereq_match_id"`
	Player1IsPrereqMatchLoser bool  `json:"player1_is_prereq_match_loser"`
	Player2IsPrereqMatchLoser bool  `json:"player2_is_prereq_match_loser"`
}

// ── API helpers ──────────────────────────────────────────────────────

var challongeHTTP = &http.Client{Timeout: 15 * time.Second}

func (h *ChallongeHandler) challongeGet(path string) ([]byte, error) {
	sep := "?"
	if strings.Contains(path, "?") {
		sep = "&"
	}
	url := fmt.Sprintf("https://api.challonge.com/v1/%s%sapi_key=%s", path, sep, h.apiKey)
	resp, err := challongeHTTP.Get(url)
	if err != nil {
		return nil, fmt.Errorf("challonge request failed: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	if err != nil {
		return nil, fmt.Errorf("read challonge response: %w", err)
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("challonge API returned %d: %s", resp.StatusCode, string(body[:min(len(body), 200)]))
	}
	return body, nil
}

// ── Endpoints ────────────────────────────────────────────────────────

// ListTournaments returns all tournaments from the Challonge account.
// GET /admin/import/challonge/tournaments
func (h *ChallongeHandler) ListTournaments(c *fiber.Ctx) error {
	if h.apiKey == "" {
		return response.BadRequest(c, "CHALLONGE_API_KEY not configured")
	}

	data, err := h.challongeGet("tournaments.json?state=all")
	if err != nil {
		return response.BadRequest(c, err.Error())
	}

	var wrappers []challongeTournamentWrapper
	if err := json.Unmarshal(data, &wrappers); err != nil {
		return response.BadRequest(c, "Failed to parse Challonge response")
	}

	type tournamentItem struct {
		ID                int    `json:"id"`
		Name              string `json:"name"`
		Slug              string `json:"slug"`
		Type              string `json:"type"`
		State             string `json:"state"`
		ParticipantsCount int    `json:"participants_count"`
		ProgressMeter     int    `json:"progress_meter"`
	}

	items := make([]tournamentItem, 0, len(wrappers))
	for _, w := range wrappers {
		t := w.Tournament
		items = append(items, tournamentItem{
			ID:                t.ID,
			Name:              t.Name,
			Slug:              t.URL,
			Type:              t.TournamentType,
			State:             t.State,
			ParticipantsCount: t.ParticipantsCount,
			ProgressMeter:     t.ProgressMeter,
		})
	}

	return response.OK(c, items)
}

// PreviewTournament returns participants and matches for a Challonge tournament.
// GET /admin/import/challonge/tournaments/:slug/preview
func (h *ChallongeHandler) PreviewTournament(c *fiber.Ctx) error {
	if h.apiKey == "" {
		return response.BadRequest(c, "CHALLONGE_API_KEY not configured")
	}

	slug := c.Params("slug")
	if slug == "" {
		return response.BadRequest(c, "slug wajib diisi")
	}

	// Fetch participants
	pData, err := h.challongeGet(fmt.Sprintf("tournaments/%s/participants.json", slug))
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	var pWrappers []challongeParticipantWrapper
	if err := json.Unmarshal(pData, &pWrappers); err != nil {
		return response.BadRequest(c, "Failed to parse participants")
	}

	// Fetch matches
	mData, err := h.challongeGet(fmt.Sprintf("tournaments/%s/matches.json", slug))
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	var mWrappers []challongeMatchWrapper
	if err := json.Unmarshal(mData, &mWrappers); err != nil {
		return response.BadRequest(c, "Failed to parse matches")
	}

	type participantPreview struct {
		ID   int    `json:"id"`
		Name string `json:"name"`
		Seed int    `json:"seed"`
	}

	type matchPreview struct {
		ID                int    `json:"id"`
		Round             int    `json:"round"`
		MatchNumber       int    `json:"match_number"`
		Player1ID         *int   `json:"player1_id"`
		Player2ID         *int   `json:"player2_id"`
		WinnerID          *int   `json:"winner_id"`
		Scores            string `json:"scores"`
		State             string `json:"state"`
		BracketPosition   string `json:"bracket_position"`
	}

	participants := make([]participantPreview, 0, len(pWrappers))
	for _, pw := range pWrappers {
		p := pw.Participant
		participants = append(participants, participantPreview{
			ID:   p.ID,
			Name: p.Name,
			Seed: p.Seed,
		})
	}

	// Determine if double elimination (has negative rounds)
	hasNegativeRounds := false
	maxPositiveRound := 0
	for _, mw := range mWrappers {
		if mw.Match.Round < 0 {
			hasNegativeRounds = true
		}
		if mw.Match.Round > maxPositiveRound {
			maxPositiveRound = mw.Match.Round
		}
	}

	matches := make([]matchPreview, 0, len(mWrappers))
	for _, mw := range mWrappers {
		m := mw.Match
		bp := "winners"
		if m.Round < 0 {
			bp = "losers"
		} else if hasNegativeRounds && m.Round == maxPositiveRound {
			bp = "grand_final"
		}
		matches = append(matches, matchPreview{
			ID:              m.ID,
			Round:           m.Round,
			MatchNumber:     m.SuggestedPlayOrder,
			Player1ID:       m.Player1ID,
			Player2ID:       m.Player2ID,
			WinnerID:        m.WinnerID,
			Scores:          m.ScoresCSV,
			State:           m.State,
			BracketPosition: bp,
		})
	}

	return response.OK(c, fiber.Map{
		"participants": participants,
		"matches":      matches,
		"match_count":  len(matches),
	})
}

// ImportBracket imports a Challonge bracket into a Porjar tournament.
// POST /admin/import/challonge
// Body: { "challonge_slug": "abc", "tournament_id": "uuid", "team_mapping": { "123": "uuid", ... } }
func (h *ChallongeHandler) ImportBracket(c *fiber.Ctx) error {
	if h.apiKey == "" {
		return response.BadRequest(c, "CHALLONGE_API_KEY not configured")
	}

	var body struct {
		ChallongeSlug string            `json:"challonge_slug"`
		TournamentID  string            `json:"tournament_id"`
		TeamMapping   map[string]string `json:"team_mapping"` // challonge participant ID → porjar team UUID
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "Body tidak valid")
	}
	if body.ChallongeSlug == "" || body.TournamentID == "" {
		return response.BadRequest(c, "challonge_slug dan tournament_id wajib diisi")
	}

	tournamentID, err := uuid.Parse(body.TournamentID)
	if err != nil {
		return response.BadRequest(c, "tournament_id tidak valid")
	}

	// Parse team mapping: string keys → int (challonge participant ID) → uuid
	participantToTeam := make(map[int]uuid.UUID)
	for k, v := range body.TeamMapping {
		pid, err := strconv.Atoi(k)
		if err != nil {
			return response.BadRequest(c, fmt.Sprintf("Invalid participant ID: %s", k))
		}
		tid, err := uuid.Parse(v)
		if err != nil {
			return response.BadRequest(c, fmt.Sprintf("Invalid team UUID: %s", v))
		}
		participantToTeam[pid] = tid
	}

	// Validate tournament exists
	tournament, err := h.tournamentRepo.FindByID(c.Context(), tournamentID)
	if err != nil || tournament == nil {
		return response.BadRequest(c, "Tournament tidak ditemukan")
	}

	// Check no existing bracket
	existing, err := h.bracketRepo.ListByTournament(c.Context(), tournamentID)
	if err != nil {
		return response.BadRequest(c, "Gagal cek bracket existing")
	}
	if len(existing) > 0 {
		return response.BadRequest(c, fmt.Sprintf("Tournament sudah punya %d bracket match. Reset bracket dulu sebelum import.", len(existing)))
	}

	// Fetch Challonge data
	pData, err := h.challongeGet(fmt.Sprintf("tournaments/%s/participants.json", body.ChallongeSlug))
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	var pWrappers []challongeParticipantWrapper
	if err := json.Unmarshal(pData, &pWrappers); err != nil {
		return response.BadRequest(c, "Failed to parse participants")
	}

	mData, err := h.challongeGet(fmt.Sprintf("tournaments/%s/matches.json", body.ChallongeSlug))
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	var mWrappers []challongeMatchWrapper
	if err := json.Unmarshal(mData, &mWrappers); err != nil {
		return response.BadRequest(c, "Failed to parse matches")
	}

	// Sort matches by suggested_play_order for consistent numbering
	sort.Slice(mWrappers, func(i, j int) bool {
		return mWrappers[i].Match.SuggestedPlayOrder < mWrappers[j].Match.SuggestedPlayOrder
	})

	// ── Determine round mapping ──────────────────────────────────────

	hasNegativeRounds := false
	maxPositiveRound := 0
	maxNegativeRound := 0 // most negative, e.g. -3
	for _, mw := range mWrappers {
		r := mw.Match.Round
		if r < 0 {
			hasNegativeRounds = true
			if r < maxNegativeRound {
				maxNegativeRound = r
			}
		}
		if r > maxPositiveRound {
			maxPositiveRound = r
		}
	}

	// For double elimination:
	//   Challonge WR: rounds 1..maxWR where maxWR = maxPositiveRound-1 (GF is maxPositiveRound)
	//   Challonge LR: rounds -1..-N
	//   Challonge GF: maxPositiveRound
	//
	// Porjar mapping:
	//   WR: round 1..maxWR, bracket_position="winners"
	//   LR: round maxWR+1..maxWR+N, bracket_position="losers" (-1→maxWR+1, -2→maxWR+2, ...)
	//   GF: round maxWR+N+1, bracket_position="grand_final"

	isDoubleElim := hasNegativeRounds
	maxWR := maxPositiveRound
	if isDoubleElim {
		maxWR = maxPositiveRound - 1 // GF is the last positive round
	}
	lbRounds := -maxNegativeRound // number of LB rounds (3 if maxNeg is -3)

	mapRound := func(challongeRound int) (porjarRound int, bracketPos string) {
		if !isDoubleElim {
			return challongeRound, "winners"
		}
		if challongeRound > 0 && challongeRound <= maxWR {
			return challongeRound, "winners"
		}
		if challongeRound < 0 {
			return maxWR + (-challongeRound), "losers"
		}
		// Grand final
		return maxWR + lbRounds + 1, "grand_final"
	}

	// ── Create bracket matches ───────────────────────────────────────

	// Map challonge match ID → new UUID
	challongeIDToUUID := make(map[int]uuid.UUID)
	for _, mw := range mWrappers {
		challongeIDToUUID[mw.Match.ID] = uuid.New()
	}

	// Build all matches
	var bracketMatches []*model.BracketMatch
	challongeIDToMatch := make(map[int]*model.BracketMatch)

	for _, mw := range mWrappers {
		cm := mw.Match
		porjarRound, bracketPos := mapRound(cm.Round)

		// Map teams
		var teamAID, teamBID *uuid.UUID
		if cm.Player1ID != nil {
			if tid, ok := participantToTeam[*cm.Player1ID]; ok {
				teamAID = &tid
			}
		}
		if cm.Player2ID != nil {
			if tid, ok := participantToTeam[*cm.Player2ID]; ok {
				teamBID = &tid
			}
		}

		// Parse scores
		var scoreA, scoreB *int
		var winnerID, loserID *uuid.UUID
		status := "pending"

		switch cm.State {
		case "complete":
			status = "completed"
			sa, sb := parseScoresCSV(cm.ScoresCSV)
			scoreA = &sa
			scoreB = &sb
			if cm.WinnerID != nil {
				if tid, ok := participantToTeam[*cm.WinnerID]; ok {
					winnerID = &tid
				}
			}
			if cm.LoserID != nil {
				if tid, ok := participantToTeam[*cm.LoserID]; ok {
					loserID = &tid
				}
			}
		case "open":
			if teamAID != nil && teamBID != nil {
				status = "scheduled"
			}
		}

		// BYE detection: complete match with only 1 team
		isBye := false
		if cm.State == "complete" && ((teamAID != nil && teamBID == nil) || (teamAID == nil && teamBID != nil)) {
			status = "bye"
			isBye = true
		}
		// Also BYE if no players at all and complete
		if cm.State == "complete" && teamAID == nil && teamBID == nil && cm.Player1ID == nil && cm.Player2ID == nil {
			status = "bye"
			isBye = true
		}

		_ = isBye

		bm := &model.BracketMatch{
			ID:              challongeIDToUUID[cm.ID],
			TournamentID:    tournamentID,
			Round:           porjarRound,
			MatchNumber:     cm.SuggestedPlayOrder,
			BracketPosition: &bracketPos,
			TeamAID:         teamAID,
			TeamBID:         teamBID,
			WinnerID:        winnerID,
			LoserID:         loserID,
			ScoreA:          scoreA,
			ScoreB:          scoreB,
			Status:          status,
			BestOf:          tournament.BestOf,
		}

		if status == "completed" {
			now := time.Now()
			bm.CompletedAt = &now
		}

		bracketMatches = append(bracketMatches, bm)
		challongeIDToMatch[cm.ID] = bm
	}

	// ── Build advancement links from Challonge prereqs ───────────────
	// Challonge: match B has player1_prereq_match_id=A means winner/loser of A feeds into B
	// Porjar: match A has next_match_id=B (winner) or loser_next_match_id=B (loser)

	for _, mw := range mWrappers {
		cm := mw.Match
		targetUUID := challongeIDToUUID[cm.ID]

		if cm.Player1PrereqMatchID != nil {
			prereqMatch := challongeIDToMatch[*cm.Player1PrereqMatchID]
			if prereqMatch != nil {
				if cm.Player1IsPrereqMatchLoser {
					prereqMatch.LoserNextMatchID = &targetUUID
				} else {
					prereqMatch.NextMatchID = &targetUUID
				}
			}
		}

		if cm.Player2PrereqMatchID != nil {
			prereqMatch := challongeIDToMatch[*cm.Player2PrereqMatchID]
			if prereqMatch != nil {
				if cm.Player2IsPrereqMatchLoser {
					prereqMatch.LoserNextMatchID = &targetUUID
				} else {
					prereqMatch.NextMatchID = &targetUUID
				}
			}
		}
	}

	// ── Insert into DB (two-pass like bracket_generation.go) ─────────

	// Pass 1: Create all matches without advancement links
	for _, bm := range bracketMatches {
		savedNext := bm.NextMatchID
		savedLoserNext := bm.LoserNextMatchID
		bm.NextMatchID = nil
		bm.LoserNextMatchID = nil
		if err := h.bracketRepo.Create(c.Context(), bm); err != nil {
			return response.BadRequest(c, fmt.Sprintf("Gagal membuat match: %v", err))
		}
		bm.NextMatchID = savedNext
		bm.LoserNextMatchID = savedLoserNext
	}

	// Pass 2: Update advancement links
	for _, bm := range bracketMatches {
		if bm.NextMatchID != nil || bm.LoserNextMatchID != nil {
			if err := h.bracketRepo.Update(c.Context(), bm); err != nil {
				return response.BadRequest(c, fmt.Sprintf("Gagal update match refs: %v", err))
			}
		}
	}

	// Update tournament format if double elimination
	if isDoubleElim && tournament.Format != "double_elimination" {
		tournament.Format = "double_elimination"
		_ = h.tournamentRepo.Update(c.Context(), tournament)
	} else if !isDoubleElim && tournament.Format != "single_elimination" {
		tournament.Format = "single_elimination"
		_ = h.tournamentRepo.Update(c.Context(), tournament)
	}

	return response.OK(c, fiber.Map{
		"imported_matches": len(bracketMatches),
		"tournament_id":    tournamentID.String(),
		"format":           tournament.Format,
	})
}

// parseScoresCSV parses Challonge scores like "2-1" or "1-0,0-1,1-0" into aggregate scores.
func parseScoresCSV(csv string) (scoreA, scoreB int) {
	csv = strings.TrimSpace(csv)
	if csv == "" {
		return 0, 0
	}

	// If it contains commas, it's multi-game: count wins per side
	if strings.Contains(csv, ",") {
		games := strings.Split(csv, ",")
		for _, g := range games {
			parts := strings.Split(strings.TrimSpace(g), "-")
			if len(parts) != 2 {
				continue
			}
			a, _ := strconv.Atoi(strings.TrimSpace(parts[0]))
			b, _ := strconv.Atoi(strings.TrimSpace(parts[1]))
			if a > b {
				scoreA++
			} else if b > a {
				scoreB++
			}
		}
		return scoreA, scoreB
	}

	// Single score: "2-1"
	parts := strings.Split(csv, "-")
	if len(parts) != 2 {
		return 0, 0
	}
	scoreA, _ = strconv.Atoi(strings.TrimSpace(parts[0]))
	scoreB, _ = strconv.Atoi(strings.TrimSpace(parts[1]))
	return scoreA, scoreB
}

func (h *ChallongeHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/admin/import/challonge/tournaments", authMw, adminMw, h.ListTournaments)
	app.Get("/admin/import/challonge/tournaments/:slug/preview", authMw, adminMw, h.PreviewTournament)
	app.Post("/admin/import/challonge", authMw, adminMw, h.ImportBracket)
}
