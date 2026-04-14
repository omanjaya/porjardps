package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

func (h *GroupHandler) AutoDraw(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req struct {
		NumGroups       int `json:"num_groups"`
		AdvancePerGroup int `json:"advance_per_group"`
		Legs            int `json:"legs"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}
	if req.NumGroups < 2 {
		return response.BadRequest(c, "Minimal 2 grup")
	}
	if req.AdvancePerGroup < 1 {
		return response.BadRequest(c, "Minimal 1 tim lolos per grup")
	}
	if req.Legs <= 0 {
		req.Legs = 1
	}

	groups, err := h.groupService.AutoDrawGroups(c.Context(), tournamentID, req.NumGroups, req.AdvancePerGroup, req.Legs)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, groups)
}

func (h *GroupHandler) AdvanceToPlayoff(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	ok, err := h.groupService.CheckAndAdvanceToPlayoff(c.Context(), tournamentID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{
		"advanced": ok,
		"message":  "Bracket playoff berhasil di-generate dari hasil grup",
	})
}

func (h *GroupHandler) ResetGroupResults(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	if err := h.groupService.ResetGroupResults(c.Context(), tournamentID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Semua hasil grup berhasil direset"})
}

func (h *GroupHandler) ResetSingleGroupResults(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	if err := h.groupService.ResetSingleGroupResults(c.Context(), groupID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Hasil grup berhasil direset"})
}
