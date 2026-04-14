package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type MatchCheckinHandler struct {
	svc *service.MatchCheckinService
}

func NewMatchCheckinHandler(svc *service.MatchCheckinService) *MatchCheckinHandler {
	return &MatchCheckinHandler{svc: svc}
}

type checkinRequest struct {
	TeamSide string `json:"team_side"`
}

// CheckIn — POST /api/v1/matches/:id/check-in
// Body: { team_side: 'a' | 'b' } (optional — auto-detected from user if empty).
func (h *MatchCheckinHandler) CheckIn(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID == uuid.Nil {
		return response.Err(c, apperror.ErrUnauthorized)
	}

	idStr := c.Params("id")
	matchID, err := uuid.Parse(idStr)
	if err != nil {
		return response.Err(c, apperror.New("INVALID_MATCH_ID", "Match ID tidak valid", 400))
	}

	var req checkinRequest
	if err := c.BodyParser(&req); err != nil {
		// body is optional — ignore parse error and fall through
		req = checkinRequest{}
	}

	teamSide := req.TeamSide
	if teamSide == "" {
		// auto-detect side from user's team membership
		resolved, rerr := h.svc.ResolveUserSide(c.Context(), matchID, userID)
		if rerr != nil {
			if appErr, ok := rerr.(*apperror.AppError); ok {
				return response.Err(c, appErr)
			}
			return response.Err(c, apperror.New("INTERNAL", rerr.Error(), 500))
		}
		if resolved == "" {
			return response.Err(c, apperror.New("NOT_TEAM_MEMBER", "Anda tidak terdaftar di kedua tim match ini", 403))
		}
		teamSide = resolved
	}

	ci, err := h.svc.CheckInBracket(c.Context(), matchID, teamSide, userID)
	if err != nil {
		if appErr, ok := err.(*apperror.AppError); ok {
			return response.Err(c, appErr)
		}
		return response.Err(c, apperror.New("INTERNAL", err.Error(), 500))
	}

	return response.OK(c, fiber.Map{
		"success":       true,
		"checked_in_at": ci.CheckedInAt,
		"team_side":     ci.TeamSide,
		"team_id":       ci.TeamID,
		"match_id":      ci.MatchID,
	})
}
