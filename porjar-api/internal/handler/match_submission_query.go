package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

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

	// Normalize to frontend-compatible shape
	views := make([]adminSubmissionView, len(enriched))
	for i, dto := range enriched {
		views[i] = dtoToAdminView(dto)
	}

	totalPages := (total + limit - 1) / limit
	return response.Paginated(c, views, response.Meta{
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

	// Enrich single submission
	enriched, enrichErr := h.submissionService.EnrichSubmissions(c.Context(), []*model.MatchSubmission{sub})
	if enrichErr != nil || len(enriched) == 0 {
		return response.HandleError(c, enrichErr)
	}
	view := dtoToAdminView(enriched[0])

	// Fetch all submissions for the same match to build opponent + history
	var allSubs []*model.MatchSubmission
	if sub.GroupMatchID != nil {
		allSubs, _ = h.submissionService.GetSubmissionsByGroupMatch(c.Context(), *sub.GroupMatchID)
	} else if sub.BracketMatchID != nil {
		allSubs, _ = h.submissionService.GetSubmissionsByMatch(c.Context(), *sub.BracketMatchID)
	} else if sub.BRLobbyID != nil {
		allSubs, _ = h.submissionService.GetSubmissionsByLobby(c.Context(), *sub.BRLobbyID)
	}

	if len(allSubs) > 1 {
		allEnriched, _ := h.submissionService.EnrichSubmissions(c.Context(), allSubs)
		var history []adminSubmissionView
		for _, dto := range allEnriched {
			if dto.ID == sub.ID {
				continue
			}
			v := dtoToAdminView(dto)
			// First submission from a different team is the opponent
			if view.OpponentSubmission == nil && dto.TeamID != sub.TeamID {
				vCopy := v
				view.OpponentSubmission = &vCopy
			}
			history = append(history, v)
		}
		if len(history) > 0 {
			view.History = history
		}
	}

	return response.OK(c, view)
}

func (h *MatchSubmissionHandler) GetMatchSubmissions(c *fiber.Ctx) error {
	matchID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	// Try bracket match first, then group match
	subs, svcErr := h.submissionService.GetSubmissionsByMatch(c.Context(), matchID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}
	if len(subs) == 0 {
		// Fallback: try as group match ID
		groupSubs, _ := h.submissionService.GetSubmissionsByGroupMatch(c.Context(), matchID)
		if len(groupSubs) > 0 {
			subs = groupSubs
		}
	}

	// Public endpoint: only return approved submissions.
	// Pending/disputed/rejected submissions are internal data — only visible to admins.
	filtered := make([]*model.MatchSubmission, 0, len(subs))
	for _, s := range subs {
		if s.Status == "approved" {
			filtered = append(filtered, s)
		}
	}

	enriched := h.submissionService.EnrichWithNames(c.Context(), filtered)
	return response.OK(c, enriched)
}

func (h *MatchSubmissionHandler) GetTeamSubmissions(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	// Verify the requesting user is a member of this team or an admin
	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)
	if role != "admin" && role != "superadmin" {
		isMember, _ := h.submissionService.CheckTeamMember(c.Context(), teamID, userID)
		if !isMember {
			return response.Err(c, apperror.BusinessRule("FORBIDDEN", "Anda tidak memiliki akses ke submission tim ini"))
		}
	}

	subs, svcErr := h.submissionService.GetSubmissionsByTeam(c.Context(), teamID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, subs)
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
	enriched := h.submissionService.EnrichForPlayer(c.Context(), subs)
	return response.OK(c, enriched)
}
