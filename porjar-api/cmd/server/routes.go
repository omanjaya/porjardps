package main

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/porjar-denpasar/porjar-api/internal/config"
	"github.com/porjar-denpasar/porjar-api/internal/handler"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/audit"
	"github.com/porjar-denpasar/porjar-api/internal/pkg/cache"
	"github.com/porjar-denpasar/porjar-api/internal/queue"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
	"github.com/porjar-denpasar/porjar-api/internal/service"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

func setupRoutes(api fiber.Router, db *pgxpool.Pool, rdb *redis.Client, hub *ws.Hub, cfg *config.Config, submissionQueue *queue.SubmissionQueue, serverCtx context.Context) {
	// CSRF protection — validates X-CSRF-Token header for mutation requests
	// (POST, PUT, PATCH, DELETE). Skips GET/HEAD/OPTIONS and Bearer-token requests.
	api.Use(middleware.CSRFMiddleware())

	// ──────────────────────────────────────────────
	// Repositories
	// ──────────────────────────────────────────────

	// Redis cache
	appCache := cache.New(rdb)

	// Phase 1 repositories (existing)
	userRepo := repository.NewUserRepo(db)
	schoolRepo := repository.NewSchoolRepo(db)
	gameRepo := repository.NewCachedGameRepo(repository.NewGameRepo(db), appCache)
	teamRepo := repository.NewTeamRepo(db)
	teamMemberRepo := repository.NewTeamMemberRepo(db)
	tournamentRepo := repository.NewCachedTournamentRepo(repository.NewTournamentRepo(db), appCache)
	tournamentTeamRepo := repository.NewTournamentTeamRepo(db)

	// Phase 2 repositories — bracket & live score
	bracketRepo := repository.NewBracketRepo(db)
	matchGameRepo := repository.NewMatchGameRepo(db)

	// Phase 2 repositories — battle royale
	brLobbyRepo := repository.NewBRLobbyRepo(db)
	brResultRepo := repository.NewBRLobbyResultRepo(db)
	brPointRuleRepo := repository.NewBRPointRuleRepo(db)
	brLobbyTeamRepo := repository.NewBRLobbyTeamRepo(db)
	brDailyStandingsRepo := repository.NewBRDailyStandingsRepo(db)
	brPlayerResultRepo := repository.NewBRPlayerResultRepo(db)
	brPenaltyRepo := repository.NewBRPenaltyRepo(db)

	// Phase 2 repositories — standings
	standingsRepo := repository.NewStandingsRepo(db)

	// Phase 3 repositories — schedule & audit
	scheduleRepo := repository.NewScheduleRepo(db)
	activityLogRepo := repository.NewActivityLogRepo(db)

	// Phase 4 repositories — notifications
	notificationRepo := repository.NewNotificationRepo(db)

	// Team invite repository
	teamInviteRepo := repository.NewTeamInviteRepo(db)

	// Phase 5 repositories — media
	mediaRepo := repository.NewMediaRepo(db)

	// Referee system repositories
	penaltyConfigRepo := repository.NewTournamentPenaltyConfigRepo(db)
	refereeAssignmentRepo := repository.NewRefereeAssignmentRepo(db)
	matchCardRepo := repository.NewMatchCardRepo(db)

	// Game rules repository
	gameRulesRepo := repository.NewGameRulesRepo(db)

	// Event repository
	eventRepo := repository.NewEventRepo(db)

	// Event points repositories
	eventPointRuleRepo := repository.NewEventPointRuleRepo(db)
	eventRegistrationRepo := repository.NewEventRegistrationRepo(db)
	eventTeamPointsRepo := repository.NewEventTeamPointsRepo(db)
	eventUserPointsRepo := repository.NewEventUserPointsRepo(db)

	// Event admin and section repositories
	eventAdminRepo := repository.NewEventAdminRepo(db)
	eventSectionRepo := repository.NewEventSectionRepo(db)

	// Event settings repository
	eventSettingsRepo := repository.NewEventSettingsRepo(db)

	// Site settings (global) repository + service
	siteSettingsRepo := repository.NewSiteSettingsRepo(db)
	siteSettingsService := service.NewSiteSettingsService(siteSettingsRepo)

	// Prediction repository
	predictionRepo := repository.NewPredictionRepo(db)

	// Phase 6 repositories — player stats & achievements
	playerStatsRepo := repository.NewPlayerStatsRepo(db)
	achievementRepo := repository.NewAchievementRepo(db)

	// Phase 8 repositories — match submissions & coach
	matchSubmissionRepo := repository.NewMatchSubmissionRepo(db)
	coachSchoolRepo := repository.NewCoachSchoolRepo(db)

	// Badge repository
	badgeRepo := repository.NewBadgeRepo(db)

	// Push notification repository
	pushSubRepo := repository.NewPushSubscriptionRepo(db)

	// Group stage repository
	groupRepo := repository.NewGroupRepo(db)

	// Stage repository
	stageRepo := repository.NewStageRepo(db)

	// Phase 7 repositories — webhooks
	webhookRepo := repository.NewWebhookRepo(db)
	webhookLogRepo := repository.NewWebhookLogRepo(db)

	// ──────────────────────────────────────────────
	// Services
	// ──────────────────────────────────────────────

	// UU PDP consent repository
	consentRepo := repository.NewConsentRepo(db)

	// Phase 1 services (existing)
	authService := service.NewAuthService(userRepo, rdb, service.AuthConfig{
		JWTSecret:     cfg.JWTSecret,
		AccessExpiry:  cfg.JWTAccessExpiry,
		RefreshExpiry: cfg.JWTRefreshExpiry,
	})
	authService.SetConsentRepo(consentRepo)
	teamService := service.NewTeamService(teamRepo, teamMemberRepo, gameRepo, db)
	teamService.SetInviteRepo(teamInviteRepo)
	teamService.SetSchoolRepo(schoolRepo)
	teamService.SetUserRepo(userRepo)
	teamService.SetRdb(rdb)
	teamService.SetHub(hub)
	emailService := service.NewEmailService(service.EmailConfig{
		Enabled:   cfg.SMTPEnabled,
		SMTPHost:  cfg.SMTPHost,
		SMTPPort:  cfg.SMTPPort,
		Username:  cfg.SMTPUsername,
		Password:  cfg.SMTPPassword,
		FromEmail: cfg.SMTPFromAddr,
		FromName:  cfg.SMTPFromName,
	})
	teamService.SetEmailService(emailService)
	authService.SetEmailService(emailService)
	tournamentService := service.NewTournamentService(tournamentRepo, tournamentTeamRepo, teamRepo, teamMemberRepo, gameRepo)
	tournamentService.SetHub(hub)
	tournamentService.SetSchoolRepo(schoolRepo)
	tournamentService.SetEventRepo(eventRepo)

	// Event points service
	eventPointsService := service.NewEventPointsService(
		eventPointRuleRepo, eventTeamPointsRepo, eventUserPointsRepo,
		eventRegistrationRepo, standingsRepo, tournamentRepo, tournamentTeamRepo,
		teamMemberRepo, teamRepo, eventRepo,
	)
	tournamentService.SetPointDistributor(eventPointsService)
	schoolService := service.NewSchoolService(schoolRepo)
	schoolRequestRepo := repository.NewSchoolRequestRepo(db)
	schoolRequestService := service.NewSchoolRequestService(schoolRequestRepo, schoolRepo)

	// Phase 2 services — bracket & live score
	bracketService := service.NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, tournamentTeamRepo, teamRepo, standingsRepo, hub, rdb)
	bracketService.SetMemberRepo(teamMemberRepo)

	// Phase 2 services — battle royale
	brService := service.NewBRService(brLobbyRepo, brResultRepo, brPointRuleRepo, tournamentTeamRepo, standingsRepo, hub)
	brService.SetDailyStandingsRepo(brDailyStandingsRepo)
	brService.SetTournamentRepo(tournamentRepo)
	brService.SetPlayerResultRepo(brPlayerResultRepo)
	brService.SetPenaltyRepo(brPenaltyRepo)

	// Lobby rotation service
	lobbyRotationService := service.NewLobbyRotationService(brLobbyTeamRepo, brLobbyRepo, tournamentTeamRepo, teamRepo)

	// Phase 2 services — standings
	standingsService := service.NewStandingsService(standingsRepo, brResultRepo, brLobbyRepo, bracketRepo, brPenaltyRepo)
	standingsService.SetHub(hub)

	// Phase 3 services — schedule & audit
	scheduleService := service.NewScheduleService(scheduleRepo)
	_ = service.NewAuditService(activityLogRepo) // audit service available for injection into handlers as needed
	// Initialize package-level audit helper for fire-and-forget logging
	// from services/handlers without threading repo dependencies.
	audit.Init(activityLogRepo)

	// Phase 4 services — notifications
	notificationService := service.NewNotificationService(notificationRepo, userRepo, hub)
	bracketService.SetNotificationService(notificationService)
	bracketService.SetGameRepo(gameRepo)
	bracketService.SetTournamentService(tournamentService)

	// Group stage service
	groupService := service.NewGroupService(groupRepo, tournamentRepo, tournamentTeamRepo, teamRepo, rdb)
	groupService.SetBracketRepo(bracketRepo)
	groupService.SetGameRepo(gameRepo)
	groupService.SetSubmissionRepo(matchSubmissionRepo)
	groupService.SetHub(hub)

	// Stage service
	stageService := service.NewStageService(stageRepo, tournamentRepo, groupService, bracketService, tournamentTeamRepo, teamRepo)

	// Group stage handler
	groupHandler := handler.NewGroupHandler(groupService)

	// Stage handler
	stageHandler := handler.NewStageHandler(stageService)

	// Referee service
	refereeService := service.NewRefereeService(
		matchCardRepo, refereeAssignmentRepo, penaltyConfigRepo,
		tournamentRepo, teamRepo, bracketRepo, brLobbyRepo,
		standingsRepo, brLobbyTeamRepo, groupRepo, hub,
	)

	// Prediction service
	predictionService := service.NewPredictionService(predictionRepo, bracketRepo)

	// Phase 6 services — player stats & achievements
	playerStatsService := service.NewPlayerStatsService(playerStatsRepo, achievementRepo, userRepo, gameRepo)
	playerDashboardService := service.NewPlayerDashboardService(
		teamMemberRepo, teamRepo, bracketRepo, tournamentRepo,
		matchSubmissionRepo, schoolRepo, gameRepo, userRepo,
	)

	// Badge service
	badgeService := service.NewBadgeService(badgeRepo)

	// Wire badge hooks into auth and team services (fire-and-forget awards)
	authService.SetBadgeService(badgeService)
	teamService.SetBadgeService(badgeService)

	// Phase 8 services — match submissions & coach
	matchSubmissionService := service.NewMatchSubmissionService(
		matchSubmissionRepo, bracketRepo, brLobbyRepo, brResultRepo, teamRepo,
		teamMemberRepo, brLobbyTeamRepo, gameRepo, userRepo,
		bracketService, brService, notificationService, hub, rdb,
	)
	matchSubmissionService.SetTournamentRepo(tournamentRepo)
	matchSubmissionService.SetGroupRepo(groupRepo)
	matchSubmissionService.SetGroupService(groupService)

	// Push notification handler (wired before SetPushSender below)
	pushHandler := handler.NewPushHandler(pushSubRepo, cfg.VAPIDPublicKey, cfg.VAPIDPrivateKey, cfg.VAPIDSubject)
	matchSubmissionService.SetPushSender(pushHandler)
	coachService := service.NewCoachService(
		coachSchoolRepo, teamRepo, schoolRepo, standingsRepo,
		bracketRepo, brResultRepo, matchSubmissionRepo,
	)

	// Phase 7 services — webhooks & reports
	webhookService := service.NewWebhookService(webhookRepo, webhookLogRepo)
	reportService := service.NewReportService(tournamentRepo, tournamentTeamRepo, teamRepo, bracketRepo, matchGameRepo, standingsRepo, brLobbyRepo, brResultRepo, gameRepo, schoolRepo)

	// ──────────────────────────────────────────────
	// Handlers
	// ──────────────────────────────────────────────

	// Phase 1 handlers (existing)
	authHandler := handler.NewAuthHandlerSecure(authService, cfg.AppEnv == "production")
	gameHandler := handler.NewGameHandler(gameRepo, tournamentRepo)
	teamHandler := handler.NewTeamHandler(teamService)
	tournamentHandler := handler.NewTournamentHandler(tournamentService)
	tournamentHandler.SetEventAdminRepo(eventAdminRepo)
	schoolHandler := handler.NewSchoolHandler(schoolService)
	schoolRequestHandler := handler.NewSchoolRequestHandler(schoolRequestService)

	// Phase 2 handlers — bracket & battle royale
	bracketHandler := handler.NewBracketHandler(bracketService, tournamentService, hub)
	brHandler := handler.NewBRHandler(brService, standingsService)
	brHandler.SetTournamentRepo(tournamentRepo)
	lobbyRotationHandler := handler.NewLobbyRotationHandler(lobbyRotationService, brService)

	// standingsService used by brHandler

	// Upload handler
	uploadHandler := handler.NewUploadHandler(cfg.UploadDir, cfg.UploadMaxSize, cfg.UploadBaseURL)

	// Phase 3 handlers — schedule & admin
	scheduleHandler := handler.NewScheduleHandler(scheduleService)
	adminHandler := handler.NewAdminHandler(userRepo, teamRepo, teamMemberRepo, tournamentRepo, scheduleRepo, bracketRepo, activityLogRepo, gameRepo, schoolRepo, rdb, cfg.JWTSecret)
	adminExportHandler := handler.NewAdminExportHandler(db)

	// Import handler
	importHandler := handler.NewImportHandler(schoolRepo, teamRepo, teamMemberRepo, gameRepo, userRepo, rdb, cfg.JWTSecret)

	// Challonge import handler
	challongeHandler := handler.NewChallongeHandler(cfg.ChallongeAPIKey, bracketRepo, tournamentRepo, tournamentTeamRepo, db)

	// Analytics handler
	analyticsHandler := handler.NewAnalyticsHandler(userRepo, teamRepo, tournamentRepo, scheduleRepo, bracketRepo, gameRepo, schoolRepo, rdb)

	// Phase 4 handlers — notifications
	notificationHandler := handler.NewNotificationHandler(notificationService)

	// Prediction handler
	predictionHandler := handler.NewPredictionHandler(predictionService)

	// Phase 5 handlers — media
	mediaHandler := handler.NewMediaHandler(mediaRepo)

	// Phase 6 handlers — player stats & achievements
	playerHandler := handler.NewPlayerHandler(playerStatsService, playerDashboardService)

	// Referee handler
	refereeHandler := handler.NewRefereeHandler(refereeService, userRepo, teamMemberRepo)

	// Phase 8 handlers — match submissions & coach
	// Use synchronous processing — async queue caused silent failures where
	// players saw "success" but the worker rejected the submission (e.g. wrong
	// BO score). Synchronous mode returns validation errors directly to the user.
	matchSubmissionHandler := handler.NewMatchSubmissionHandler(matchSubmissionService)

	// ── Activate event-admin RBAC scoping on entity-ID mutation routes (fail-open until wired) ──
	bracketHandler.SetEventAdminRepo(eventAdminRepo)
	groupHandler.SetGroupRepo(groupRepo)
	groupHandler.SetTournamentRepo(tournamentRepo)
	groupHandler.SetEventAdminRepo(eventAdminRepo)
	brHandler.SetEventAdminRepo(eventAdminRepo)
	brHandler.SetPenaltyRepo(brPenaltyRepo)
	brHandler.SetLobbyResultRepo(brResultRepo)
	lobbyRotationHandler.SetTournamentRepo(tournamentRepo)
	lobbyRotationHandler.SetEventAdminRepo(eventAdminRepo)
	stageHandler.SetStageRepo(stageRepo)
	stageHandler.SetTournamentRepo(tournamentRepo)
	stageHandler.SetEventAdminRepo(eventAdminRepo)
	matchSubmissionHandler.SetBracketRepo(bracketRepo)
	matchSubmissionHandler.SetBRLobbyRepo(brLobbyRepo)
	matchSubmissionHandler.SetGroupRepo(groupRepo)
	matchSubmissionHandler.SetTournamentRepo(tournamentRepo)
	matchSubmissionHandler.SetEventAdminRepo(eventAdminRepo)
	refereeHandler.SetMatchCardRepo(matchCardRepo)
	refereeHandler.SetTournamentRepo(tournamentRepo)
	refereeHandler.SetEventAdminRepo(eventAdminRepo)
	refereeHandler.SetRefereeAssignmentRepo(refereeAssignmentRepo)
	challongeHandler.SetEventAdminRepo(eventAdminRepo)
	// Queue and workers are still available for future use if needed:
	_ = submissionQueue

	coachHandler := handler.NewCoachHandler(coachService)
	coachHandler.SetRepositories(userRepo, schoolRepo, coachSchoolRepo)

	// Game rules handler
	gameRulesHandler := handler.NewGameRulesHandler(gameRulesRepo, gameRepo)

	// Event handler
	eventHandler := handler.NewEventHandler(eventRepo, tournamentRepo)
	eventHandler.SetEventAdminRepo(eventAdminRepo)
	eventHandler.SetPointDistributor(eventPointsService)

	// Event sections handler
	eventSectionHandler := handler.NewEventSectionHandler(eventRepo, eventSectionRepo)

	// Event admins handler
	eventAdminHandler := handler.NewEventAdminHandler(eventRepo, eventAdminRepo)

	// Calendar handler
	calendarHandler := handler.NewCalendarHandler(eventRepo, tournamentRepo)

	// Event points handler
	eventPointsHandler := handler.NewEventPointsHandler(eventPointsService)

	// Event settings handler
	eventSettingsHandler := handler.NewEventSettingsHandler(eventSettingsRepo)
	siteSettingsHandler := handler.NewSiteSettingsHandler(siteSettingsService, appCache)

	// School standings (Juara Umum) handler
	schoolStandingsHandler := handler.NewSchoolStandingsHandler(db)

	// News handler
	newsRepo := repository.NewNewsRepository(db)
	newsService := service.NewNewsService(newsRepo)
	newsHandler := handler.NewNewsHandler(newsService)

	// Badge handler
	badgeHandler := handler.NewBadgeHandler(badgeService)

	// CSRF handler
	csrfHandler := handler.NewCSRFHandler()

	// Phase 7 handlers — webhooks & reports
	webhookHandler := handler.NewWebhookHandler(webhookRepo, webhookLogRepo, webhookService)
	reportHandler := handler.NewReportHandler(reportService)

	// ──────────────────────────────────────────────
	// Middleware shortcuts
	// ──────────────────────────────────────────────
	authMw := middleware.AuthMiddlewareWithBlacklist(cfg.JWTSecret, rdb, userRepo)
	optionalAuthMw := middleware.OptionalAuthMiddleware(cfg.JWTSecret)
	adminMw := middleware.RoleMiddleware("admin", "superadmin")
	superadminMw := middleware.RoleMiddleware("superadmin")
	coachMw := middleware.RoleMiddleware("coach", "admin", "superadmin")
	refereeMw := middleware.RoleMiddleware("referee", "admin", "superadmin")
	rlOff := cfg.RateLimitDisabled
	loginRL := middleware.LoginRateLimiter(rdb, cfg.RateLimitLogin, rlOff)
	registerRL := middleware.EndpointRateLimiter(rdb, "register_attempts", 30, 10*time.Minute, rlOff)
	forgotPasswordRL := middleware.EndpointRateLimiter(rdb, "forgot_password_attempts", 5, 15*time.Minute, rlOff)
	uploadRL := middleware.EndpointRateLimiter(rdb, "upload_attempts", 100, time.Minute, rlOff)
	bracketRL := middleware.EndpointRateLimiter(rdb, "bracket_attempts", 120, time.Minute, rlOff)
	matchSubmitRL := middleware.EndpointRateLimiter(rdb, "match_submit_attempts", 20, 5*time.Minute, rlOff)
	publicRL := middleware.EndpointRateLimiter(rdb, "public_api", 200, time.Minute, rlOff)
	createTeamRL := middleware.EndpointRateLimiter(rdb, "create_team", 20, 10*time.Minute, rlOff)
	createTournamentRL := middleware.EndpointRateLimiter(rdb, "create_tournament", 10, 10*time.Minute, rlOff)

	// ──────────────────────────────────────────────
	// Route Registration
	// ──────────────────────────────────────────────

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", registerRL, authHandler.Register)
	auth.Post("/login", loginRL, authHandler.Login)
	auth.Post("/refresh", authHandler.Refresh)
	auth.Post("/logout", authHandler.Logout)
	auth.Post("/forgot-password", forgotPasswordRL, authHandler.ForgotPassword)
	auth.Post("/reset-password", authHandler.ResetPassword)
	auth.Post("/verify-email/:token", authHandler.VerifyEmail)
	auth.Get("/me", authMw, authHandler.GetProfile)
	auth.Put("/me", authMw, authHandler.UpdateProfile)
	auth.Put("/change-password", authMw, authHandler.ChangePassword)

	// Upload route (authenticated)
	api.Post("/upload", authMw, uploadRL, uploadHandler.Upload)

	// Game routes (public)
	api.Get("/games", gameHandler.ListGames)
	api.Get("/games/:slug", gameHandler.GetGameBySlug)

	// Admin tournament scope middleware — restricts admin (non-superadmin) users
	// to only manage tournaments in events they're assigned to.
	tournamentScopeMw := middleware.TournamentScopeMw(tournamentRepo, eventAdminRepo)
	api.Use("/admin/tournaments/:id", authMw, tournamentScopeMw)

	// Phase 1 — Team, Tournament, School
	teamHandler.SetEventAdminRepo(eventAdminRepo)
	teamHandler.SetTournamentTeamRepo(tournamentTeamRepo)
	teamHandler.RegisterRoutes(api, authMw, adminMw, superadminMw, publicRL, createTeamRL)
	tournamentHandler.RegisterRoutes(api, authMw, adminMw, superadminMw, createTournamentRL)
	schoolHandler.SetCoachService(coachService)
	schoolHandler.RegisterRoutes(api, authMw, adminMw, superadminMw, publicRL, coachMw)
	schoolRequestHandler.RegisterRoutes(api, authMw, adminMw)

	// Phase 2 — Bracket & Live Score, Battle Royale
	bracketHandler.RegisterRoutes(api, authMw, adminMw, bracketRL)
	brHandler.RegisterRoutes(api, authMw, adminMw)
	lobbyRotationHandler.RegisterRoutes(api, authMw, adminMw)

	// Group Stage
	groupHandler.RegisterRoutes(api, authMw, adminMw)

	// Multi-stage / Swiss
	stageHandler.RegisterRoutes(api, authMw, adminMw)

	// Phase 3 — Schedule, Admin Dashboard, Analytics
	scheduleHandler.RegisterRoutes(api, authMw, adminMw, publicRL)
	adminHandler.RegisterRoutes(api, authMw, adminMw, superadminMw, publicRL)
	adminExportHandler.RegisterRoutes(api, authMw, superadminMw) // export = global PII → superadmin only
	analyticsHandler.RegisterRoutes(api, authMw, adminMw)

	// Bulk import routes
	importHandler.RegisterRoutes(api, authMw, superadminMw) // import/credentials = global → superadmin only
	challongeHandler.RegisterRoutes(api, authMw, adminMw)

	// Phase 4 — Notifications
	notificationHandler.RegisterRoutes(api, authMw)

	// Push notifications
	pushHandler.RegisterRoutes(api, authMw)

	// Phase 5 — Media
	mediaHandler.RegisterRoutes(api, authMw, adminMw)

	// Match Predictions
	predictionHandler.RegisterRoutes(api, authMw, optionalAuthMw)

	// Phase 6 — Player Stats & Achievements
	playerHandler.RegisterRoutes(api, authMw, publicRL)

	// Phase 7 — Webhooks & Reports
	webhookHandler.RegisterRoutes(api, authMw, superadminMw)
	reportHandler.RegisterRoutes(api, authMw, adminMw)

	// Phase 8 — Match Submissions & Coach
	matchSubmissionHandler.RegisterRoutes(api, authMw, adminMw, matchSubmitRL)
	coachHandler.RegisterRoutes(api, authMw, coachMw, superadminMw) // /admin/coaches* = user-directory → superadmin only

	// Event-scope middleware: restricts non-superadmin admins to events they are
	// assigned to (via event_admins). Applied to all /admin/events/:id(:eventId)/* routes.
	eventScopeMw := middleware.EventScopeMw(eventAdminRepo)

	// Events (multi-event)
	eventHandler.RegisterRoutes(api, authMw, adminMw, superadminMw, publicRL, eventScopeMw)

	// Event Sections
	eventSectionHandler.RegisterRoutes(api, authMw, adminMw, eventScopeMw)

	// Event Admins (assignment is superadmin-only)
	eventAdminHandler.RegisterRoutes(api, authMw, superadminMw)

	// Calendar
	calendarHandler.RegisterRoutes(api, authMw, adminMw)

	// Event Announcements
	eventAnnouncementRepo := repository.NewEventAnnouncementRepository(db)
	eventAnnouncementService := service.NewEventAnnouncementService(eventAnnouncementRepo)
	eventAnnouncementHandler := handler.NewEventAnnouncementHandler(eventAnnouncementService, eventRepo)
	eventAnnouncementHandler.RegisterRoutes(api, authMw, adminMw, eventScopeMw)

	// Event Points & Leaderboards
	eventPointsHandler.RegisterRoutes(api, authMw, adminMw, publicRL, eventScopeMw)

	// Event Settings
	eventSettingsHandler.RegisterRoutes(api, authMw, adminMw)
	siteSettingsHandler.RegisterRoutes(api, authMw, adminMw)

	// Game Rules CMS
	gameRulesHandler.RegisterRoutes(api, authMw, adminMw)

	// Referee system
	refereeHandler.RegisterRoutes(api, authMw, refereeMw, adminMw)

	// School Standings (Juara Umum)
	schoolStandingsHandler.RegisterRoutes(api, publicRL)

	// News
	newsHandler.RegisterRoutes(api, authMw, adminMw)

	// Badges
	badgeHandler.RegisterRoutes(api, authMw, adminMw, publicRL)

	// Match check-in (players) — POST /matches/:id/check-in
	matchCheckinRepo := repository.NewMatchCheckinRepo(db)
	matchCheckinService := service.NewMatchCheckinService(matchCheckinRepo, bracketRepo, teamMemberRepo)
	matchCheckinHandler := handler.NewMatchCheckinHandler(matchCheckinService)
	api.Post("/matches/:id/check-in", authMw, matchCheckinHandler.CheckIn)

	// CSRF — public endpoint, sets token cookie and returns token in body
	api.Get("/csrf-token", middleware.SetCSRFToken(cfg.AppEnv == "production"), csrfHandler.GetToken)

	// Observability — client error reporting + privacy-friendly analytics.
	// Both endpoints are public but aggressively rate-limited per IP.
	obsHandler := handler.NewObservabilityHandler()
	errReportRL := middleware.EndpointRateLimiter(rdb, "err_report", 10, time.Minute, rlOff)
	pageViewRL := middleware.EndpointRateLimiter(rdb, "pageview", 120, time.Minute, rlOff)
	api.Post("/errors/report", errReportRL, obsHandler.ReportError)
	api.Post("/analytics/pageview", pageViewRL, obsHandler.PageView)
}
