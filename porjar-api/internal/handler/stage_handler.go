package handler

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type StageHandler struct {
	stageService   *service.StageService
	stageRepo      model.StageRepository
	tournamentRepo model.TournamentRepository
	eventAdminRepo model.EventAdminRepository
}

func NewStageHandler(svc *service.StageService) *StageHandler {
	return &StageHandler{stageService: svc}
}

// SetStageRepo, SetTournamentRepo and SetEventAdminRepo wire the repos
// needed to gate /admin/stages/:id/* — StageHandler previously only held
// stageService, which has no exposed way to fetch a bare stage by ID.
// NEEDS ROUTES.GO WIRING:
//   stageHandler.SetStageRepo(stageRepo)
//   stageHandler.SetTournamentRepo(tournamentRepo)
//   stageHandler.SetEventAdminRepo(eventAdminRepo)
func (h *StageHandler) SetStageRepo(repo model.StageRepository) { h.stageRepo = repo }
func (h *StageHandler) SetTournamentRepo(repo model.TournamentRepository) {
	h.tournamentRepo = repo
}
func (h *StageHandler) SetEventAdminRepo(repo model.EventAdminRepository) {
	h.eventAdminRepo = repo
}

// checkStageAccess gates a mutating /admin/stages/:id/* route: resolves
// stageID -> tournament -> event. Superadmins always pass; fails open if
// stageRepo isn't wired yet (see scope_helpers.go header).
func (h *StageHandler) checkStageAccess(c *fiber.Ctx, stageID uuid.UUID) error {
	if h.stageRepo == nil {
		return nil
	}
	stage, err := h.stageRepo.FindByID(c.Context(), stageID)
	if err != nil {
		return response.HandleError(c, err)
	}
	if stage == nil {
		return nil
	}
	return requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, stage.TournamentID)
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
	if err := h.checkStageAccess(c, stageID); err != nil {
		return err
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
	if err := h.checkStageAccess(c, stageID); err != nil {
		return err
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
	if err := h.checkStageAccess(c, stageID); err != nil {
		return err
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
	if err := h.checkStageAccess(c, stageID); err != nil {
		return err
	}

	if err := h.stageService.AdvanceToNextStage(c.Context(), stageID); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"message": "Berhasil advance ke stage berikutnya"})
}
