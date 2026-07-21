package handler

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type BRHandler struct {
	brService        *service.BRService
	standingsService *service.StandingsService
	tournamentRepo   model.TournamentRepository
	eventAdminRepo   model.EventAdminRepository
	penaltyRepo      model.BRPenaltyRepository
	lobbyResultRepo  model.BRLobbyResultRepository
}

func NewBRHandler(brService *service.BRService, standingsService *service.StandingsService) *BRHandler {
	return &BRHandler{
		brService:        brService,
		standingsService: standingsService,
	}
}

func (h *BRHandler) SetTournamentRepo(repo model.TournamentRepository) {
	h.tournamentRepo = repo
}

// SetEventAdminRepo, SetPenaltyRepo and SetLobbyResultRepo wire the repos
// needed to gate /admin/lobbies*, /admin/lobbies/:id/player-results and
// /admin/penalties/:id — all outside the /admin/tournaments/:id/* prefix
// that TournamentScopeMw already scopes.
// NEEDS ROUTES.GO WIRING:
//   brHandler.SetEventAdminRepo(eventAdminRepo)
//   brHandler.SetPenaltyRepo(brPenaltyRepo)
//   brHandler.SetLobbyResultRepo(brResultRepo)
func (h *BRHandler) SetEventAdminRepo(repo model.EventAdminRepository) {
	h.eventAdminRepo = repo
}
func (h *BRHandler) SetPenaltyRepo(repo model.BRPenaltyRepository) {
	h.penaltyRepo = repo
}
func (h *BRHandler) SetLobbyResultRepo(repo model.BRLobbyResultRepository) {
	h.lobbyResultRepo = repo
}

// checkLobbyAccess gates a mutating /admin/lobbies/:id/* route: resolves
// lobbyID -> tournament -> event. Superadmins always pass.
func (h *BRHandler) checkLobbyAccess(c *fiber.Ctx, lobbyID uuid.UUID) error {
	lobby, _, svcErr := h.brService.GetLobby(c.Context(), lobbyID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}
	if lobby == nil {
		return nil
	}
	return requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, lobby.TournamentID)
}

// checkPenaltyAccessMw gates DELETE /admin/penalties/:id, whose handler
// (RemovePenalty) lives in br_penalty_handler.go — a file outside this
// task's edit scope. BRPenalty already carries TournamentID directly, so no
// extra lookup is needed beyond the penalty record itself.
func (h *BRHandler) checkPenaltyAccessMw(c *fiber.Ctx) error {
	penaltyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Next() // let the real handler return its own validation error
	}
	if h.penaltyRepo == nil {
		return c.Next()
	}
	penalty, pErr := h.penaltyRepo.FindByID(c.Context(), penaltyID)
	if pErr != nil {
		return response.HandleError(c, pErr)
	}
	if penalty == nil {
		return c.Next()
	}
	if err := requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, penalty.TournamentID); err != nil {
		return err
	}
	return c.Next()
}

func (h *BRHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	// Admin routes
	app.Post("/admin/lobbies", authMw, adminMw, h.CreateLobby)
	app.Put("/admin/lobbies/:id", authMw, adminMw, h.UpdateLobby)
	app.Delete("/admin/lobbies/:id", authMw, adminMw, h.DeleteLobby)
	app.Put("/admin/lobbies/:id/status", authMw, adminMw, h.UpdateLobbyStatus)
	app.Post("/admin/lobbies/:id/results", authMw, adminMw, h.InputResults)
	app.Put("/admin/tournaments/:id/point-rules", authMw, adminMw, h.UpdatePointRules)
	app.Post("/admin/lobbies/:id/player-results", authMw, adminMw, h.InputPlayerResults)
	app.Post("/admin/tournaments/:id/penalties", authMw, adminMw, h.ApplyPenalty)
	app.Get("/admin/tournaments/:id/penalties", authMw, adminMw, h.GetPenalties)
	app.Delete("/admin/penalties/:id", authMw, adminMw, h.checkPenaltyAccessMw, h.RemovePenalty)

	// Public routes
	app.Get("/lobbies/:id", h.GetLobby)
	app.Get("/tournaments/:id/lobbies", h.GetLobbysByTournament)
	app.Get("/tournaments/:id/standings", h.GetStandings)
	app.Get("/tournaments/:id/standings/export", h.ExportStandingsPDF)
	app.Get("/tournaments/:id/point-rules", h.GetPointRules)
	app.Get("/tournaments/:id/qualification", h.GetQualification)
}

type createLobbyRequest struct {
	TournamentID string   `json:"tournament_id"`
	LobbyName    string   `json:"lobby_name"`
	LobbyNumber  int      `json:"lobby_number"`
	DayNumber    int      `json:"day_number"`
	NumMaps      int      `json:"num_maps"`
	MapNames     []string `json:"map_names"`
	RoomID       *string  `json:"room_id"`
	RoomPassword *string  `json:"room_password"`
	ScheduledAt  *string  `json:"scheduled_at"`
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
	if err := requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, tournamentID); err != nil {
		return err
	}

	var scheduledAt *time.Time
	if req.ScheduledAt != nil {
		if t, err := parseTime(*req.ScheduledAt); err == nil {
			scheduledAt = &t
		}
	}

	numMaps := req.NumMaps
	if numMaps <= 0 {
		numMaps = 1
	}

	// Validate MapNames count does not exceed NumMaps
	if len(req.MapNames) > 0 && len(req.MapNames) > numMaps {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"map_names": fmt.Sprintf("Jumlah map_names (%d) tidak boleh melebihi num_maps (%d)", len(req.MapNames), numMaps),
		}))
	}

	lobby, svcErr := h.brService.CreateLobby(c.Context(), tournamentID, req.LobbyName, req.LobbyNumber, req.DayNumber, numMaps, req.MapNames, req.RoomID, req.RoomPassword, scheduledAt)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, lobby)
}

type updateLobbyStatusRequest struct {
	Status string `json:"status"`
}

type updateLobbyRequest struct {
	LobbyName    string   `json:"lobby_name"`
	NumMaps      int      `json:"num_maps"`
	MapNames     []string `json:"map_names"`
	RoomID       *string  `json:"room_id"`
	RoomPassword *string  `json:"room_password"`
	ScheduledAt  *string  `json:"scheduled_at"`
}

func (h *BRHandler) UpdateLobby(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}
	if err := h.checkLobbyAccess(c, lobbyID); err != nil {
		return err
	}

	var req updateLobbyRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if req.LobbyName == "" {
		return response.Err(c, apperror.ValidationError(map[string]string{"lobby_name": "Nama lobby wajib diisi"}))
	}

	numMaps := req.NumMaps
	if numMaps <= 0 {
		numMaps = 1
	}

	var scheduledAt *time.Time
	if req.ScheduledAt != nil {
		if t, err := parseTime(*req.ScheduledAt); err == nil {
			scheduledAt = &t
		}
	}

	lobby, svcErr := h.brService.UpdateLobby(c.Context(), lobbyID, req.LobbyName, numMaps, req.MapNames, req.RoomID, req.RoomPassword, scheduledAt)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, lobby)
}

func (h *BRHandler) DeleteLobby(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}
	if err := h.checkLobbyAccess(c, lobbyID); err != nil {
		return err
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
	if err := h.checkLobbyAccess(c, lobbyID); err != nil {
		return err
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
	MapNumber int                  `json:"map_number"` // 1-based; defaults to 1 if omitted
	Results   []resultInputRequest `json:"results"`
}

func (h *BRHandler) InputResults(c *fiber.Ctx) error {
	lobbyID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Lobby ID tidak valid")
	}
	if err := h.checkLobbyAccess(c, lobbyID); err != nil {
		return err
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
		if r.Placement < 1 || r.Placement > 100 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"results": fmt.Sprintf("Placement pada index %d tidak valid (harus antara 1 dan 100)", i),
			}))
		}
		if r.PenaltyPoints < 0 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"results": fmt.Sprintf("Penalty points pada index %d tidak boleh negatif", i),
			}))
		}
		if r.Kills < 0 || r.Kills > 99 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"results": fmt.Sprintf("Kills pada index %d tidak valid (harus antara 0 dan 99)", i),
			}))
		}
		if r.DamageDealt < 0 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"results": fmt.Sprintf("Damage dealt pada index %d tidak boleh negatif", i),
			}))
		}
		if r.SurvivalBonus < 0 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"results": fmt.Sprintf("Survival bonus pada index %d tidak boleh negatif", i),
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

	mapNumber := req.MapNumber
	if mapNumber <= 0 {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"map_number": "Nomor map tidak valid, harus lebih dari 0",
		}))
	}

	if svcErr := h.brService.InputResults(c.Context(), lobbyID, mapNumber, results); svcErr != nil {
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
	if h.lobbyResultRepo != nil {
		lr, lrErr := h.lobbyResultRepo.FindByID(c.Context(), lobbyResultID)
		if lrErr != nil {
			return response.HandleError(c, lrErr)
		}
		if lr != nil {
			if err := h.checkLobbyAccess(c, lr.LobbyID); err != nil {
				return err
			}
		}
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
		if p.Kills < 0 || p.Kills > 99 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"players": fmt.Sprintf("Kills pada index %d tidak valid (harus antara 0 dan 99)", i),
			}))
		}
		if p.Damage < 0 {
			return response.Err(c, apperror.ValidationError(map[string]string{
				"players": fmt.Sprintf("Damage pada index %d tidak boleh negatif", i),
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
