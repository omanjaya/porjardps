package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
)

type GameHandler struct {
	gameRepo       model.GameRepository
	tournamentRepo model.TournamentRepository
}

func NewGameHandler(gameRepo model.GameRepository, tournamentRepo model.TournamentRepository) *GameHandler {
	return &GameHandler{
		gameRepo:       gameRepo,
		tournamentRepo: tournamentRepo,
	}
}

type gameResponse struct {
	model.Game
	TournamentCount *int `json:"tournament_count,omitempty"`
}

func (h *GameHandler) ListGames(c *fiber.Ctx) error {
	games, err := h.gameRepo.List(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}

	// Filter only active games
	activeGames := make([]*model.Game, 0)
	for _, g := range games {
		if g.IsActive {
			activeGames = append(activeGames, g)
		}
	}

	return response.OK(c, activeGames)
}

func (h *GameHandler) GetGameBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return response.BadRequest(c, "Slug wajib diisi")
	}

	game, err := h.gameRepo.FindBySlug(c.Context(), slug)
	if err != nil || game == nil {
		return response.HandleError(c, apperror.NotFound("game"))
	}

	// Count tournaments for this game
	filter := model.TournamentFilter{
		GameID: &game.ID,
		Page:   1,
		Limit:  0,
	}
	_, count, err := h.tournamentRepo.List(c.Context(), filter)
	if err != nil {
		// If tournament count fails, still return the game without count
		return response.OK(c, gameResponse{Game: *game})
	}

	return response.OK(c, gameResponse{
		Game:            *game,
		TournamentCount: &count,
	})
}
