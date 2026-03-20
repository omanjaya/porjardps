package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type GameRulesHandler struct {
	rulesRepo model.GameRuleRepository
	gameRepo  model.GameRepository
}

func NewGameRulesHandler(rulesRepo model.GameRuleRepository, gameRepo model.GameRepository) *GameRulesHandler {
	return &GameRulesHandler{
		rulesRepo: rulesRepo,
		gameRepo:  gameRepo,
	}
}

func (h *GameRulesHandler) RegisterRoutes(api fiber.Router, authMw, adminMw fiber.Handler) {
	// Public: get published rules for a game
	api.Get("/games/:slug/rules", h.GetPublicRules)

	// Admin: get all rules (including unpublished)
	api.Get("/admin/games/:slug/rules", authMw, adminMw, h.GetAdminRules)

	// Admin: bulk upsert rules for a game
	api.Put("/admin/games/:slug/rules", authMw, adminMw, h.BulkUpsertRules)

	// Admin: delete a rule section
	api.Delete("/admin/game-rules/:id", authMw, adminMw, h.DeleteRule)
}

// GetPublicRules returns published rules for a game (public endpoint)
func (h *GameRulesHandler) GetPublicRules(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return response.BadRequest(c, "Slug wajib diisi")
	}

	game, err := h.gameRepo.FindBySlug(c.Context(), slug)
	if err != nil {
		return response.HandleError(c, err)
	}
	if game == nil {
		return response.NotFound(c, "Game tidak ditemukan")
	}

	rules, err := h.rulesRepo.ListByGame(c.Context(), game.ID, true)
	if err != nil {
		return response.HandleError(c, err)
	}

	if rules == nil {
		rules = []*model.GameRule{}
	}

	return response.OK(c, rules)
}

// GetAdminRules returns all rules for a game (admin endpoint)
func (h *GameRulesHandler) GetAdminRules(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return response.BadRequest(c, "Slug wajib diisi")
	}

	game, err := h.gameRepo.FindBySlug(c.Context(), slug)
	if err != nil {
		return response.HandleError(c, err)
	}
	if game == nil {
		return response.NotFound(c, "Game tidak ditemukan")
	}

	rules, err := h.rulesRepo.ListByGame(c.Context(), game.ID, false)
	if err != nil {
		return response.HandleError(c, err)
	}

	if rules == nil {
		rules = []*model.GameRule{}
	}

	return response.OK(c, rules)
}

type bulkUpsertRequest struct {
	Sections []sectionInput `json:"sections"`
}

type sectionInput struct {
	SectionName  string `json:"section_name"`
	SectionOrder int    `json:"section_order"`
	Content      string `json:"content"`
	IsPublished  bool   `json:"is_published"`
}

// BulkUpsertRules creates or updates all rule sections for a game
func (h *GameRulesHandler) BulkUpsertRules(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return response.BadRequest(c, "Slug wajib diisi")
	}

	game, err := h.gameRepo.FindBySlug(c.Context(), slug)
	if err != nil {
		return response.HandleError(c, err)
	}
	if game == nil {
		return response.NotFound(c, "Game tidak ditemukan")
	}

	var req bulkUpsertRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format body tidak valid")
	}

	if len(req.Sections) == 0 {
		return response.BadRequest(c, "Minimal satu section diperlukan")
	}

	for _, s := range req.Sections {
		if s.SectionName == "" {
			return response.BadRequest(c, "Nama section tidak boleh kosong")
		}
		if s.Content == "" {
			return response.BadRequest(c, "Konten section tidak boleh kosong")
		}

		rule := &model.GameRule{
			ID:           uuid.New(),
			GameID:       game.ID,
			SectionName:  s.SectionName,
			SectionOrder: s.SectionOrder,
			Content:      s.Content,
			IsPublished:  s.IsPublished,
		}
		if err := h.rulesRepo.Upsert(c.Context(), rule); err != nil {
			return response.HandleError(c, err)
		}
	}

	// Return updated rules
	rules, err := h.rulesRepo.ListByGame(c.Context(), game.ID, false)
	if err != nil {
		return response.HandleError(c, err)
	}

	if rules == nil {
		rules = []*model.GameRule{}
	}

	return response.OK(c, rules)
}

// DeleteRule deletes a rule section by ID
func (h *GameRulesHandler) DeleteRule(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	if err := h.rulesRepo.Delete(c.Context(), id); err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, fiber.Map{"deleted": true})
}
