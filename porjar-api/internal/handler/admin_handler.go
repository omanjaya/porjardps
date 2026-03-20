package handler

import (
	"math"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/model"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/apperror"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/response"
	"golang.org/x/crypto/bcrypt"
)

type AdminHandler struct {
	userRepo        model.UserRepository
	teamRepo        model.TeamRepository
	tournamentRepo  model.TournamentRepository
	scheduleRepo    model.ScheduleRepository
	bracketRepo     model.BracketRepository
	activityLogRepo model.ActivityLogRepository
	gameRepo        model.GameRepository
	schoolRepo      model.SchoolRepository
}

func NewAdminHandler(
	userRepo model.UserRepository,
	teamRepo model.TeamRepository,
	tournamentRepo model.TournamentRepository,
	scheduleRepo model.ScheduleRepository,
	bracketRepo model.BracketRepository,
	activityLogRepo model.ActivityLogRepository,
	gameRepo model.GameRepository,
	schoolRepo model.SchoolRepository,
) *AdminHandler {
	return &AdminHandler{
		userRepo:        userRepo,
		teamRepo:        teamRepo,
		tournamentRepo:  tournamentRepo,
		scheduleRepo:    scheduleRepo,
		bracketRepo:     bracketRepo,
		activityLogRepo: activityLogRepo,
		gameRepo:        gameRepo,
		schoolRepo:      schoolRepo,
	}
}

func (h *AdminHandler) RegisterRoutes(app fiber.Router, authMw, adminMw, superadminMw, publicRL fiber.Handler) {
	// Public stats (no auth required, rate limited)
	app.Get("/stats", publicRL, h.PublicStats)

	// Admin routes
	app.Get("/admin/dashboard", authMw, adminMw, h.Dashboard)
	app.Get("/admin/activity", authMw, adminMw, h.RecentActivity)

	// Superadmin routes
	app.Get("/admin/users", authMw, superadminMw, h.ListUsers)
	app.Post("/admin/users", authMw, superadminMw, h.CreateUser)
	app.Put("/admin/users/:id", authMw, superadminMw, h.UpdateUser)
	app.Put("/admin/users/:id/role", authMw, superadminMw, h.ChangeUserRole)
	app.Delete("/admin/users/:id", authMw, superadminMw, h.DeleteUser)
	app.Post("/admin/users/:id/reset-password", authMw, superadminMw, h.ResetUserPassword)
}

type publicStats struct {
	TotalGames      int `json:"total_games"`
	TotalSchools    int `json:"total_schools"`
	TotalPlayers    int `json:"total_players"`
	CompetitionDays int `json:"competition_days"`
}

func (h *AdminHandler) PublicStats(c *fiber.Ctx) error {
	ctx := c.Context()

	// Count active games
	games, _ := h.gameRepo.List(ctx)
	totalGames := 0
	for _, g := range games {
		if g.IsActive {
			totalGames++
		}
	}

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

	return response.OK(c, publicStats{
		TotalGames:      totalGames,
		TotalSchools:    totalSchools,
		TotalPlayers:    totalPlayers,
		CompetitionDays: competitionDays,
	})
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
	allTours, _, _ := h.tournamentRepo.List(ctx, model.TournamentFilter{Page: 1, Limit: 100})
	activeTournaments := 0
	for _, t := range allTours {
		if t.Status != "completed" && t.Status != "cancelled" {
			activeTournaments++
		}
	}

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

func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	filter := model.UserFilter{
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
	if role := c.Query("role"); role != "" {
		filter.Role = &role
	}
	if search := c.Query("search"); len(search) >= 2 {
		filter.Search = &search
	}

	users, total, err := h.userRepo.List(c.Context(), filter)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "list users"))
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.Limit)))
	return response.Paginated(c, users, response.Meta{
		Page:       filter.Page,
		PerPage:    filter.Limit,
		Total:      total,
		TotalPages: totalPages,
	})
}

type changeRoleRequest struct {
	Role string `json:"role"`
}

func (h *AdminHandler) ChangeUserRole(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req changeRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate role value
	validRoles := map[string]bool{"player": true, "admin": true, "superadmin": true}
	if !validRoles[req.Role] {
		return response.Err(c, apperror.ValidationError(map[string]string{
			"role": "Role harus salah satu dari: player, admin, superadmin",
		}))
	}

	// Can't change own role
	currentUserID := middleware.GetUserID(c)
	if currentUserID == targetID {
		return response.Err(c, apperror.BusinessRule("CANNOT_CHANGE_OWN_ROLE", "Tidak dapat mengubah role sendiri"))
	}

	// Check target user exists
	targetUser, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || targetUser == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	// Can't demote last superadmin
	if targetUser.Role == "superadmin" && req.Role != "superadmin" {
		count, err := h.userRepo.CountByRole(c.Context(), "superadmin")
		if err != nil {
			return response.HandleError(c, apperror.Wrap(err, "count superadmins"))
		}
		if count <= 1 {
			return response.Err(c, apperror.BusinessRule("LAST_SUPERADMIN", "Tidak dapat menghapus superadmin terakhir"))
		}
	}

	if err := h.userRepo.UpdateRole(c.Context(), targetID, req.Role); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "update user role"))
	}

	targetUser.Role = req.Role
	return response.OK(c, targetUser)
}

type createUserRequest struct {
	FullName string  `json:"full_name"`
	Email    string  `json:"email"`
	Password string  `json:"password"`
	Role     string  `json:"role"`
	Phone    *string `json:"phone"`
	Tingkat  *string `json:"tingkat"`
	NISN     *string `json:"nisn"`
}

func (h *AdminHandler) CreateUser(c *fiber.Ctx) error {
	var req createUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	// Validate required fields
	errs := map[string]string{}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" {
		errs["email"] = "Email wajib diisi"
	}
	if len(req.Password) < 8 {
		errs["password"] = "Password minimal 8 karakter"
	}
	validRoles := map[string]bool{"player": true, "admin": true, "coach": true}
	if !validRoles[req.Role] {
		errs["role"] = "Role harus salah satu dari: player, admin, coach"
	}
	if req.FullName == "" {
		errs["full_name"] = "Nama lengkap wajib diisi"
	}
	if len(errs) > 0 {
		return response.Err(c, apperror.ValidationError(errs))
	}

	// Check email uniqueness
	existing, _ := h.userRepo.FindByEmail(c.Context(), req.Email)
	if existing != nil {
		return response.Err(c, apperror.Conflict("EMAIL_ALREADY_EXISTS", "Email sudah terdaftar"))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "hash password"))
	}

	now := time.Now()
	user := &model.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: string(hash),
		FullName:     req.FullName,
		Role:         req.Role,
		Phone:        req.Phone,
		Tingkat:      req.Tingkat,
		NISN:         req.NISN,
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if err := h.userRepo.Create(c.Context(), user); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "create user"))
	}

	return response.Created(c, user)
}

type updateUserRequest struct {
	FullName *string `json:"full_name"`
	Email    *string `json:"email"`
	Phone    *string `json:"phone"`
	Tingkat  *string `json:"tingkat"`
	NISN     *string `json:"nisn"`
}

func (h *AdminHandler) UpdateUser(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	var req updateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Format request tidak valid")
	}

	user, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || user == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	// Update fields that are provided
	if req.FullName != nil && *req.FullName != "" {
		user.FullName = *req.FullName
	}
	if req.Email != nil && *req.Email != "" {
		newEmail := strings.TrimSpace(*req.Email)
		if newEmail != user.Email {
			existing, _ := h.userRepo.FindByEmail(c.Context(), newEmail)
			if existing != nil {
				return response.Err(c, apperror.Conflict("EMAIL_ALREADY_EXISTS", "Email sudah terdaftar"))
			}
			user.Email = newEmail
		}
	}
	if req.Phone != nil {
		user.Phone = req.Phone
	}
	if req.Tingkat != nil {
		user.Tingkat = req.Tingkat
	}
	if req.NISN != nil {
		user.NISN = req.NISN
	}

	user.UpdatedAt = time.Now()

	if err := h.userRepo.Update(c.Context(), user); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "update user"))
	}

	return response.OK(c, user)
}

func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	// Can't delete yourself
	currentUserID := middleware.GetUserID(c)
	if currentUserID == targetID {
		return response.Err(c, apperror.BusinessRule("CANNOT_DELETE_SELF", "Tidak dapat menghapus akun sendiri"))
	}

	// Check target user exists
	targetUser, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || targetUser == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	// Don't allow deleting superadmin accounts
	if targetUser.Role == "superadmin" {
		return response.Err(c, apperror.BusinessRule("CANNOT_DELETE_SUPERADMIN", "Tidak dapat menghapus akun superadmin"))
	}

	if err := h.userRepo.Delete(c.Context(), targetID); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "delete user"))
	}

	return response.OK(c, fiber.Map{"message": "User berhasil dihapus"})
}

func (h *AdminHandler) ResetUserPassword(c *fiber.Ctx) error {
	targetID, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return response.BadRequest(c, "ID tidak valid")
	}

	// Check target user exists
	user, err := h.userRepo.FindByID(c.Context(), targetID)
	if err != nil || user == nil {
		return response.HandleError(c, apperror.NotFound("USER"))
	}

	// Generate random 8-char password (reuses generateRandomPassword from import_handler.go)
	plainPassword, err := generateRandomPassword()
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "generate password"))
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return response.HandleError(c, apperror.Wrap(err, "hash password"))
	}

	user.PasswordHash = string(hash)
	user.NeedsPasswordChange = true
	user.UpdatedAt = time.Now()

	if err := h.userRepo.Update(c.Context(), user); err != nil {
		return response.HandleError(c, apperror.Wrap(err, "update user password"))
	}

	return response.OK(c, fiber.Map{
		"message":  "Password berhasil direset",
		"password": plainPassword,
	})
}
