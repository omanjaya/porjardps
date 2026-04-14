package handler

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type StageHandler struct {
	stageService *service.StageService
}

func NewStageHandler(svc *service.StageService) *StageHandler {
	return &StageHandler{stageService: svc}
}

func (h *StageHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Public
	app.Get("/tournaments/:id/stages", h.ListStages)

	// Admin
	app.Post("/admin/tournaments/:id/stages", authMw, adminMw, h.CreateStage)
	app.Delete("/admin/stages/:id", authMw, adminMw, h.DeleteStage)
	app.Post("/admin/stages/:id/activate", authMw, adminMw, h.ActivateStage)
	app.Post("/admin/stages/:id/complete", authMw, adminMw, h.CompleteStage)
	app.Post("/admin/stages/:id/advance", authMw, adminMw, h.AdvanceToNextStage)
}

type createStageRequest struct {
	StageOrder int             `json:"stage_order"`
	StageType  string          `json:"stage_type"`
	Name       string          `json:"name"`
	Config     json.RawMessage `json:"config"`
}

func (h *StageHandler) CreateStage(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req createStageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.Name == "" {
		return response.BadRequest(c, "Nama stage harus diisi")
	}
	if req.StageType == "" {
		return response.BadRequest(c, "Tipe stage harus diisi")
	}
	if req.StageOrder <= 0 {
		req.StageOrder = 1
	}

	stage, err := h.stageService.CreateStage(c.Context(), tournamentID, req.StageOrder, req.StageType, req.Name, req.Config)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.Created(c, stage)
}

func (h *StageHandler) ListStages(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	stages, err := h.stageService.ListStages(c.Context(), tournamentID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, stages)
}

func (h *StageHandler) DeleteStage(c *fiber.Ctx) error {
	stageID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Stage ID tidak valid")
	}

	if err := h.stageService.DeleteStage(c.Context(), stageID); err != nil {
		return response.HandleError(c, err)
	}

	return response.NoContent(c)
}

func (h *StageHandler) ActivateStage(c *fiber.Ctx) error {
	stageID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Stage ID tidak valid")
	}

	if err := h.stageService.ActivateStage(c.Context(), stageID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Stage berhasil diaktifkan"})
}

func (h *StageHandler) CompleteStage(c *fiber.Ctx) error {
	stageID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Stage ID tidak valid")
	}

	if err := h.stageService.CompleteStage(c.Context(), stageID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Stage berhasil diselesaikan"})
}

func (h *StageHandler) AdvanceToNextStage(c *fiber.Ctx) error {
	stageID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Stage ID tidak valid")
	}

	if err := h.stageService.AdvanceToNextStage(c.Context(), stageID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Berhasil advance ke stage berikutnya"})
}
