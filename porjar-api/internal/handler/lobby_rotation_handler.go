package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type LobbyRotationHandler struct {
	rotationService *service.LobbyRotationService
	brService       *service.BRService
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

func (h *LobbyRotationHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Admin routes
	app.Post("/admin/tournaments/:id/rotation", authMw, adminMw, h.GenerateRotation)
	app.Post("/admin/lobbies/:id/assign-teams", authMw, adminMw, h.AssignTeams)
	app.Post("/admin/tournaments/:id/check-qualification", authMw, adminMw, h.CheckQualification)

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
