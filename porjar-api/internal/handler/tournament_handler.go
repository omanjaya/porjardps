// Validation pattern:
// - Body parsing errors: response.BadRequest(c, msg)
// - Field validation: response.Err(c, apperror.ValidationError(details))
// - Business rule violations: response.Err(c, apperror.BusinessRule(code, msg))
package handler

import (
	"math"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/validator"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type TournamentHandler struct {
	tournamentService *service.TournamentService
}

func NewTournamentHandler(tournamentService *service.TournamentService) *TournamentHandler {
	return &TournamentHandler{tournamentService: tournamentService}
}

func (h *TournamentHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, superadminMw fiber.Handler, createRL ...fiber.Handler) {
	// Public routes
	app.Get("/tournaments", h.List)
	app.Get("/tournaments/:id", h.GetByID)
	app.Get("/tournaments/:id/teams", h.GetTeams)

	// Authenticated player routes
	app.Post("/tournaments/:id/register", authMw, h.RegisterTeam)

	// Admin routes
	createMws := []fiber.Handler{authMw, adminMw}
	if len(createRL) > 0 {
		createMws = append(createMws, createRL[0])
	}
	createMws = append(createMws, h.Create)
	app.Post("/admin/tournaments", createMws...)
	app.Put("/admin/tournaments/:id", authMw, adminMw, h.Update)
	app.Post("/admin/tournaments/:id/teams", authMw, adminMw, h.AdminAddTeams)
	app.Delete("/admin/tournaments/:id/teams/:teamId", authMw, adminMw, h.AdminRemoveTeam)
	app.Post("/admin/tournaments/:id/champion", authMw, adminMw, h.SetChampion)

	// Superadmin routes
	app.Delete("/admin/tournaments/:id", authMw, superadminMw, h.Delete)
}

type createTournamentRequest struct {
	EventID           string  `json:"event_id"`
	GameID            string  `json:"game_id"`
	Name              string  `json:"name"`
	Format            string  `json:"format"`
	Stage             string  `json:"stage"`
	BestOf            int     `json:"best_of"`
	MaxTeams          *int    `json:"max_teams"`
	SchoolLevel       *string `json:"school_level"`
	DailyStartTime    *string `json:"daily_start_time"`
	RegistrationStart *string `json:"registration_start"`
	RegistrationEnd   *string `json:"registration_end"`
	StartDate         *string `json:"start_date"`
	EndDate           *string `json:"end_date"`
	Rules             *string `json:"rules"`
	PrizePool         *string `json:"prize_pool"`
	PrizeDescription  *string `json:"prize_description"`
}

func (h *TournamentHandler) Create(c *fiber.Ctx) error {
	var req createTournamentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	gameID, err := uuid.Parse(req.GameID)
	if err != nil {
		details["game_id"] = "Game ID tidak valid"
	}
	if !validator.ValidateStringLength(req.Name, 3, 100) {
		details["name"] = "Nama turnamen harus 3-100 karakter"
	}
	if req.Format == "" {
		details["format"] = "Format wajib diisi"
	}
	if req.BestOf <= 0 {
		details["best_of"] = "Best of harus lebih dari 0"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	var eventID uuid.UUID
	if req.EventID != "" {
		eventID, err = uuid.Parse(req.EventID)
		if err != nil {
			details["event_id"] = "Event ID tidak valid"
			return response.Err(c, apperror.ValidationError(details))
		}
	}

	input := service.CreateTournamentInput{
		EventID:          eventID,
		GameID:           gameID,
		Name:             validator.TrimString(req.Name),
		Format:           req.Format,
		Stage:            req.Stage,
		BestOf:           req.BestOf,
		MaxTeams:         req.MaxTeams,
		SchoolLevel:      req.SchoolLevel,
		DailyStartTime:   req.DailyStartTime,
		Rules:            req.Rules,
		PrizePool:        req.PrizePool,
		PrizeDescription: req.PrizeDescription,
	}

	if req.RegistrationStart != nil {
		t, err := parseTime(*req.RegistrationStart)
		if err != nil {
			return response.BadRequest(c, "Format tanggal registration_start tidak valid")
		}
		input.RegistrationStart = &t
	}
	if req.RegistrationEnd != nil {
		t, err := parseTime(*req.RegistrationEnd)
		if err != nil {
			return response.BadRequest(c, "Format tanggal registration_end tidak valid")
		}
		input.RegistrationEnd = &t
	}
	if req.StartDate != nil {
		t, err := parseTime(*req.StartDate)
		if err != nil {
			return response.BadRequest(c, "Format tanggal start_date tidak valid")
		}
		input.StartDate = &t
	}
	if req.EndDate != nil {
		t, err := parseTime(*req.EndDate)
		if err != nil {
			return response.BadRequest(c, "Format tanggal end_date tidak valid")
		}
		input.EndDate = &t
	}

	tournament, svcErr := h.tournamentService.Create(c.Context(), input)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, tournament)
}

func (h *TournamentHandler) GetByID(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	tournament, svcErr := h.tournamentService.GetByID(c.Context(), id)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, tournament)
}

type updateTournamentRequest struct {
	EventID           *string  `json:"event_id"`
	Name              *string  `json:"name"`
	Format            *string  `json:"format"`
	Stage             *string  `json:"stage"`
	BestOf            *int     `json:"best_of"`
	MaxTeams          *int     `json:"max_teams"`
	Status            *string  `json:"status"`
	SchoolLevel       *string  `json:"school_level"`
	DailyStartTime    *string  `json:"daily_start_time"`
	DefaultNumMaps    *int     `json:"default_num_maps"`
	DefaultMapNames   []string `json:"default_map_names"`
	TiebreakerOrder   []string `json:"tiebreaker_order"`
	RegistrationStart *string  `json:"registration_start"`
	RegistrationEnd   *string  `json:"registration_end"`
	StartDate         *string  `json:"start_date"`
	EndDate           *string  `json:"end_date"`
	Rules             *string  `json:"rules"`
	PrizePool         *string  `json:"prize_pool"`
	PrizeDescription  *string  `json:"prize_description"`
}

func (h *TournamentHandler) Update(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req updateTournamentRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	details := make(map[string]string)
	if req.Name != nil && !validator.ValidateStringLength(*req.Name, 2, 100) {
		details["name"] = "Nama turnamen harus 2-100 karakter"
	}
	if req.MaxTeams != nil && *req.MaxTeams < 2 {
		details["max_teams"] = "Maksimal tim harus minimal 2"
	}
	if len(details) > 0 {
		return response.Err(c, apperror.ValidationError(details))
	}

	var eventIDPtr *uuid.UUID
	if req.EventID != nil {
		eid, err := uuid.Parse(*req.EventID)
		if err != nil {
			return response.BadRequest(c, "Event ID tidak valid")
		}
		eventIDPtr = &eid
	}

	input := service.UpdateTournamentInput{
		EventID:          eventIDPtr,
		Name:             req.Name,
		Format:           req.Format,
		Stage:            req.Stage,
		BestOf:           req.BestOf,
		MaxTeams:         req.MaxTeams,
		Status:           req.Status,
		SchoolLevel:      req.SchoolLevel,
		DailyStartTime:   req.DailyStartTime,
		DefaultNumMaps:   req.DefaultNumMaps,
		DefaultMapNames:  req.DefaultMapNames,
		TiebreakerOrder:  req.TiebreakerOrder,
		Rules:            req.Rules,
		PrizePool:        req.PrizePool,
		PrizeDescription: req.PrizeDescription,
	}

	if req.RegistrationStart != nil {
		if t, err := parseTime(*req.RegistrationStart); err == nil {
			input.RegistrationStart = &t
		}
	}
	if req.RegistrationEnd != nil {
		if t, err := parseTime(*req.RegistrationEnd); err == nil {
			input.RegistrationEnd = &t
		}
	}
	if req.StartDate != nil {
		if t, err := parseTime(*req.StartDate); err == nil {
			input.StartDate = &t
		}
	}
	if req.EndDate != nil {
		if t, err := parseTime(*req.EndDate); err == nil {
			input.EndDate = &t
		}
	}

	tournament, svcErr := h.tournamentService.Update(c.Context(), id, input)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, tournament)
}

func (h *TournamentHandler) Delete(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	if svcErr := h.tournamentService.Delete(c.Context(), id); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.NoContent(c)
}

func (h *TournamentHandler) List(c *fiber.Ctx) error {
	filter := model.TournamentFilter{
		Page:  1,
		Limit: 20,
	}

	if p := c.Query("page"); p != "" {
		if v, err := strconv.Atoi(p); err == nil && v > 0 && v <= 10000 {
			filter.Page = v
		}
	}
	if pp := c.Query("per_page"); pp != "" {
		if v, err := strconv.Atoi(pp); err == nil && v > 0 && v <= 100 {
			filter.Limit = v
		}
	}
	if gid := c.Query("game_id"); gid != "" {
		if id, err := uuid.Parse(gid); err == nil {
			filter.GameID = &id
		}
	}
	if st := c.Query("status"); st != "" {
		filter.Status = &st
	}

	tournaments, total, err := h.tournamentService.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.Limit)))
	return response.Paginated(c, tournaments, response.Meta{
		Page:       filter.Page,
		PerPage:    filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

type registerTeamRequest struct {
	TeamID string `json:"team_id"`
}

func (h *TournamentHandler) RegisterTeam(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req registerTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	teamID, err := uuid.Parse(req.TeamID)
	if err != nil {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"team_id": "Team ID tidak valid",
		}))
	}

	userID := middleware.GetUserID(c)

	if svcErr := h.tournamentService.RegisterTeam(c.Context(), tournamentID, teamID, userID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, fiber.Map{"message": "Tim berhasil didaftarkan ke turnamen"})
}

func (h *TournamentHandler) GetTeams(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	teams, svcErr := h.tournamentService.GetTeams(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, teams)
}

type adminAddTeamsRequest struct {
	TeamIDs []string `json:"team_ids"`
}

type adminAddTeamsResult struct {
	Added   int      `json:"added"`
	Skipped int      `json:"skipped"`
	Errors  []string `json:"errors"`
}

func (h *TournamentHandler) AdminAddTeams(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req adminAddTeamsRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	if len(req.TeamIDs) == 0 {
		return response.BadRequest(c, "team_ids wajib diisi")
	}

	result := adminAddTeamsResult{}

	for _, tidStr := range req.TeamIDs {
		teamID, err := uuid.Parse(tidStr)
		if err != nil {
			result.Errors = append(result.Errors, tidStr+": ID tidak valid")
			continue
		}

		if svcErr := h.tournamentService.AdminRegisterTeam(c.Context(), tournamentID, teamID); svcErr != nil {
			// 409 Conflict = team already registered in this tournament → silently skip.
			// Other errors (not found, game mismatch, etc.) = actual failures → count as error.
			if appErr, ok := svcErr.(*apperror.AppError); ok && appErr.HTTPStatus == 409 {
				result.Skipped++
			} else {
				result.Errors = append(result.Errors, tidStr+": "+svcErr.Error())
			}
		} else {
			result.Added++
		}
	}

	return response.OK(c, result)
}

func (h *TournamentHandler) AdminRemoveTeam(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	teamID, err := uuid.Parse(c.Params("teamId"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	if svcErr := h.tournamentService.AdminRemoveTeam(c.Context(), tournamentID, teamID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.NoContent(c)
}

type setChampionRequest struct {
	TeamID string `json:"team_id"`
}

func (h *TournamentHandler) SetChampion(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req setChampionRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Payload tidak valid")
	}
	teamID, err := uuid.Parse(req.TeamID)
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	if svcErr := h.tournamentService.SetChampion(c.Context(), tournamentID, teamID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"success": true})
}

// parseTime parses time string in RFC3339 or date-only format.
func parseTime(s string) (time.Time, error) {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		t, err = time.Parse("2006-01-02", s)
	}
	return t, err
}
