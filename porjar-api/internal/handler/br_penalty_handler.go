package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

// ApplyPenalty applies a penalty to a team
type applyPenaltyRequest struct {
	TeamID  string  `json:"team_id"`
	LobbyID *string `json:"lobby_id"`
	Type    string  `json:"type"`
	Points  int     `json:"points"`
	Reason  *string `json:"reason"`
}

func (h *BRHandler) ApplyPenalty(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req applyPenaltyRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	teamID, err := uuid.Parse(req.TeamID)
	if err != nil {
		details["team_id"] = "Team ID tidak valid"
	}

	validTypes := map[string]bool{
		"late_join": true, "disconnect": true, "behavior": true, "custom": true,
	}
	if !validTypes[req.Type] {
		details["type"] = "Tipe penalti tidak valid. Gunakan: late_join, disconnect, behavior, custom"
	}
	if req.Points <= 0 {
		details["points"] = "Poin penalti harus lebih dari 0"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	var lobbyID *uuid.UUID
	if req.LobbyID != nil {
		parsed, err := uuid.Parse(*req.LobbyID)
		if err != nil {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"lobby_id": "Lobby ID tidak valid",
			}))
		}
		lobbyID = &parsed
	}

	// Get admin user ID from context
	userIDStr, ok := c.Locals("userID").(string)
	if !ok || userIDStr == "" {
		return response.Err(c, apperror.ErrUnauthorized)
	}
	appliedBy, err := uuid.Parse(userIDStr)
	if err != nil {
		return response.Err(c, apperror.ErrUnauthorized)
	}

	if svcErr := h.brService.ApplyPenalty(c.Context(), tournamentID, teamID, lobbyID, req.Type, req.Points, req.Reason, appliedBy); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Penalti berhasil diterapkan"})
}

func (h *BRHandler) GetPenalties(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	penalties, svcErr := h.brService.GetPenalties(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, penalties)
}

func (h *BRHandler) RemovePenalty(c *fiber.Ctx) error {
	penaltyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Penalty ID tidak valid")
	}

	if svcErr := h.brService.RemovePenalty(c.Context(), penaltyID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Penalti berhasil dihapus"})
}
