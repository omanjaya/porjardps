package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

type BracketHandler struct {
	bracketService    *service.BracketService
	tournamentService *service.TournamentService
	hub               *ws.Hub
}

func NewBracketHandler(bracketService *service.BracketService, tournamentService *service.TournamentService, hub *ws.Hub) *BracketHandler {
	return &BracketHandler{bracketService: bracketService, tournamentService: tournamentService, hub: hub}
}

func (h *BracketHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler, rateLimitMws ...fiber.Handler) {
	// Public routes
	app.Get("/tournaments/:id/with-bracket", h.GetWithBracket)
	app.Get("/tournaments/:id/bracket", h.GetBracket)
	app.Get("/matches/live", h.GetLiveMatches)
	app.Get("/matches/recent", h.GetRecentMatches)
	app.Get("/matches/:id", h.GetMatch)
	app.Get("/matches/:id/spectators", h.GetSpectatorCount)

	// Admin routes — use explicit middleware lists to avoid Go slice append aliasing bug.
	// Do NOT use append(adminChain, handler)... as it modifies the shared backing array.
	app.Post("/admin/tournaments/:id/generate-bracket", authMw, adminMw, h.GenerateBracket)
	app.Delete("/admin/tournaments/:id/bracket", authMw, adminMw, h.ResetBracket)
	app.Put("/admin/matches/:id/status", authMw, adminMw, h.UpdateMatchStatus)
	app.Put("/admin/matches/:id/score", authMw, adminMw, h.UpdateMatchScore)
	app.Put("/admin/matches/:id/games/:gn", authMw, adminMw, h.InputGameScore)
	app.Post("/admin/matches/:id/complete", authMw, adminMw, h.CompleteMatch)
	app.Put("/admin/matches/:id/schedule", authMw, adminMw, h.ScheduleMatch)
	app.Post("/admin/tournaments/:id/bracket/round/:round/schedule", authMw, adminMw, h.ScheduleRound)
	app.Put("/admin/tournaments/:id/bracket/round-bo", authMw, adminMw, h.SetRoundBestOf)
}

// --- Request DTOs ---

type generateBracketRequest struct {
	ManualSeeds map[string]int `json:"manual_seeds"` // team_id (string) -> seed number
}

type updateMatchStatusRequest struct {
	Status string `json:"status"`
}

type updateMatchScoreRequest struct {
	ScoreA int `json:"score_a"`
	ScoreB int `json:"score_b"`
}

type inputGameScoreRequest struct {
	WinnerID        string          `json:"winner_id"`
	ScoreA          int             `json:"score_a"`
	ScoreB          int             `json:"score_b"`
	DurationMinutes *int            `json:"duration_minutes"`
	MvpUserID       *string         `json:"mvp_user_id"`
	MapName         *string         `json:"map_name"`
	HeroBans        json.RawMessage `json:"hero_bans"`
}

type completeMatchRequest struct {
	WinnerID string `json:"winner_id"`
}

// --- Handlers ---

func (h *BracketHandler) GenerateBracket(c *fiber.Ctx) error {
	slog.Info("GenerateBracket handler called", "path", c.Path(), "method", c.Method())
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req generateBracketRequest
	if err := c.BodyParser(&req); err != nil {
		// Body is optional for generate bracket
		req = generateBracketRequest{}
	}

	// Convert string keys to uuid keys
	var manualSeeds map[uuid.UUID]int
	if len(req.ManualSeeds) > 0 {
		manualSeeds = make(map[uuid.UUID]int)
		for k, v := range req.ManualSeeds {
			id, err := uuid.Parse(k)
			if err != nil {
				return response.Err(c, apperror.ValidationError(map[string]string{
					"manual_seeds": "Team ID '" + k + "' tidak valid",
				}))
			}
			manualSeeds[id] = v
		}
	}

	matchesCreated, totalRounds, svcErr := h.bracketService.GenerateBracket(c.Context(), tournamentID, manualSeeds)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, fiber.Map{
		"matches_created": matchesCreated,
		"total_rounds":    totalRounds,
		"message":         "Bracket berhasil di-generate",
	})
}

// GetWithBracket returns tournament detail + bracket matches in a single request.
func (h *BracketHandler) GetWithBracket(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	tournament, svcErr := h.tournamentService.GetByID(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	matches, svcErr := h.bracketService.GetBracket(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{
		"tournament": tournament,
		"matches":    matches,
	})
}

func (h *BracketHandler) GetBracket(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	matches, svcErr := h.bracketService.GetBracket(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, matches)
}

func (h *BracketHandler) UpdateMatchStatus(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	var req updateMatchStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Status == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"status": "Status wajib diisi",
		}))
	}

	validStatuses := map[string]bool{"pending": true, "scheduled": true, "live": true, "completed": true}
	if !validStatuses[req.Status] {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"status": "Status harus salah satu dari: pending, scheduled, live, completed",
		}))
	}

	if svcErr := h.bracketService.UpdateMatchStatus(c.Context(), matchID, req.Status); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Status match berhasil diupdate"})
}

func (h *BracketHandler) UpdateMatchScore(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	var req updateMatchScoreRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if svcErr := h.bracketService.UpdateMatchScore(c.Context(), matchID, req.ScoreA, req.ScoreB); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Skor match berhasil diupdate"})
}

func (h *BracketHandler) InputGameScore(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	gameNumber, err := strconv.Atoi(c.Params("gn"))
	if err != nil || gameNumber < 1 {
		return response.BadRequest(c, "Game number tidak valid")
	}

	var req inputGameScoreRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	winnerID, err := uuid.Parse(req.WinnerID)
	if err != nil {
		details["winner_id"] = "Winner ID tidak valid"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	var mvpUserID *uuid.UUID
	if req.MvpUserID != nil {
		id, err := uuid.Parse(*req.MvpUserID)
		if err != nil {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"mvp_user_id": "MVP User ID tidak valid",
			}))
		}
		mvpUserID = &id
	}

	if svcErr := h.bracketService.InputGameScore(
		c.Context(), matchID, gameNumber, winnerID,
		req.ScoreA, req.ScoreB, req.DurationMinutes,
		mvpUserID, req.MapName, req.HeroBans,
	); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Game score berhasil diinput"})
}

func (h *BracketHandler) CompleteMatch(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	var req completeMatchRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	winnerID, err := uuid.Parse(req.WinnerID)
	if err != nil {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"winner_id": "Winner ID tidak valid",
		}))
	}

	if svcErr := h.bracketService.CompleteMatch(c.Context(), matchID, winnerID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Match berhasil diselesaikan"})
}

func (h *BracketHandler) ResetBracket(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	if svcErr := h.bracketService.ResetBracket(c.Context(), tournamentID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Bracket berhasil direset"})
}

type scheduleRoundRequest struct {
	ScheduledAt string `json:"scheduled_at"` // RFC3339 format, e.g. "2026-03-29T10:00:00+08:00"
}

func (h *BracketHandler) ScheduleRound(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	round, err := strconv.Atoi(c.Params("round"))
	if err != nil || round < 1 {
		return response.BadRequest(c, "Round tidak valid")
	}

	var req scheduleRoundRequest
	// Body is optional — if no body, just set to scheduled without time
	_ = c.BodyParser(&req)

	var scheduledAt *time.Time
	if req.ScheduledAt != "" {
		t, err := time.Parse(time.RFC3339, req.ScheduledAt)
		if err != nil {
			return response.BadRequest(c, "Format tanggal tidak valid. Gunakan format RFC3339 (contoh: 2026-03-29T10:00:00+08:00)")
		}
		scheduledAt = &t
	}

	count, svcErr := h.bracketService.ScheduleRound(c.Context(), tournamentID, round, scheduledAt)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	msg := fmt.Sprintf("%d match dijadwalkan", count)
	if scheduledAt != nil {
		msg += fmt.Sprintf(" pada %s", scheduledAt.Format("02 Jan 2006 15:04 WITA"))
	}

	return response.OK(c, fiber.Map{"updated": count, "message": msg})
}

type scheduleMatchRequest struct {
	ScheduledAt string `json:"scheduled_at"` // RFC3339 format
}

func (h *BracketHandler) ScheduleMatch(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	var req scheduleMatchRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.ScheduledAt == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"scheduled_at": "Waktu jadwal wajib diisi",
		}))
	}

	t, err := time.Parse(time.RFC3339, req.ScheduledAt)
	if err != nil {
		return response.BadRequest(c, "Format tanggal tidak valid. Gunakan format RFC3339 (contoh: 2026-03-29T10:00:00+08:00)")
	}

	if svcErr := h.bracketService.ScheduleMatch(c.Context(), matchID, t); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{
		"message":      "Match berhasil dijadwalkan",
		"scheduled_at": t.Format(time.RFC3339),
	})
}

func (h *BracketHandler) GetMatch(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	match, svcErr := h.bracketService.GetMatch(c.Context(), matchID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, match)
}

func (h *BracketHandler) GetLiveMatches(c *fiber.Ctx) error {
	matches, svcErr := h.bracketService.GetLiveMatches(c.Context())
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, matches)
}

func (h *BracketHandler) GetRecentMatches(c *fiber.Ctx) error {
	limit := c.QueryInt("limit", 20)
	if limit < 1 {
		limit = 1
	}
	if limit > 100 {
		limit = 100
	}
	matches, svcErr := h.bracketService.GetRecentCompleted(c.Context(), limit)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, matches)
}

// GetSpectatorCount returns the number of WebSocket viewers for a match
func (h *BracketHandler) GetSpectatorCount(c *fiber.Ctx) error {
	matchID := c.Params("id")
	if _, err := uuid.Parse(matchID); err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	room := fmt.Sprintf("match:%s", matchID)
	count := h.hub.RoomConnectionCount(room)

	return response.OK(c, fiber.Map{"count": count})
}

// SetRoundBestOf sets best_of for matches in specific rounds of a tournament bracket.
// Body: { "rounds": { "1": 1, "2": 1, "3": 1, "4": 3, "5": 3 } }
func (h *BracketHandler) SetRoundBestOf(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req struct {
		Rounds map[string]int `json:"rounds"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if len(req.Rounds) == 0 {
		return response.BadRequest(c, "Rounds config wajib diisi")
	}

	// Get all bracket matches
	matches, svcErr := h.bracketService.GetBracket(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	updated := 0
	for _, m := range matches {
		roundStr := strconv.Itoa(m.Round)
		if bo, ok := req.Rounds[roundStr]; ok {
			m.BestOf = bo
			if err := h.bracketService.UpdateMatchBestOf(c.Context(), m.ID, bo); err != nil {
				return response.HandleError(c, err)
			}
			updated++
		}
	}

	return response.OK(c, fiber.Map{
		"message": fmt.Sprintf("Best of berhasil diupdate untuk %d match", updated),
		"updated": updated,
	})
}
