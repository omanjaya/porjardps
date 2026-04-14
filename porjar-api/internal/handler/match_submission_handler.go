package handler

import (
	"encoding/json"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/queue"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type MatchSubmissionHandler struct {
	submissionService *service.MatchSubmissionService
	// submissionQueue is optional. When non-nil, submit endpoints enqueue the job
	// and return 202 Accepted. When nil, they fall back to synchronous processing.
	submissionQueue *queue.SubmissionQueue
}

func NewMatchSubmissionHandler(submissionService *service.MatchSubmissionService) *MatchSubmissionHandler {
	return &MatchSubmissionHandler{submissionService: submissionService}
}

// WithQueue attaches a SubmissionQueue so that the handler uses async processing.
func (h *MatchSubmissionHandler) WithQueue(q *queue.SubmissionQueue) *MatchSubmissionHandler {
	h.submissionQueue = q
	return h
}

func (h *MatchSubmissionHandler) RegisterRoutes(api fiber.Router, authMw, adminMw fiber.Handler, rateLimitMws ...fiber.Handler) {
	// Player routes — submit results (rate limited)
	// Each route gets its own fresh handler slice to avoid slice append aliasing.
	bracketChain := make([]fiber.Handler, 0, 1+len(rateLimitMws)+1)
	bracketChain = append(bracketChain, authMw)
	bracketChain = append(bracketChain, rateLimitMws...)
	bracketChain = append(bracketChain, h.SubmitBracketResult)
	api.Post("/matches/:id/submit-result", bracketChain...)

	brChain := make([]fiber.Handler, 0, 1+len(rateLimitMws)+1)
	brChain = append(brChain, authMw)
	brChain = append(brChain, rateLimitMws...)
	brChain = append(brChain, h.SubmitBRResult)
	api.Post("/lobbies/:id/submit-result", brChain...)

	// Public routes — view submissions for a match.
	// Intentionally public: completed match results are public data for bracket/lobby views.
	// Note: the service layer filters out pending/disputed submissions for non-admin callers.
	api.Get("/matches/:id/submissions", h.GetMatchSubmissions)

	// Authenticated routes — team submission history
	api.Get("/teams/:id/submissions", authMw, h.GetTeamSubmissions)

	// Player authenticated routes — unified submit, active matches and submission history
	unifiedChain := make([]fiber.Handler, 0, 1+len(rateLimitMws)+1)
	unifiedChain = append(unifiedChain, authMw)
	unifiedChain = append(unifiedChain, rateLimitMws...)
	unifiedChain = append(unifiedChain, h.SubmitUnified)
	api.Post("/submissions", unifiedChain...)

	api.Get("/submissions/active-matches", authMw, h.GetActiveMatches)
	api.Get("/submissions/my", authMw, h.GetMySubmissions)

	// Update submission (before verification) — rate limited
	updateChain := make([]fiber.Handler, 0, 1+len(rateLimitMws)+1)
	updateChain = append(updateChain, authMw)
	updateChain = append(updateChain, rateLimitMws...)
	updateChain = append(updateChain, h.UpdateSubmission)
	api.Put("/submissions/:id", updateChain...)

	updateSSChain := make([]fiber.Handler, 0, 1+len(rateLimitMws)+1)
	updateSSChain = append(updateSSChain, authMw)
	updateSSChain = append(updateSSChain, rateLimitMws...)
	updateSSChain = append(updateSSChain, h.UpdateScreenshots)
	api.Put("/submissions/:id/screenshots", updateSSChain...)

	deleteSSChain := make([]fiber.Handler, 0, 1+len(rateLimitMws)+1)
	deleteSSChain = append(deleteSSChain, authMw)
	deleteSSChain = append(deleteSSChain, rateLimitMws...)
	deleteSSChain = append(deleteSSChain, h.DeleteScreenshot)
	api.Delete("/submissions/:id/screenshot", deleteSSChain...)

	// Submission status (async queue) — returns DB record when available
	api.Get("/submissions/:id/status", authMw, h.GetSubmissionStatus)

	// Admin routes — manage submissions
	api.Get("/admin/submissions", authMw, adminMw, h.ListPendingSubmissions)
	api.Get("/admin/submissions/:id", authMw, adminMw, h.GetSubmissionDetail)
	api.Put("/admin/submissions/:id/verify", authMw, adminMw, h.VerifySubmission)
	api.Delete("/admin/submissions/match/:id", authMw, adminMw, h.ResetMatchSubmissions)
}

// --- Request DTOs ---

type submitBracketResultRequest struct {
	TeamID         string   `json:"team_id"`
	ScoreA         int      `json:"score_a"`
	ScoreB         int      `json:"score_b"`
	ScreenshotURLs []string `json:"screenshot_urls"`
}

type submitBRResultRequest struct {
	TeamID         string   `json:"team_id"`
	MapNumber      int      `json:"map_number"`
	Placement      int      `json:"placement"`
	KillsP1        int      `json:"kills_p1"`
	KillsP2        int      `json:"kills_p2"`
	KillsP3        int      `json:"kills_p3"`
	KillsP4        int      `json:"kills_p4"`
	ScreenshotURLs []string `json:"screenshot_urls"`
}

type verifySubmissionRequest struct {
	Approved        bool   `json:"approved"`
	RejectionReason string `json:"rejection_reason"`
	AdminNotes      string `json:"admin_notes"`
}

// --- Handlers ---

func (h *MatchSubmissionHandler) SubmitBracketResult(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	var req submitBracketResultRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validations
	details := make(map[string]string)

	teamID, err := uuid.Parse(req.TeamID)
	if err != nil {
		details["team_id"] = "Team ID tidak valid"
	}

	if len(req.ScreenshotURLs) == 0 {
		details["screenshot_urls"] = "Minimal satu screenshot harus diupload"
	} else if len(req.ScreenshotURLs) > 20 {
		details["screenshot_urls"] = "Terlalu banyak screenshot"
	}

	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	// Score sanity checks
	if req.ScoreA < 0 || req.ScoreB < 0 {
		return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak boleh negatif", 400))
	}
	if req.ScoreA > 20 || req.ScoreB > 20 {
		return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak masuk akal (maks 20)", 400))
	}
	if req.ScoreA == 0 && req.ScoreB == 0 {
		return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak boleh keduanya 0", 400))
	}

	// Screenshot URL validation
	if err := validateScreenshotURLs(req.ScreenshotURLs); err != nil {
		return response.BadRequest(c, err.Error())
	}

	userID := middleware.GetUserID(c)

	// Async path — enqueue the job and return 202 Accepted
	if h.submissionQueue != nil {
		payload, marshalErr := json.Marshal(map[string]interface{}{
			"score_a":         req.ScoreA,
			"score_b":         req.ScoreB,
			"screenshot_urls": req.ScreenshotURLs,
		})
		if marshalErr != nil {
			return response.Err(c, apperror.ErrInternal)
		}
		job := queue.SubmissionJob{
			Type:          "bracket",
			MatchID:       matchID.String(),
			TeamID:        teamID.String(),
			SubmittedByID: userID.String(),
			Payload:       string(payload),
		}
		jobID, enqErr := h.submissionQueue.Enqueue(c.Context(), job)
		if enqErr != nil {
			return response.Err(c, apperror.ErrInternal)
		}
		// jobID is a Redis stream message ID, not a submission UUID
		return response.OK(c, fiber.Map{
			"status":  "queued",
			"job_id":  jobID,
			"message": "Submission sedang diproses",
		})
	}

	// Synchronous fallback when queue is not configured
	submission, svcErr := h.submissionService.SubmitBracketResult(
		c.Context(), matchID, teamID, userID,
		req.ScoreA, req.ScoreB,
		req.ScreenshotURLs,
	)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, submission)
}

func (h *MatchSubmissionHandler) SubmitBRResult(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}

	var req submitBRResultRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)

	teamID, err := uuid.Parse(req.TeamID)
	if err != nil {
		details["team_id"] = "Team ID tidak valid"
	}

	if len(req.ScreenshotURLs) == 0 {
		details["screenshot_urls"] = "Minimal satu screenshot harus diupload"
	} else if len(req.ScreenshotURLs) > 2 {
		details["screenshot_urls"] = "Maksimal 2 screenshot untuk Battle Royale"
	}

	if req.Placement < 1 {
		details["placement"] = "Placement harus minimal 1"
	} else if req.Placement > 100 {
		details["placement"] = "Placement tidak masuk akal (maks 100)"
	}

	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	// Per-player kill count sanity check (0-99 per player)
	for i, k := range []int{req.KillsP1, req.KillsP2, req.KillsP3, req.KillsP4} {
		if k < 0 || k > 99 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"kills": fmt.Sprintf("Kills pemain %d harus antara 0-99", i+1),
			}))
		}
	}

	// Screenshot URL validation
	if err := validateScreenshotURLs(req.ScreenshotURLs); err != nil {
		return response.BadRequest(c, err.Error())
	}

	userID := middleware.GetUserID(c)

	mapNumber := req.MapNumber
	if mapNumber <= 0 {
		mapNumber = 1
	}

	// Async path — enqueue the job and return 202 Accepted
	if h.submissionQueue != nil {
		payload, marshalErr := json.Marshal(map[string]interface{}{
			"map_number":      mapNumber,
			"placement":       req.Placement,
			"kills_p1":        req.KillsP1,
			"kills_p2":        req.KillsP2,
			"kills_p3":        req.KillsP3,
			"kills_p4":        req.KillsP4,
			"screenshot_urls": req.ScreenshotURLs,
		})
		if marshalErr != nil {
			return response.Err(c, apperror.ErrInternal)
		}
		job := queue.SubmissionJob{
			Type:          "br_lobby",
			MatchID:       lobbyID.String(),
			TeamID:        teamID.String(),
			SubmittedByID: userID.String(),
			Payload:       string(payload),
		}
		jobID, enqErr := h.submissionQueue.Enqueue(c.Context(), job)
		if enqErr != nil {
			return response.Err(c, apperror.ErrInternal)
		}
		// jobID is a Redis stream message ID, not a submission UUID
		return response.OK(c, fiber.Map{
			"status":  "queued",
			"job_id":  jobID,
			"message": "Submission sedang diproses",
		})
	}

	// Synchronous fallback when queue is not configured
	submission, svcErr := h.submissionService.SubmitBRResult(
		c.Context(), lobbyID, teamID, userID,
		mapNumber,
		req.Placement, req.KillsP1, req.KillsP2, req.KillsP3, req.KillsP4,
		req.ScreenshotURLs,
	)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, submission)
}

func (h *MatchSubmissionHandler) SubmitUnified(c *fiber.Ctx) error {
	var req struct {
		MatchID          string   `json:"match_id"`
		MatchType        string   `json:"match_type"`
		ClaimedWinner    string   `json:"claimed_winner"`
		ClaimedScoreA    int      `json:"claimed_score_a"`
		ClaimedScoreB    int      `json:"claimed_score_b"`
		ClaimedPlacement int      `json:"claimed_placement"`
		MapNumber        int      `json:"map_number"`
		KillsP1          int      `json:"kills_p1"`
		KillsP2          int      `json:"kills_p2"`
		KillsP3          int      `json:"kills_p3"`
		KillsP4          int      `json:"kills_p4"`
		Screenshots      []string `json:"screenshots"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.MatchID == "" {
		return response.BadRequest(c, "match_id wajib diisi")
	}
	if len(req.Screenshots) == 0 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"screenshots": "Minimal satu screenshot harus diupload",
		}))
	}
	if req.MatchType == "battle_royale" && len(req.Screenshots) > 2 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"screenshots": "Maksimal 2 screenshot untuk Battle Royale",
		}))
	}
	if req.MatchType != "battle_royale" && len(req.Screenshots) > 20 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"screenshots": "Terlalu banyak screenshot",
		}))
	}

	// Score sanity checks for bracket/group match type
	if req.MatchType == "bracket" || req.MatchType == "group" {
		if req.ClaimedScoreA < 0 || req.ClaimedScoreB < 0 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak boleh negatif", 400))
		}
		if req.ClaimedScoreA > 20 || req.ClaimedScoreB > 20 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak masuk akal (maks 20)", 400))
		}
		if req.ClaimedScoreA == 0 && req.ClaimedScoreB == 0 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak boleh keduanya 0", 400))
		}
	}

	// Kill count sanity check for battle royale match type
	if req.MatchType == "battle_royale" {
		for i, k := range []int{req.KillsP1, req.KillsP2, req.KillsP3, req.KillsP4} {
			if k < 0 || k > 99 {
				return response.Err(c, apperror.ValidationError(map[string]string{
					"kills": fmt.Sprintf("Kills pemain %d harus antara 0-99", i+1),
				}))
			}
		}
		if req.ClaimedPlacement < 1 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Placement harus minimal 1", 400))
		}
		if req.ClaimedPlacement > 100 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Placement tidak masuk akal (maks 100)", 400))
		}
	}

	// Screenshot URL validation
	if err := validateScreenshotURLs(req.Screenshots); err != nil {
		return response.BadRequest(c, err.Error())
	}

	userID := middleware.GetUserID(c)

	// Validate match_type early before team resolution
	if req.MatchType != "bracket" && req.MatchType != "battle_royale" && req.MatchType != "group" {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"match_type": "Harus 'bracket', 'battle_royale', atau 'group'",
		}))
	}

	// Resolve team_id for the user in this match
	resolvedTeamID := ""
	matchUUID, _ := uuid.Parse(req.MatchID)
	if req.MatchType == "bracket" {
		match, err := h.submissionService.FindBracketMatch(c.Context(), matchUUID)
		if err == nil && match != nil {
			if match.TeamAID != nil {
				if member, _ := h.submissionService.CheckTeamMember(c.Context(), *match.TeamAID, userID); member {
					resolvedTeamID = match.TeamAID.String()
				}
			}
			if resolvedTeamID == "" && match.TeamBID != nil {
				if member, _ := h.submissionService.CheckTeamMember(c.Context(), *match.TeamBID, userID); member {
					resolvedTeamID = match.TeamBID.String()
				}
			}
		}
	} else if req.MatchType == "battle_royale" {
		resolvedTeamID = h.submissionService.FindUserTeamInLobby(c.Context(), matchUUID, userID)
	} else if req.MatchType == "group" {
		resolvedTeamID = h.submissionService.FindUserTeamInGroupMatch(c.Context(), matchUUID, userID)
	}
	if resolvedTeamID == "" {
		return response.Err(c, apperror.BusinessRule("NOT_PARTICIPANT", "Anda bukan peserta pertandingan ini"))
	}

	// Async path — enqueue based on match type
	if h.submissionQueue != nil {
		var jobType string
		var payload []byte
		var marshalErr error

		switch req.MatchType {
		case "bracket", "group":
			jobType = req.MatchType
			payload, marshalErr = json.Marshal(map[string]interface{}{
				"score_a":         req.ClaimedScoreA,
				"score_b":         req.ClaimedScoreB,
				"screenshot_urls": req.Screenshots,
			})
		case "battle_royale":
			jobType = "br_lobby"
			brMapNumber := req.MapNumber
			if brMapNumber <= 0 {
				brMapNumber = 1
			}
			payload, marshalErr = json.Marshal(map[string]interface{}{
				"map_number":      brMapNumber,
				"placement":       req.ClaimedPlacement,
				"kills_p1":        req.KillsP1,
				"kills_p2":        req.KillsP2,
				"kills_p3":        req.KillsP3,
				"kills_p4":        req.KillsP4,
				"screenshot_urls": req.Screenshots,
			})
		default:
			return response.Err(c, apperror.ValidationError(map[string]string{
				"match_type": "Harus 'bracket', 'battle_royale', atau 'group'",
			}))
		}

		if marshalErr != nil {
			return response.Err(c, apperror.ErrInternal)
		}

		job := queue.SubmissionJob{
			Type:          jobType,
			MatchID:       req.MatchID,
			SubmittedByID: userID.String(),
			TeamID:        resolvedTeamID,
			Payload:       string(payload),
		}
		jobID, enqErr := h.submissionQueue.Enqueue(c.Context(), job)
		if enqErr != nil {
			return response.Err(c, apperror.ErrInternal)
		}
		// jobID is a Redis stream message ID, not a submission UUID
		return response.OK(c, fiber.Map{
			"status":  "queued",
			"job_id":  jobID,
			"message": "Submission sedang diproses",
		})
	}

	// Synchronous fallback when queue is not configured
	sub, svcErr := h.submissionService.SubmitUnified(
		c.Context(), userID,
		req.MatchID, req.MatchType, "",
		req.MapNumber,
		req.ClaimedScoreA, req.ClaimedScoreB,
		req.ClaimedPlacement, req.KillsP1, req.KillsP2, req.KillsP3, req.KillsP4,
		req.Screenshots,
	)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}
	return response.Created(c, sub)
}
