package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"github.com/redis/go-redis/v9"
)

type AnalyticsHandler struct {
	userRepo       model.UserRepository
	teamRepo       model.TeamRepository
	tournamentRepo model.TournamentRepository
	scheduleRepo   model.ScheduleRepository
	bracketRepo    model.BracketRepository
	gameRepo       model.GameRepository
	schoolRepo     model.SchoolRepository
	redis          *redis.Client
}

const analyticsCacheTTL = 5 * time.Minute
const analyticsCacheKey = "analytics:dashboard"

func NewAnalyticsHandler(
	userRepo model.UserRepository,
	teamRepo model.TeamRepository,
	tournamentRepo model.TournamentRepository,
	scheduleRepo model.ScheduleRepository,
	bracketRepo model.BracketRepository,
	gameRepo model.GameRepository,
	schoolRepo model.SchoolRepository,
	rdb *redis.Client,
) *AnalyticsHandler {
	return &AnalyticsHandler{
		userRepo:       userRepo,
		teamRepo:       teamRepo,
		tournamentRepo: tournamentRepo,
		scheduleRepo:   scheduleRepo,
		bracketRepo:    bracketRepo,
		gameRepo:       gameRepo,
		schoolRepo:     schoolRepo,
		redis:          rdb,
	}
}

func (h *AnalyticsHandler) RegisterRoutes(app fiber.Router, authMw, adminMw fiber.Handler) {
	app.Get("/admin/analytics", authMw, adminMw, h.GetAnalytics)
}

// Response types

type registrationByDate struct {
	Date    string `json:"date"`
	Teams   int    `json:"teams"`
	Players int    `json:"players"`
}

type teamsByGame struct {
	Game  string `json:"game"`
	Count int    `json:"count"`
}

type topSchool struct {
	School string `json:"school"`
	Level  string `json:"level"`
	Teams  int    `json:"teams"`
}

type tournamentProgress struct {
	Name      string `json:"name"`
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
}

type matchHeatmapCell struct {
	Day   int `json:"day"`
	Hour  int `json:"hour"`
	Count int `json:"count"`
}

type analyticsResponse struct {
	TotalPlayers        int                  `json:"total_players"`
	TotalTeams          int                  `json:"total_teams"`
	TotalMatches        int                  `json:"total_matches"`
	ActiveTournaments   int                  `json:"active_tournaments"`
	RegistrationsByDate []registrationByDate `json:"registrations_by_date"`
	TeamsByGame         []teamsByGame        `json:"teams_by_game"`
	TopSchools          []topSchool          `json:"top_schools"`
	TournamentProgress  []tournamentProgress `json:"tournament_progress"`
	MatchHeatmap        []matchHeatmapCell   `json:"match_heatmap"`
}

func (h *AnalyticsHandler) GetAnalytics(c *fiber.Ctx) error {
	ctx := c.Context()

	// Determine date range
	rangeParam := c.Query("range", "30d")
	var daysBack int
	switch rangeParam {
	case "7d":
		daysBack = 7
	case "all":
		daysBack = 365
	default:
		daysBack = 30
	}

	// Try Redis cache first
	cacheKey := fmt.Sprintf("%s:%s", analyticsCacheKey, rangeParam)
	if h.redis != nil {
		if cached, err := h.redis.Get(ctx, cacheKey).Bytes(); err == nil {
			var resp analyticsResponse
			if json.Unmarshal(cached, &resp) == nil {
				return response.OK(c, resp)
			}
		}
	}

	startDate := time.Now().AddDate(0, 0, -daysBack)

	// 1. Total players (users with role "player")
	playerRole := "player"
	_, totalPlayers, err := h.userRepo.List(ctx, model.UserFilter{Role: &playerRole, Page: 1, Limit: 1})
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "count players"))
	}

	// 2. Total teams — fetch all at once to reuse for buildTopSchools
	allTeams, totalTeams, err := h.teamRepo.List(ctx, model.TeamFilter{Page: 1, Limit: 10000})
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "count teams"))
	}

	// 3. Active tournaments
	activeStatus := "active"
	_, activeCount, err := h.tournamentRepo.List(ctx, model.TournamentFilter{Status: &activeStatus, Page: 1, Limit: 100})
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "list active tournaments"))
	}

	// Also get all tournaments for progress calculation
	allTournaments, _, err := h.tournamentRepo.List(ctx, model.TournamentFilter{Page: 1, Limit: 100})
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "list all tournaments"))
	}

	// 4. Tournament progress — fetches all matches once, also returns totalMatches
	progressData, totalMatches := h.buildTournamentProgressAndCount(ctx, allTournaments)

	// 5. Registrations by date — aggregate team created_at dates
	regByDate := h.buildRegistrationsByDate(ctx, startDate, daysBack)

	// 6. Teams by game
	teamsByGameData := h.buildTeamsByGame(ctx)

	// 7. Top schools — uses pre-fetched teams
	topSchoolsData := h.buildTopSchools(ctx, allTeams)

	// 9. Match heatmap from schedules
	heatmapData := h.buildMatchHeatmap(ctx)

	resp := analyticsResponse{
		TotalPlayers:        totalPlayers,
		TotalTeams:          totalTeams,
		TotalMatches:        totalMatches,
		ActiveTournaments:   activeCount,
		RegistrationsByDate: regByDate,
		TeamsByGame:         teamsByGameData,
		TopSchools:          topSchoolsData,
		TournamentProgress:  progressData,
		MatchHeatmap:        heatmapData,
	}

	// Cache in Redis for 5 minutes
	if h.redis != nil {
		if data, err := json.Marshal(resp); err == nil {
			h.redis.Set(ctx, cacheKey, data, analyticsCacheTTL)
		}
	}

	return response.OK(c, resp)
}

func (h *AnalyticsHandler) buildRegistrationsByDate(ctx context.Context, startDate time.Time, daysBack int) []registrationByDate {
	// Fetch all teams with generous limit
	teams, _, _ := h.teamRepo.List(ctx, model.TeamFilter{Page: 1, Limit: 10000})

	// Fetch all players
	playerRole := "player"
	users, _, _ := h.userRepo.List(ctx, model.UserFilter{Role: &playerRole, Page: 1, Limit: 10000})

	// Build date buckets
	result := make([]registrationByDate, 0, daysBack)
	teamsByDate := make(map[string]int)
	playersByDate := make(map[string]int)

	for _, t := range teams {
		dateKey := t.CreatedAt.Format("2006-01-02")
		teamsByDate[dateKey]++
	}
	for _, u := range users {
		dateKey := u.CreatedAt.Format("2006-01-02")
		playersByDate[dateKey]++
	}

	for i := 0; i < daysBack; i++ {
		date := startDate.AddDate(0, 0, i)
		dateKey := date.Format("2006-01-02")
		result = append(result, registrationByDate{
			Date:    dateKey,
			Teams:   teamsByDate[dateKey],
			Players: playersByDate[dateKey],
		})
	}

	return result
}

func (h *AnalyticsHandler) buildTeamsByGame(ctx context.Context) []teamsByGame {
	games, err := h.gameRepo.List(ctx)
	if err != nil {
		return nil
	}

	var result []teamsByGame
	for _, g := range games {
		count, err := h.teamRepo.CountByGame(ctx, g.ID)
		if err != nil {
			continue
		}
		if count > 0 {
			result = append(result, teamsByGame{
				Game:  g.Slug,
				Count: count,
			})
		}
	}

	return result
}

func (h *AnalyticsHandler) buildTopSchools(ctx context.Context, allTeams []*model.Team) []topSchool {
	// Group teams by school_id in memory
	teamsBySchool := make(map[uuid.UUID]int)
	for _, t := range allTeams {
		if t.SchoolID != nil {
			teamsBySchool[*t.SchoolID]++
		}
	}

	if len(teamsBySchool) == 0 {
		return nil
	}

	// Get all schools
	schools, _, err := h.schoolRepo.List(ctx, model.SchoolFilter{Page: 1, Limit: 1000})
	if err != nil {
		return nil
	}

	// Build school index
	type schoolCount struct {
		name  string
		level string
		count int
	}

	var counts []schoolCount
	for _, s := range schools {
		if c, ok := teamsBySchool[s.ID]; ok && c > 0 {
			counts = append(counts, schoolCount{
				name:  s.Name,
				level: s.Level,
				count: c,
			})
		}
	}

	// Sort descending by count
	sort.Slice(counts, func(i, j int) bool {
		return counts[i].count > counts[j].count
	})

	// Take top 10
	limit := 10
	if len(counts) < limit {
		limit = len(counts)
	}

	result := make([]topSchool, 0, limit)
	for i := 0; i < limit; i++ {
		result = append(result, topSchool{
			School: counts[i].name,
			Level:  counts[i].level,
			Teams:  counts[i].count,
		})
	}

	return result
}

// buildTournamentProgressAndCount fetches matches once per tournament and returns
// both the progress data and the total match count, avoiding the duplicate N+1 loop.
func (h *AnalyticsHandler) buildTournamentProgressAndCount(ctx context.Context, tournaments []*model.Tournament) ([]tournamentProgress, int) {
	var result []tournamentProgress
	totalMatches := 0

	for _, t := range tournaments {
		matches, err := h.bracketRepo.ListByTournament(ctx, t.ID)
		if err != nil {
			continue
		}

		total := len(matches)
		totalMatches += total
		completed := 0
		for _, m := range matches {
			if m.Status == "completed" {
				completed++
			}
		}

		if total > 0 {
			name := t.Name
			if len(name) > 30 {
				name = name[:27] + "..."
			}
			result = append(result, tournamentProgress{
				Name:      name,
				Completed: completed,
				Total:     total,
			})
		}
	}

	return result, totalMatches
}

func (h *AnalyticsHandler) buildMatchHeatmap(ctx context.Context) []matchHeatmapCell {
	// Build heatmap from schedules
	schedules, _, err := h.scheduleRepo.List(ctx, model.ScheduleFilter{Page: 1, Limit: 10000})
	if err != nil {
		return nil
	}

	// day (0=Mon..6=Sun) x hour (0..23)
	grid := make(map[string]int)
	for _, s := range schedules {
		weekday := s.ScheduledAt.Weekday()
		// Convert Go weekday (0=Sun) to our format (0=Mon..6=Sun)
		day := int(weekday) - 1
		if day < 0 {
			day = 6
		}
		hour := s.ScheduledAt.Hour()
		key := fmt.Sprintf("%d-%d", day, hour)
		grid[key]++
	}

	var result []matchHeatmapCell
	for day := 0; day < 7; day++ {
		for hour := 0; hour < 24; hour++ {
			key := fmt.Sprintf("%d-%d", day, hour)
			count := grid[key]
			if count > 0 {
				result = append(result, matchHeatmapCell{
					Day:   day,
					Hour:  hour,
					Count: count,
				})
			}
		}
	}

	return result
}
