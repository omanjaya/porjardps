package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type initSwissRequest struct {
	Name          string `json:"name"`
	MaxRounds     int    `json:"max_rounds"`
	WinThreshold  int    `json:"win_threshold"`
	LossThreshold int    `json:"loss_threshold"`
}

func (h *GroupHandler) InitSwiss(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req initSwissRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Name == "" {
		req.Name = "Swiss"
	}
	if req.MaxRounds <= 0 {
		req.MaxRounds = 5
	}
	if req.WinThreshold <= 0 {
		req.WinThreshold = 3
	}
	if req.LossThreshold <= 0 {
		req.LossThreshold = 3
	}

	config := model.SwissConfig{
		MaxRounds:     req.MaxRounds,
		WinThreshold:  req.WinThreshold,
		LossThreshold: req.LossThreshold,
	}

	group, err := h.groupService.InitSwissGroup(c.Context(), tournamentID, req.Name, config)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Created(c, group)
}

func (h *GroupHandler) GenerateSwissRound(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	matches, err := h.groupService.GenerateSwissRound(c.Context(), groupID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, matches)
}

func (h *GroupHandler) GetSwissStatus(c *fiber.Ctx) error {
	groupID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Group ID tidak valid")
	}

	status, err := h.groupService.GetSwissStatus(c.Context(), groupID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, status)
}
