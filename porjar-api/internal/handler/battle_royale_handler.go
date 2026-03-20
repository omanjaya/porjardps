package handler

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type BRHandler struct {
	brService        *service.BRService
	standingsService *service.StandingsService
}

func NewBRHandler(brService *service.BRService, standingsService *service.StandingsService) *BRHandler {
	return &BRHandler{
		brService:        brService,
		standingsService: standingsService,
	}
}

func (h *BRHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Admin routes
	app.Post("/admin/lobbies", authMw, adminMw, h.CreateLobby)
	app.Delete("/admin/lobbies/:id", authMw, adminMw, h.DeleteLobby)
	app.Put("/admin/lobbies/:id/status", authMw, adminMw, h.UpdateLobbyStatus)
	app.Post("/admin/lobbies/:id/results", authMw, adminMw, h.InputResults)
	app.Put("/admin/tournaments/:id/point-rules", authMw, adminMw, h.UpdatePointRules)
	app.Post("/admin/lobbies/:id/player-results", authMw, adminMw, h.InputPlayerResults)
	app.Post("/admin/tournaments/:id/penalties", authMw, adminMw, h.ApplyPenalty)
	app.Get("/admin/tournaments/:id/penalties", authMw, adminMw, h.GetPenalties)
	app.Delete("/admin/penalties/:id", authMw, adminMw, h.RemovePenalty)

	// Public routes
	app.Get("/lobbies/:id", h.GetLobby)
	app.Get("/tournaments/:id/lobbies", h.GetLobbysByTournament)
	app.Get("/tournaments/:id/standings", h.GetStandings)
	app.Get("/tournaments/:id/point-rules", h.GetPointRules)
	app.Get("/tournaments/:id/qualification", h.GetQualification)
}

type createLobbyRequest struct {
	TournamentID string  `json:"tournament_id"`
	LobbyName    string  `json:"lobby_name"`
	LobbyNumber  int     `json:"lobby_number"`
	DayNumber    int     `json:"day_number"`
	RoomID       *string `json:"room_id"`
	RoomPassword *string `json:"room_password"`
	ScheduledAt  *string `json:"scheduled_at"`
}

func (h *BRHandler) CreateLobby(c *fiber.Ctx) error {
	var req createLobbyRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	tournamentID, err := uuid.Parse(req.TournamentID)
	if err != nil {
		details["tournament_id"] = "Tournament ID tidak valid"
	}
	if req.LobbyName == "" {
		details["lobby_name"] = "Nama lobby wajib diisi"
	}
	if req.LobbyNumber <= 0 {
		details["lobby_number"] = "Nomor lobby harus lebih dari 0"
	}
	if req.DayNumber <= 0 {
		details["day_number"] = "Nomor hari harus lebih dari 0"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	var scheduledAt *time.Time
	if req.ScheduledAt != nil {
		if t, err := parseTime(*req.ScheduledAt); err == nil {
			scheduledAt = &t
		}
	}

	lobby, svcErr := h.brService.CreateLobby(c.Context(), tournamentID, req.LobbyName, req.LobbyNumber, req.DayNumber, req.RoomID, req.RoomPassword, scheduledAt)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, lobby)
}

type updateLobbyStatusRequest struct {
	Status string `json:"status"`
}

func (h *BRHandler) DeleteLobby(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}

	if svcErr := h.brService.DeleteLobby(c.Context(), lobbyID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Lobby berhasil dihapus"})
}

func (h *BRHandler) UpdateLobbyStatus(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}

	var req updateLobbyStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	validStatuses := map[string]bool{
		"scheduled": true, "live": true, "completed": true, "cancelled": true,
	}
	if !validStatuses[req.Status] {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"status": "Status tidak valid. Gunakan: scheduled, live, completed, cancelled",
		}))
	}

	if svcErr := h.brService.UpdateLobbyStatus(c.Context(), lobbyID, req.Status); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Status lobby berhasil diperbarui"})
}

type resultInputRequest struct {
	TeamID        string  `json:"team_id"`
	Placement     int     `json:"placement"`
	Kills         int     `json:"kills"`
	Status        string  `json:"status"`
	PenaltyPoints int     `json:"penalty_points"`
	PenaltyReason *string `json:"penalty_reason"`
	DamageDealt   int     `json:"damage_dealt"`
	SurvivalBonus int     `json:"survival_bonus"`
}

type inputResultsRequest struct {
	Results []resultInputRequest `json:"results"`
}

func (h *BRHandler) InputResults(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}

	var req inputResultsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if len(req.Results) == 0 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"results": "Hasil pertandingan wajib diisi",
		}))
	}

	var results []service.ResultInput
	for i, r := range req.Results {
		teamID, err := uuid.Parse(r.TeamID)
		if err != nil {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"results": fmt.Sprintf("Team ID pada index %d tidak valid", i),
			}))
		}
		if r.Placement <= 0 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"results": fmt.Sprintf("Placement pada index %d harus lebih dari 0", i),
			}))
		}
		results = append(results, service.ResultInput{
			TeamID:        teamID,
			Placement:     r.Placement,
			Kills:         r.Kills,
			Status:        r.Status,
			PenaltyPoints: r.PenaltyPoints,
			PenaltyReason: r.PenaltyReason,
			DamageDealt:   r.DamageDealt,
			SurvivalBonus: r.SurvivalBonus,
		})
	}

	if svcErr := h.brService.InputResults(c.Context(), lobbyID, results); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Hasil pertandingan berhasil disimpan"})
}

func (h *BRHandler) GetLobby(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}

	lobby, results, svcErr := h.brService.GetLobby(c.Context(), lobbyID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{
		"lobby":   lobby,
		"results": results,
	})
}

func (h *BRHandler) GetLobbysByTournament(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	lobbies, svcErr := h.brService.GetLobbysByTournament(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, lobbies)
}

func (h *BRHandler) GetStandings(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	standings, svcErr := h.standingsService.GetByTournament(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, standings)
}

func (h *BRHandler) GetPointRules(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	rules, svcErr := h.brService.GetPointRules(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, rules)
}

// UpdatePointRules updates point rules + kill_point_value + wwcd_bonus for a tournament
type updatePointRulesRequest struct {
	KillPointValue         *float64 `json:"kill_point_value"`
	WWCDBonus              *int     `json:"wwcd_bonus"`
	QualificationThreshold *int     `json:"qualification_threshold"`
	MaxLobbyTeams          *int     `json:"max_lobby_teams"`
	Rules                  []struct {
		Placement int `json:"placement"`
		Points    int `json:"points"`
	} `json:"rules"`
}

func (h *BRHandler) UpdatePointRules(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req updatePointRulesRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Note: The actual tournament update should be done via tournament service
	// This endpoint focuses on point rules. Tournament fields (kill_point_value, wwcd_bonus, etc.)
	// are stored on the tournament and should be updated via PUT /admin/tournaments/:id
	// For now, we just update the point rules if provided.

	if len(req.Rules) > 0 {
		// Delete existing rules and recreate
		_, svcErr := h.brService.GetPointRules(c.Context(), tournamentID)
		if svcErr != nil {
			return response.HandleError(c, svcErr)
		}

		// Use service to recreate rules
		if svcErr := h.brService.UpdatePointRules(c.Context(), tournamentID, req.Rules, req.KillPointValue, req.WWCDBonus, req.QualificationThreshold, req.MaxLobbyTeams); svcErr != nil {
			return response.HandleError(c, svcErr)
		}
	}

	return response.OK(c, fiber.Map{"message": "Point rules berhasil diperbarui"})
}

// InputPlayerResults inputs per-player results for a lobby result
type playerResultInputRequest struct {
	Players []struct {
		UserID              string `json:"user_id"`
		Kills               int    `json:"kills"`
		Damage              int    `json:"damage"`
		IsMVP               bool   `json:"is_mvp"`
		SurvivalTimeSeconds *int   `json:"survival_time_seconds"`
	} `json:"players"`
}

func (h *BRHandler) InputPlayerResults(c *fiber.Ctx) error {
	lobbyResultID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby Result ID tidak valid")
	}

	var req playerResultInputRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if len(req.Players) == 0 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"players": "Data pemain wajib diisi",
		}))
	}

	var players []service.PlayerResultInput
	for i, p := range req.Players {
		userID, err := uuid.Parse(p.UserID)
		if err != nil {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"players": fmt.Sprintf("User ID pada index %d tidak valid", i),
			}))
		}
		players = append(players, service.PlayerResultInput{
			UserID:              userID,
			Kills:               p.Kills,
			Damage:              p.Damage,
			IsMVP:               p.IsMVP,
			SurvivalTimeSeconds: p.SurvivalTimeSeconds,
		})
	}

	if svcErr := h.brService.InputPlayerResults(c.Context(), lobbyResultID, players); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Data pemain berhasil disimpan"})
}

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
	appliedBy, _ := uuid.Parse(c.Locals("userID").(string))

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

func (h *BRHandler) GetQualification(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	data, svcErr := h.brService.GetQualification(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, data)
}
