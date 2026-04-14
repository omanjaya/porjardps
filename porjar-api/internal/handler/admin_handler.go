package handler

import (
	"encoding/json"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/credcrypto"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/redis/go-redis/v9"
)

const credPWKeyPrefix = "cred_pw:"
const credPWTTL = 90 * 24 * time.Hour
const superadminLockKey = "superadmin-count-lock"
const superadminLockTTL = 5 * time.Second

type AdminHandler struct {
	userRepo        model.UserRepository
	teamRepo        model.TeamRepository
	teamMemberRepo  model.TeamMemberRepository
	tournamentRepo  model.TournamentRepository
	scheduleRepo    model.ScheduleRepository
	bracketRepo     model.BracketRepository
	activityLogRepo model.ActivityLogRepository
	gameRepo        model.GameRepository
	schoolRepo      model.SchoolRepository
	rdb             *redis.Client
	encKey          []byte // 32-byte AES-256 key derived from JWT secret
}

func NewAdminHandler(
	userRepo model.UserRepository,
	teamRepo model.TeamRepository,
	teamMemberRepo model.TeamMemberRepository,
	tournamentRepo model.TournamentRepository,
	scheduleRepo model.ScheduleRepository,
	bracketRepo model.BracketRepository,
	activityLogRepo model.ActivityLogRepository,
	gameRepo model.GameRepository,
	schoolRepo model.SchoolRepository,
	rdb *redis.Client,
	jwtSecret string,
) *AdminHandler {
	key := credcrypto.DeriveEncKey(jwtSecret)
	return &AdminHandler{
		userRepo:        userRepo,
		teamRepo:        teamRepo,
		teamMemberRepo:  teamMemberRepo,
		tournamentRepo:  tournamentRepo,
		scheduleRepo:    scheduleRepo,
		bracketRepo:     bracketRepo,
		activityLogRepo: activityLogRepo,
		gameRepo:        gameRepo,
		schoolRepo:      schoolRepo,
		rdb:             rdb,
		encKey:          key,
	}
}

func (h *AdminHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, superadminMw, publicRL fiber.Handler) {
	// Public stats (no auth required, rate limited)
	app.Get("/stats", publicRL, h.PublicStats)
	app.Get("/stats/public", publicRL, h.PublicStats)

	// Admin routes
	app.Get("/admin/dashboard", authMw, adminMw, h.Dashboard)
	app.Get("/admin/activity", authMw, adminMw, h.RecentActivity)

	// Admin routes — player search (used for assign-player feature)
	app.Get("/admin/players", authMw, adminMw, h.SearchPlayers)

	// Superadmin routes
	app.Get("/admin/users", authMw, superadminMw, h.ListUsers)
	app.Post("/admin/users", authMw, superadminMw, h.CreateUser)
	app.Put("/admin/users/:id", authMw, superadminMw, h.UpdateUser)
	app.Put("/admin/users/:id/role", authMw, superadminMw, h.ChangeUserRole)
	app.Delete("/admin/users/:id", authMw, superadminMw, h.DeleteUser)
	app.Post("/admin/users/:id/reset-password", authMw, superadminMw, h.ResetUserPassword)
	app.Get("/admin/users/:id/credential", authMw, superadminMw, h.GetUserCredential)
}

type publicStats struct {
	// Legacy fields (kept for existing callers)
	TotalGames      int `json:"total_games"`
	TotalSchools    int `json:"total_schools"`
	TotalPlayers    int `json:"total_players"`
	CompetitionDays int `json:"competition_days"`

	// New fields for ESI Denpasar landing page
	Schools              int `json:"schools"`
	Games                int `json:"games"`
	TournamentsTotal     int `json:"tournaments_total"`
	TournamentsCompleted int `json:"tournaments_completed"`
	TournamentsOngoing   int `json:"tournaments_ongoing"`
	Athletes             int `json:"athletes"`
	Teams                int `json:"teams"`
	CurrentYear          int `json:"current_year"`
}

const publicStatsCacheKey = "public_stats:v2"
const publicStatsCacheTTL = 60 * time.Second

func (h *AdminHandler) PublicStats(c *fiber.Ctx) error {
	ctx := c.Context()

	// Try cache
	if h.rdb != nil {
		if cached, err := h.rdb.Get(ctx, publicStatsCacheKey).Bytes(); err == nil && len(cached) > 0 {
			c.Set("Content-Type", "application/json")
			return c.Send(cached)
		}
	}

	// Count active games
	games, _ := h.gameRepo.List(ctx)
	totalGames := 0
	for _, g := range games {
		if g.IsActive {
			totalGames++
		}
	}
	allGames := len(games)

	// Count schools
	_, totalSchools, _ := h.schoolRepo.List(ctx, model.SchoolFilter{Page: 1, Limit: 1})

	// Count players
	totalPlayers, _ := h.userRepo.CountByRole(ctx, "player")

	// Count unique competition days from upcoming schedules
	schedules, _ := h.scheduleRepo.FindUpcoming(ctx, 500)
	days := map[string]bool{}
	for _, s := range schedules {
		days[s.ScheduledAt.Format("2006-01-02")] = true
	}
	competitionDays := len(days)

	// Tournaments counts
	_, tournamentsTotal, _ := h.tournamentRepo.List(ctx, model.TournamentFilter{Page: 1, Limit: 1})
	completedStatus := "completed"
	_, tournamentsCompleted, _ := h.tournamentRepo.List(ctx, model.TournamentFilter{Status: &completedStatus, Page: 1, Limit: 1})
	ongoingStatus := "ongoing"
	_, tournamentsOngoing, _ := h.tournamentRepo.List(ctx, model.TournamentFilter{Status: &ongoingStatus, Page: 1, Limit: 1})

	// Teams count
	_, totalTeams, _ := h.teamRepo.List(ctx, model.TeamFilter{Page: 1, Limit: 1})

	stats := publicStats{
		TotalGames:           totalGames,
		TotalSchools:         totalSchools,
		TotalPlayers:         totalPlayers,
		CompetitionDays:      competitionDays,
		Schools:              totalSchools,
		Games:                allGames,
		TournamentsTotal:     tournamentsTotal,
		TournamentsCompleted: tournamentsCompleted,
		TournamentsOngoing:   tournamentsOngoing,
		Athletes:             totalPlayers,
		Teams:                totalTeams,
		CurrentYear:          time.Now().Year(),
	}

	// Cache the response body (envelope) so cache hits return identical shape
	if h.rdb != nil {
		envelope := response.Response{Success: true, Data: stats}
		if body, err := json.Marshal(envelope); err == nil {
			_ = h.rdb.Set(ctx, publicStatsCacheKey, body, publicStatsCacheTTL).Err()
			c.Set("Content-Type", "application/json")
			return c.Send(body)
		}
	}

	return response.OK(c, stats)
}

type dashboardStats struct {
	TotalTeams         int `json:"total_teams"`
	PendingTeams       int `json:"pending_teams"`
	ActiveTournaments  int `json:"active_tournaments"`
	LiveMatches        int `json:"live_matches"`
	UpcomingSchedules  int `json:"upcoming_schedules"`
	TotalParticipants  int `json:"total_participants"`
	TotalSchools       int `json:"total_schools"`
}

func (h *AdminHandler) Dashboard(c *fiber.Ctx) error {
	ctx := c.Context()

	// Total teams
	_, totalTeams, err := h.teamRepo.List(ctx, model.TeamFilter{Page: 1, Limit: 1})
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "count teams"))
	}

	// Pending teams
	pendingStatus := "pending"
	_, pendingTeams, err := h.teamRepo.List(ctx, model.TeamFilter{Status: &pendingStatus, Page: 1, Limit: 1})
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "count pending teams"))
	}

	// Count tournaments (all non-completed)
	activeTournaments, _ := h.tournamentRepo.CountActive(ctx)

	// Upcoming schedules
	upcomingSchedules, _ := h.scheduleRepo.FindUpcoming(ctx, 100)
	upcomingCount := len(upcomingSchedules)

	// Total players
	totalPlayers, _ := h.userRepo.CountByRole(ctx, "player")

	// Total schools
	_, totalSchools, _ := h.schoolRepo.List(ctx, model.SchoolFilter{Page: 1, Limit: 1})

	// Live bracket matches
	liveMatches := 0
	liveStatus := "live"
	liveFilter := model.ScheduleFilter{Status: &liveStatus, Page: 1, Limit: 1}
	_, liveMatches, _ = h.scheduleRepo.List(ctx, liveFilter)

	stats := dashboardStats{
		TotalTeams:        totalTeams,
		PendingTeams:      pendingTeams,
		ActiveTournaments: activeTournaments,
		LiveMatches:       liveMatches,
		UpcomingSchedules: upcomingCount,
		TotalParticipants: totalPlayers,
		TotalSchools:      totalSchools,
	}

	return response.OK(c, stats)
}

func (h *AdminHandler) RecentActivity(c *fiber.Ctx) error {
	logs, err := h.activityLogRepo.FindRecent(c.Context(), 20)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "get recent activity"))
	}

	return response.OK(c, logs)
}
