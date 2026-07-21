package handler

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/porjar-denpasar/porjar-api/internal/service"
)

type RefereeHandler struct {
	refereeService *service.RefereeService
	userRepo       model.UserRepository
	teamMemberRepo model.TeamMemberRepository
	matchCardRepo  model.MatchCardRepository
	tournamentRepo model.TournamentRepository
	eventAdminRepo model.EventAdminRepository
}

func NewRefereeHandler(refereeService *service.RefereeService, userRepo model.UserRepository, teamMemberRepo model.TeamMemberRepository) *RefereeHandler {
	return &RefereeHandler{
		refereeService: refereeService,
		userRepo:       userRepo,
		teamMemberRepo: teamMemberRepo,
	}
}

// SetMatchCardRepo, SetTournamentRepo and SetEventAdminRepo wire the repos
// needed to gate POST /admin/referee-assignments and POST
// /admin/cards/:id/revoke, which are outside the /admin/tournaments/:id/*
// prefix already scoped by TournamentScopeMw.
// NEEDS ROUTES.GO WIRING:
//   refereeHandler.SetMatchCardRepo(matchCardRepo)
//   refereeHandler.SetTournamentRepo(tournamentRepo)
//   refereeHandler.SetEventAdminRepo(eventAdminRepo)
//
// NOTE: DELETE /admin/referee-assignments/:id (UnassignReferee) is NOT
// gated here — model.RefereeAssignmentRepository has no FindByID method,
// only FindByReferee/FindByTournament, so there is no clean way to resolve
// an assignment ID to its tournament from this handler without adding a
// repo method (out of scope for this change). See report.
func (h *RefereeHandler) SetMatchCardRepo(repo model.MatchCardRepository) {
	h.matchCardRepo = repo
}
func (h *RefereeHandler) SetTournamentRepo(repo model.TournamentRepository) {
	h.tournamentRepo = repo
}
func (h *RefereeHandler) SetEventAdminRepo(repo model.EventAdminRepository) {
	h.eventAdminRepo = repo
}

func (h *RefereeHandler) RegisterRoutes(api fiber.Router, authMw, refereeMw, adminMw fiber.Handler) {
	// Referee routes — see all live matches and issue cards without assignment
	api.Get("/referee/matches", authMw, refereeMw, h.GetLiveMatches)
	api.Get("/referee/matches/scheduled", authMw, refereeMw, h.GetScheduledMatches)
	api.Post("/referee/cards", authMw, refereeMw, h.IssueCard)
	api.Put("/referee/matches/:type/:id/live", authMw, refereeMw, h.SetMatchLive)
	api.Get("/referee/cards", authMw, refereeMw, h.GetMyCards)

	// Player route — view cards for their team
	api.Get("/teams/:id/cards", authMw, h.GetTeamCards)

	// Admin routes for referee management
	api.Get("/admin/referees", authMw, adminMw, h.ListReferees)
	api.Post("/admin/referee-assignments", authMw, adminMw, h.AssignReferee)
	api.Delete("/admin/referee-assignments/:id", authMw, adminMw, h.UnassignReferee)
	api.Get("/admin/tournaments/:id/cards", authMw, adminMw, h.GetTournamentCards)
	api.Post("/admin/cards/:id/revoke", authMw, adminMw, h.RevokeCard)

	// Penalty config — per tournament
	api.Get("/admin/tournaments/:id/penalty-config", authMw, adminMw, h.GetPenaltyConfig)
	api.Put("/admin/tournaments/:id/penalty-config", authMw, adminMw, h.UpdatePenaltyConfig)
}

// --- Request DTOs ---

type issueCardRequest struct {
	TournamentID   string  `json:"tournament_id"`
	TeamID         string  `json:"team_id"`
	CardType       string  `json:"card_type"`
	Reason         string  `json:"reason"`
	BracketMatchID *string `json:"bracket_match_id"`
	BRLobbyID      *string `json:"br_lobby_id"`
	GroupMatchID   *string `json:"group_match_id"`
}

type assignRefereeRequest struct {
	RefereeID    string `json:"referee_id"`
	TournamentID string `json:"tournament_id"`
	MatchType    string `json:"match_type"`
	MatchID      string `json:"match_id"`
}

type penaltyConfigItem struct {
	CardType           string  `json:"card_type"`
	PointDeduction     int     `json:"point_deduction"`
	IsDisqualification bool    `json:"is_disqualification"`
	Description        *string `json:"description"`
}

type updatePenaltyConfigRequest struct {
	YellowPointDeduction int  `json:"yellow_point_deduction"`
	RedPointDeduction    int  `json:"red_point_deduction"`
	RedIsDisqualification bool `json:"red_is_disqualification"`
}

// --- Handlers ---

// GetLiveMatches returns all currently live matches across all match types.
// No assignment required — any authenticated referee can see all live matches.
func (h *RefereeHandler) GetLiveMatches(c *fiber.Ctx) error {
	matches, err := h.refereeService.GetLiveMatchesToday(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, matches)
}

// GetScheduledMatches returns all scheduled (not yet live) matches.
func (h *RefereeHandler) GetScheduledMatches(c *fiber.Ctx) error {
	matches, err := h.refereeService.GetScheduledMatches(c.Context())
	if err != nil {
		return response.HandleError(c, err)
	}
	return response.OK(c, matches)
}

func (h *RefereeHandler) IssueCard(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var req issueCardRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate required fields
	errs := map[string]string{}
	tournamentID, err := uuid.Parse(req.TournamentID)
	if err != nil {
		errs["tournament_id"] = "Tournament ID tidak valid"
	}
	teamID, err := uuid.Parse(req.TeamID)
	if err != nil {
		errs["team_id"] = "Team ID tidak valid"
	}
	if req.CardType != "yellow" && req.CardType != "red" {
		errs["card_type"] = "Card type harus yellow atau red"
	}
	if req.Reason == "" {
		errs["reason"] = "Alasan wajib diisi"
	}
	if len(errs) > 0 {
		return response.Err(c, apperror.ValidationError(errs))
	}

	// Parse optional match IDs
	var bracketMatchID, brLobbyID, groupMatchID *uuid.UUID
	matchCount := 0
	if req.BracketMatchID != nil && *req.BracketMatchID != "" {
		id, err := uuid.Parse(*req.BracketMatchID)
		if err != nil {
			return response.BadRequest(c, "Bracket match ID tidak valid")
		}
		bracketMatchID = &id
		matchCount++
	}
	if req.BRLobbyID != nil && *req.BRLobbyID != "" {
		id, err := uuid.Parse(*req.BRLobbyID)
		if err != nil {
			return response.BadRequest(c, "BR lobby ID tidak valid")
		}
		brLobbyID = &id
		matchCount++
	}
	if req.GroupMatchID != nil && *req.GroupMatchID != "" {
		id, err := uuid.Parse(*req.GroupMatchID)
		if err != nil {
			return response.BadRequest(c, "Group match ID tidak valid")
		}
		groupMatchID = &id
		matchCount++
	}
	if matchCount != 1 {
		return response.BadRequest(c, "Harus memilih tepat satu match (bracket, BR, atau group)")
	}

	card, svcErr := h.refereeService.IssueCard(c.Context(), userID, tournamentID, teamID, req.CardType, req.Reason, bracketMatchID, brLobbyID, groupMatchID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, card)
}

func (h *RefereeHandler) SetMatchLive(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	matchType := c.Params("type")
	matchIDStr := c.Params("id")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		return response.BadRequest(c, "Match ID tidak valid")
	}

	if svcErr := h.refereeService.SetMatchLive(c.Context(), userID, matchType, matchID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Status pertandingan berhasil diubah ke live"})
}

func (h *RefereeHandler) GetMyCards(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	cards, err := h.refereeService.GetCardsByReferee(c.Context(), userID)
	if err != nil {
		return response.HandleError(c, err)
	}

	return response.OK(c, cards)
}

func (h *RefereeHandler) GetTeamCards(c *fiber.Ctx) error {
	teamID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Team ID tidak valid")
	}

	userID := middleware.GetUserID(c)
	role := middleware.GetUserRole(c)

	// Admin, superadmin, and referee can view any team's cards
	if role != model.RoleAdmin && role != model.RoleSuperAdmin && role != model.RoleReferee {
		// For player/coach, verify they are a member of the team
		member, _ := h.teamMemberRepo.FindByTeamAndUser(c.Context(), teamID, userID)
		if member == nil {
			return response.Err(c, apperror.BusinessRule("FORBIDDEN", "Anda tidak memiliki akses ke kartu tim ini"))
		}
	}

	cards, svcErr := h.refereeService.GetCardsByTeam(c.Context(), teamID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, cards)
}

func (h *RefereeHandler) ListReferees(c *fiber.Ctx) error {
	refereeRole := model.RoleReferee
	filter := model.UserFilter{
		Role:  &refereeRole,
		Page:  1,
		Limit: 100,
	}

	users, total, err := h.userRepo.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "list referees"))
	}

	return response.OK(c, fiber.Map{
		"referees": users,
		"total":    total,
	})
}

func (h *RefereeHandler) AssignReferee(c *fiber.Ctx) error {
	var req assignRefereeRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	errs := map[string]string{}
	refereeID, err := uuid.Parse(req.RefereeID)
	if err != nil {
		errs["referee_id"] = "Referee ID tidak valid"
	}
	tournamentID, err := uuid.Parse(req.TournamentID)
	if err != nil {
		errs["tournament_id"] = "Tournament ID tidak valid"
	}
	matchID, err := uuid.Parse(req.MatchID)
	if err != nil {
		errs["match_id"] = "Match ID tidak valid"
	}
	validTypes := map[string]bool{"bracket": true, "br": true, "group": true}
	if !validTypes[req.MatchType] {
		errs["match_type"] = "Match type harus bracket, br, atau group"
	}
	if len(errs) > 0 {
		return response.Err(c, apperror.ValidationError(errs))
	}
	if err := requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, tournamentID); err != nil {
		return err
	}

	// Verify the user being assigned has the referee role
	user, userErr := h.userRepo.FindByID(c.Context(), refereeID)
	if userErr != nil || user == nil {
		return response.Err(c, apperror.NotFound("USER"))
	}
	if user.Role != model.RoleReferee {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"referee_id": "User bukan referee",
		}))
	}

	assignment, svcErr := h.refereeService.AssignReferee(c.Context(), refereeID, tournamentID, req.MatchType, matchID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.Created(c, assignment)
}

func (h *RefereeHandler) UnassignReferee(c *fiber.Ctx) error {
	assignmentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Assignment ID tidak valid")
	}

	if svcErr := h.refereeService.UnassignReferee(c.Context(), assignmentID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Assignment wasit berhasil dihapus"})
}

func (h *RefereeHandler) GetTournamentCards(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	cards, svcErr := h.refereeService.GetTournamentCards(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, cards)
}

func (h *RefereeHandler) RevokeCard(c *fiber.Ctx) error {
	adminID := middleware.GetUserID(c)
	cardID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Card ID tidak valid")
	}
	if h.matchCardRepo != nil {
		card, cardErr := h.matchCardRepo.FindByID(c.Context(), cardID)
		if cardErr != nil {
			return response.HandleError(c, cardErr)
		}
		if card != nil {
			if err := requireTournamentAccess(c, h.tournamentRepo, h.eventAdminRepo, card.TournamentID); err != nil {
				return err
			}
		}
	}

	if svcErr := h.refereeService.RevokeCard(c.Context(), adminID, cardID); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Kartu berhasil dicabut"})
}

func (h *RefereeHandler) GetPenaltyConfig(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	configs, svcErr := h.refereeService.GetPenaltyConfig(c.Context(), tournamentID)
	if svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, configs)
}

func (h *RefereeHandler) UpdatePenaltyConfig(c *fiber.Ctx) error {
	tournamentID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "Tournament ID tidak valid")
	}

	var req updatePenaltyConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	configs := []*model.TournamentPenaltyConfig{
		{
			TournamentID:       tournamentID,
			CardType:           "yellow",
			PointDeduction:     req.YellowPointDeduction,
			IsDisqualification: false,
		},
		{
			TournamentID:       tournamentID,
			CardType:           "red",
			PointDeduction:     req.RedPointDeduction,
			IsDisqualification: req.RedIsDisqualification,
		},
	}

	if svcErr := h.refereeService.UpdatePenaltyConfig(c.Context(), tournamentID, configs); svcErr != nil {
		return response.HandleError(c, svcErr)
	}

	return response.OK(c, fiber.Map{"message": "Konfigurasi penalti berhasil diperbarui"})
}
