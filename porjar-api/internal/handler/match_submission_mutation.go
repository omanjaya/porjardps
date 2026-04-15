package handler

import (
	"log/slog"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

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
		req.Approved, req.RejectionReason, req.AdminNotes,
	); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	status := "approved"
	if !req.Approved {
		status = "rejected"
	}

	slog.Info("submission verified",
		"submission_id", submissionID,
		"admin_id", adminID,
		"status", status,
		"operation", "verify_submission",
	)

	return response.OK(c, fiber.Map{
		"message": "Submission berhasil diverifikasi",
		"status":  status,
	})
}

// DeleteScreenshot removes a single screenshot from a pending submission.
func (h *MatchSubmissionHandler) DeleteScreenshot(c *fiber.Ctx) error {
	submissionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Submission ID tidak valid")
	}

	var req struct {
		URL string `json:"url"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.URL == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{"url": "URL screenshot wajib diisi"}))
	}

	userID := middleware.GetUserID(c)
	if err := h.submissionService.DeleteScreenshot(c.Context(), submissionID, userID, req.URL); err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, fiber.Map{"message": "Screenshot berhasil dihapus"})
}

// UpdateSubmission allows a player to update their pending submission (scores, winner, placement, kills, screenshots).
func (h *MatchSubmissionHandler) UpdateSubmission(c *fiber.Ctx) error {
	submissionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Submission ID tidak valid")
	}

	var req struct {
		ClaimedWinner    string   `json:"claimed_winner"`
		ClaimedScoreA    *int     `json:"claimed_score_a"`
		ClaimedScoreB    *int     `json:"claimed_score_b"`
		ClaimedPlacement *int     `json:"claimed_placement"`
		KillsP1          *int     `json:"kills_p1"`
		KillsP2          *int     `json:"kills_p2"`
		KillsP3          *int     `json:"kills_p3"`
		KillsP4          *int     `json:"kills_p4"`
		Screenshots      []string `json:"screenshots"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate screenshots
	if len(req.Screenshots) > 10 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"screenshots": "Maksimal 10 screenshot",
		}))
	}
	if err := validateScreenshotURLs(req.Screenshots); err != nil {
		return response.BadRequest(c, err.Error())
	}

	userID := middleware.GetUserID(c)

	if err := h.submissionService.UpdateSubmission(c.Context(), submissionID, userID, service.UpdateSubmissionInput{
		ClaimedWinner:    req.ClaimedWinner,
		ClaimedScoreA:    req.ClaimedScoreA,
		ClaimedScoreB:    req.ClaimedScoreB,
		ClaimedPlacement: req.ClaimedPlacement,
		KillsP1:          req.KillsP1,
		KillsP2:          req.KillsP2,
		KillsP3:          req.KillsP3,
		KillsP4:          req.KillsP4,
		Screenshots:      req.Screenshots,
	}); err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, fiber.Map{"message": "Submission berhasil diperbarui"})
}

// UpdateScreenshots allows a player to replace screenshots on their pending submission.
func (h *MatchSubmissionHandler) UpdateScreenshots(c *fiber.Ctx) error {
	submissionID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Submission ID tidak valid")
	}

	var req struct {
		Screenshots []string `json:"screenshots"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
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
	if err := validateScreenshotURLs(req.Screenshots); err != nil {
		return response.BadRequest(c, err.Error())
	}

	userID := middleware.GetUserID(c)
	if err := h.submissionService.UpdateScreenshots(c.Context(), submissionID, userID, req.Screenshots); err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, fiber.Map{"message": "Screenshot berhasil diperbarui"})
}

// ResetMatchSubmissions deletes all submissions for a specific bracket or group match.
func (h *MatchSubmissionHandler) ResetMatchSubmissions(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	matchType := c.Query("type", "bracket")

	switch matchType {
	case "bracket":
		if err := h.submissionService.ResetBracketMatchSubmissions(c.Context(), matchID); err != nil {
			return response.HandleError(c, err)
		}
	case "group":
		if err := h.submissionService.ResetGroupMatchSubmissions(c.Context(), matchID); err != nil {
			return response.HandleError(c, err)
		}
	default:
		return response.BadRequest(c, "Type harus 'bracket' atau 'group'")
	}

	return response.OK(c, fiber.Map{"message": "Submissions berhasil direset"})
}
