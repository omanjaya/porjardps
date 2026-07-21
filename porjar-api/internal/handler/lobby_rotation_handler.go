package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type LobbyRotationHandler struct {
	rotationService *service.LobbyRotationService
	brService       *service.BRService
	tournamentRepo  model.TournamentRepository
	eventAdminRepo  model.EventAdminRepository
}

func NewLobbyRotationHandler(
	rotationService *service.LobbyRotationService,
	brService *service.BRService,
) *LobbyRotationHandler {
	return &LobbyRotationHandler{
		rotationService: rotationService,
		brService:       brService,
	}
}

// SetTournamentRepo and SetEventAdminRepo wire the repos needed to gate
// POST /admin/lobbies/:id/assign-teams, which is outside the
// /admin/tournaments/:id/* prefix already scoped by TournamentScopeMw.
// NEEDS ROUTES.GO WIRING:
//   lobbyRotationHandler.SetTournamentRepo(tournamentRepo)
//   lobbyRotationHandler.SetEventAdminRepo(eventAdminRepo)
func (h *LobbyRotationHandler) SetTournamentRepo(repo model.TournamentRepository) {
	h.tournamentRepo = repo
}
func (h *LobbyRotationHandler) SetEventAdminRepo(repo model.EventAdminRepository) {
	h.eventAdminRepo = repo
}

func (h *LobbyRotationHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Admin routes
	app.Post("/admin/tournaments/:id/rotation", authMw, adminMw, h.GenerateRotation)
	app.Post("/admin/lobbies/:id/assign-teams", authMw, adminMw, h.AssignTeams)
	app.Post("/admin/tournaments/:id/check-qualification", authMw, adminMw, h.CheckQualification)
	app.Post("/admin/tournaments/:id/lobbies/swap-teams", authMw, adminMw, h.SwapLobbyTeams)

	// Public routes
	app.Get("/lobbies/:id/teams", h.GetLobbyTeams)
	app.Get("/tournaments/:id/daily-standings/:day", h.GetDailyStandings)
}

type generateRotationRequest struct {
	NumLobbies    int `json:"num_lobbies"`
	TeamsPerLobby int `json:"teams_per_lobby"`
}

func (h *LobbyRotationHandler) GenerateRotation(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req generateRotationRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	if req.NumLobbies <= 0 {
		details["num_lobbies"] = "Jumlah lobby harus lebih dari 0"
	}
	if req.TeamsPerLobby <= 0 {
		details["teams_per_lobby"] = "Tim per lobby harus lebih dari 0"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	rounds, svcErr := h.rotationService.GenerateRotation(c.Context(), tournamentID, req.NumLobbies, req.TeamsPerLobby)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{
		"rounds":          rounds,
		"num_lobbies":     req.NumLobbies,
		"teams_per_lobby": req.TeamsPerLobby,
	})
}

type assignTeamsRequest struct {
	TeamIDs []string `json:"team_ids"`
}

func (h *LobbyRotationHandler) AssignTeams(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}
	if lobby, _, svcErr := h.brService.GetLobby(c.Context(), lobbyID); svcErr == nil && lobby != nil {
		if err := requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, lobby.TournamentID); err != nil {
			return err
		}
	}

	var req assignTeamsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if len(req.TeamIDs) == 0 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"team_ids": "Daftar tim wajib diisi",
		}))
	}

	var teamIDs []uuid.UUID
	for i, idStr := range req.TeamIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"team_ids": "Team ID pada index " + strconv.Itoa(i) + " tidak valid",
			}))
		}
		teamIDs = append(teamIDs, id)
	}

	if svcErr := h.rotationService.AssignTeamsToLobby(c.Context(), lobbyID, teamIDs); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Tim berhasil di-assign ke lobby"})
}

func (h *LobbyRotationHandler) GetLobbyTeams(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}

	teams, svcErr := h.rotationService.GetLobbyTeams(c.Context(), lobbyID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, teams)
}

func (h *LobbyRotationHandler) GetDailyStandings(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	dayNumber, err := strconv.Atoi(c.Params("day"))
	if err != nil || dayNumber <= 0 {
		return response.BadRequest(c, "Day number tidak valid")
	}

	standings, svcErr := h.brService.GetDailyStandings(c.Context(), tournamentID, dayNumber)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, standings)
}

// SwapLobbyTeams swaps two teams between their lobbies.
func (h *LobbyRotationHandler) SwapLobbyTeams(c *fiber.Ctx) error {
	if _, err := uuid.Parse(c.Params("id")); err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req struct {
		TeamAID  string `json:"team_a_id"`
		LobbyAID string `json:"lobby_a_id"`
		TeamBID  string `json:"team_b_id"`
		LobbyBID string `json:"lobby_b_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	teamAID, err := uuid.Parse(req.TeamAID)
	if err != nil {
		details["team_a_id"] = "Team A ID tidak valid"
	}
	lobbyAID, err := uuid.Parse(req.LobbyAID)
	if err != nil {
		details["lobby_a_id"] = "Lobby A ID tidak valid"
	}
	teamBID, err := uuid.Parse(req.TeamBID)
	if err != nil {
		details["team_b_id"] = "Team B ID tidak valid"
	}
	lobbyBID, err := uuid.Parse(req.LobbyBID)
	if err != nil {
		details["lobby_b_id"] = "Lobby B ID tidak valid"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	if svcErr := h.rotationService.SwapLobbyTeams(c.Context(), teamAID, lobbyAID, teamBID, lobbyBID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Tim berhasil ditukar antar lobby"})
}

func (h *LobbyRotationHandler) CheckQualification(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	qualified, eliminated, svcErr := h.brService.CheckQualification(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{
		"qualified":  qualified,
		"eliminated": eliminated,
	})
}
