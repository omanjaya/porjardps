package handler

import (
	"encoding/json"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
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
	// Build submit middleware chain: auth + rate limiters
	submitChain := append([]fiber.Handler{authMw}, rateLimitMws...)

	// Player routes — submit results (rate limited)
	api.Post("/matches/:id/submit-result", append(submitChain, h.SubmitBracketResult)...)
	api.Post("/lobbies/:id/submit-result", append(submitChain, h.SubmitBRResult)...)

	// Public routes — view submissions for a match
	api.Get("/matches/:id/submissions", h.GetMatchSubmissions)

	// Authenticated routes — team submission history
	api.Get("/teams/:id/submissions", authMw, h.GetTeamSubmissions)

	// Player authenticated routes — unified submit, active matches and submission history
	api.Post("/submissions", append(submitChain, h.SubmitUnified)...)
	api.Get("/submissions/active-matches", authMw, h.GetActiveMatches)
	api.Get("/submissions/my", authMw, h.GetMySubmissions)

	// Submission status (async queue) — returns DB record when available
	api.Get("/submissions/:id/status", authMw, h.GetSubmissionStatus)

	// Admin routes — manage submissions
	api.Get("/admin/submissions", authMw, adminMw, h.ListPendingSubmissions)
	api.Get("/admin/submissions/:id", authMw, adminMw, h.GetSubmissionDetail)
	api.Put("/admin/submissions/:id/verify", authMw, adminMw, h.VerifySubmission)
}

// --- Request DTOs ---

type submitBracketResultRequest struct {
	TeamID          string   `json:"team_id"`
	ClaimedWinnerID string   `json:"claimed_winner_id"`
	ScoreA          int      `json:"score_a"`
	ScoreB          int      `json:"score_b"`
	ScreenshotURLs  []string `json:"screenshot_urls"`
}

type submitBRResultRequest struct {
	TeamID         string   `json:"team_id"`
	Placement      int      `json:"placement"`
	Kills          int      `json:"kills"`
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

	claimedWinnerID, err := uuid.Parse(req.ClaimedWinnerID)
	if err != nil {
		details["claimed_winner_id"] = "Claimed winner ID tidak valid"
	}

	if len(req.ScreenshotURLs) == 0 {
		details["screenshot_urls"] = "Minimal satu screenshot harus diupload"
	} else if len(req.ScreenshotURLs) > 10 {
		details["screenshot_urls"] = "Maksimal 10 screenshot"
	}

	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	// Score sanity checks
	if req.ScoreA < 0 || req.ScoreB < 0 {
		return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak boleh negatif", 400))
	}
	if req.ScoreA > 10 || req.ScoreB > 10 {
		return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak masuk akal (maks 10)", 400))
	}
	if req.ScoreA == 0 && req.ScoreB == 0 {
		return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak boleh keduanya 0", 400))
	}

	// Screenshot URL validation
	for _, u := range req.ScreenshotURLs {
		if len(u) > 2048 {
			return response.Err(c, apperror.New("INVALID_URL", "URL screenshot terlalu panjang (maks 2048 karakter)", 400))
		}
		if !strings.HasPrefix(u, "https://") && !strings.HasPrefix(u, "http://") {
			return response.Err(c, apperror.New("INVALID_URL", "URL screenshot tidak valid", 400))
		}
	}

	userID := middleware.GetUserID(c)

	// Async path — enqueue the job and return 202 Accepted
	if h.submissionQueue != nil {
		payload, marshalErr := json.Marshal(map[string]interface{}{
			"claimed_winner_id": claimedWinnerID.String(),
			"score_a":           req.ScoreA,
			"score_b":           req.ScoreB,
			"screenshot_urls":   req.ScreenshotURLs,
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
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
			"status":        "queued",
			"submission_id": jobID,
			"message":       "Submission sedang diproses",
		})
	}

	// Synchronous fallback when queue is not configured
	submission, svcErr := h.submissionService.SubmitBracketResult(
		c.Context(), matchID, teamID, userID,
		claimedWinnerID, req.ScoreA, req.ScoreB,
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
	} else if len(req.ScreenshotURLs) > 10 {
		details["screenshot_urls"] = "Maksimal 10 screenshot"
	}

	if req.Placement < 1 {
		details["placement"] = "Placement harus minimal 1"
	} else if req.Placement > 200 {
		details["placement"] = "Placement tidak masuk akal (maks 200)"
	}

	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	// Kill count sanity check
	if req.Kills < 0 {
		return response.Err(c, apperror.New("INVALID_SCORE", "Kills tidak boleh negatif", 400))
	}
	if req.Kills > 999 {
		return response.Err(c, apperror.New("INVALID_SCORE", "Kills tidak masuk akal (maks 999)", 400))
	}

	// Screenshot URL validation
	for _, u := range req.ScreenshotURLs {
		if len(u) > 2048 {
			return response.Err(c, apperror.New("INVALID_URL", "URL screenshot terlalu panjang (maks 2048 karakter)", 400))
		}
		if !strings.HasPrefix(u, "https://") && !strings.HasPrefix(u, "http://") {
			return response.Err(c, apperror.New("INVALID_URL", "URL screenshot tidak valid", 400))
		}
	}

	userID := middleware.GetUserID(c)

	// Async path — enqueue the job and return 202 Accepted
	if h.submissionQueue != nil {
		payload, marshalErr := json.Marshal(map[string]interface{}{
			"placement":       req.Placement,
			"kills":           req.Kills,
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
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
			"status":        "queued",
			"submission_id": jobID,
			"message":       "Submission sedang diproses",
		})
	}

	// Synchronous fallback when queue is not configured
	submission, svcErr := h.submissionService.SubmitBRResult(
		c.Context(), lobbyID, teamID, userID,
		req.Placement, req.Kills,
		req.ScreenshotURLs,
	)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, submission)
}

func (h *MatchSubmissionHandler) ListPendingSubmissions(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	// Bound pagination parameters
	if page < 1 {
		page = 1
	}
	if page > 10000 {
		page = 10000
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Check if there's a status filter
	statusFilter := c.Query("status", "")

	var subs []*model.MatchSubmission
	var total int
	var svcErr error

	if statusFilter != "" {
		filter := model.MatchSubmissionFilter{
			Status: &statusFilter,
			Page:   page,
			Limit:  limit,
		}
		subs, total, svcErr = h.submissionService.ListSubmissions(c.Context(), filter)
	} else {
		subs, total, svcErr = h.submissionService.GetPendingSubmissions(c.Context(), page, limit)
	}
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	// Enrich with display names
	enriched, enrichErr := h.submissionService.EnrichSubmissions(c.Context(), subs)
	if enrichErr != nil {
		return response.HandleError(c, enrichErr)
	}

	totalPages := (total + limit - 1) / limit
	return response.Paginated(c, enriched, response.Meta{
		Page:       page,
		PerPage:    limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

func (h *MatchSubmissionHandler) GetSubmissionDetail(c *fiber.Ctx) error {
	submissionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Submission ID tidak valid")
	}

	sub, svcErr := h.submissionService.GetSubmission(c.Context(), submissionID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, sub)
}

func (h *MatchSubmissionHandler) VerifySubmission(c *fiber.Ctx) error {
	submissionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Submission ID tidak valid")
	}

	var req verifySubmissionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if !req.Approved && req.RejectionReason == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"rejection_reason": "Alasan penolakan wajib diisi jika menolak",
		}))
	}
	if len(req.RejectionReason) > 1000 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"rejection_reason": "Alasan penolakan maksimal 1000 karakter",
		}))
	}
	if len(req.AdminNotes) > 1000 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"admin_notes": "Catatan admin maksimal 1000 karakter",
		}))
	}

	adminID := middleware.GetUserID(c)

	if svcErr := h.submissionService.VerifySubmission(
		c.Context(), submissionID, adminID,
		req.Approved, req.RejectionReason,
	); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	status := "approved"
	if !req.Approved {
		status = "rejected"
	}

	return response.OK(c, fiber.Map{
		"message": "Submission berhasil diverifikasi",
		"status":  status,
	})
}

func (h *MatchSubmissionHandler) GetMatchSubmissions(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	subs, svcErr := h.submissionService.GetSubmissionsByMatch(c.Context(), matchID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, subs)
}

func (h *MatchSubmissionHandler) GetTeamSubmissions(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	subs, svcErr := h.submissionService.GetSubmissionsByTeam(c.Context(), teamID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, subs)
}

func (h *MatchSubmissionHandler) SubmitUnified(c *fiber.Ctx) error {
	var req struct {
		MatchID          string   `json:"match_id"`
		MatchType        string   `json:"match_type"`
		ClaimedWinner    string   `json:"claimed_winner"`
		ClaimedScoreA    int      `json:"claimed_score_a"`
		ClaimedScoreB    int      `json:"claimed_score_b"`
		ClaimedPlacement int      `json:"claimed_placement"`
		ClaimedKills     int      `json:"claimed_kills"`
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
	if len(req.Screenshots) > 10 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"screenshots": "Maksimal 10 screenshot",
		}))
	}

	// Score sanity checks for bracket match type
	if req.MatchType == "bracket" {
		if req.ClaimedScoreA < 0 || req.ClaimedScoreB < 0 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak boleh negatif", 400))
		}
		if req.ClaimedScoreA > 10 || req.ClaimedScoreB > 10 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak masuk akal (maks 10)", 400))
		}
		if req.ClaimedScoreA == 0 && req.ClaimedScoreB == 0 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Skor tidak boleh keduanya 0", 400))
		}
	}

	// Kill count sanity check for battle royale match type
	if req.MatchType == "battle_royale" {
		if req.ClaimedKills < 0 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Kills tidak boleh negatif", 400))
		}
		if req.ClaimedKills > 999 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Kills tidak masuk akal (maks 999)", 400))
		}
		if req.ClaimedPlacement < 1 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Placement harus minimal 1", 400))
		}
		if req.ClaimedPlacement > 200 {
			return response.Err(c, apperror.New("INVALID_SCORE", "Placement tidak masuk akal (maks 200)", 400))
		}
	}

	// Screenshot URL validation
	for _, u := range req.Screenshots {
		if len(u) > 2048 {
			return response.Err(c, apperror.New("INVALID_URL", "URL screenshot terlalu panjang (maks 2048 karakter)", 400))
		}
		if !strings.HasPrefix(u, "https://") && !strings.HasPrefix(u, "http://") {
			return response.Err(c, apperror.New("INVALID_URL", "URL screenshot tidak valid", 400))
		}
	}

	userID := middleware.GetUserID(c)

	// Async path — enqueue based on match type
	if h.submissionQueue != nil {
		var jobType string
		var payload []byte
		var marshalErr error

		switch req.MatchType {
		case "bracket":
			jobType = "bracket"
			payload, marshalErr = json.Marshal(map[string]interface{}{
				"claimed_winner_id": req.ClaimedWinner,
				"score_a":           req.ClaimedScoreA,
				"score_b":           req.ClaimedScoreB,
				"screenshot_urls":   req.Screenshots,
			})
		case "battle_royale":
			jobType = "br_lobby"
			payload, marshalErr = json.Marshal(map[string]interface{}{
				"placement":       req.ClaimedPlacement,
				"kills":           req.ClaimedKills,
				"screenshot_urls": req.Screenshots,
			})
		default:
			return response.Err(c, apperror.ValidationError(map[string]string{
				"match_type": "Harus 'bracket' atau 'battle_royale'",
			}))
		}

		if marshalErr != nil {
			return response.Err(c, apperror.ErrInternal)
		}

		job := queue.SubmissionJob{
			Type:          jobType,
			MatchID:       req.MatchID,
			SubmittedByID: userID.String(),
			Payload:       string(payload),
		}
		jobID, enqErr := h.submissionQueue.Enqueue(c.Context(), job)
		if enqErr != nil {
			return response.Err(c, apperror.ErrInternal)
		}
		return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
			"status":        "queued",
			"submission_id": jobID,
			"message":       "Submission sedang diproses",
		})
	}

	// Synchronous fallback when queue is not configured
	sub, svcErr := h.submissionService.SubmitUnified(
		c.Context(), userID,
		req.MatchID, req.MatchType, req.ClaimedWinner,
		req.ClaimedScoreA, req.ClaimedScoreB,
		req.ClaimedPlacement, req.ClaimedKills,
		req.Screenshots,
	)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}
	return response.Created(c, sub)
}

// GetSubmissionStatus looks up a submission record by its DB UUID.
// When a submission was queued asynchronously the caller can poll this endpoint
// until the worker has written the record and a real status is returned.
// The :id parameter accepts a standard UUID (the submission's database ID),
// not the Redis stream message ID.
func (h *MatchSubmissionHandler) GetSubmissionStatus(c *fiber.Ctx) error {
	submissionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Submission ID tidak valid")
	}

	sub, svcErr := h.submissionService.GetSubmission(c.Context(), submissionID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	// Verify the requesting user is authorised to view this submission
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)
	if !h.submissionService.CanAccessSubmission(c.Context(), sub, userID, role) {
		return response.Err(c, apperror.BusinessRule("FORBIDDEN", "Anda tidak memiliki akses ke submission ini"))
	}

	return response.OK(c, fiber.Map{
		"submission_id": sub.ID,
		"status":        sub.Status,
		"created_at":    sub.CreatedAt,
		"updated_at":    sub.UpdatedAt,
	})
}

func (h *MatchSubmissionHandler) GetActiveMatches(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	matches, err := h.submissionService.GetPlayerActiveMatches(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if matches == nil {
		matches = []*service.ActiveMatchDTO{}
	}
	return response.OK(c, matches)
}

func (h *MatchSubmissionHandler) GetMySubmissions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	subs, err := h.submissionService.GetPlayerSubmissions(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if subs == nil {
		subs = []*model.MatchSubmission{}
	}
	return response.OK(c, subs)
}
