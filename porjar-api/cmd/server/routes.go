package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/porjar-denpasar/porjar-api/internal/config"
	"github.com/porjar-denpasar/porjar-api/internal/handler"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
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

	// Game rules repository
	gameRulesRepo := repository.NewGameRulesRepo(db)

	// Event settings repository
	eventSettingsRepo := repository.NewEventSettingsRepo(db)

	// Prediction repository
	predictionRepo := repository.NewPredictionRepo(db)

	// Phase 6 repositories — player stats & achievements
	playerStatsRepo := repository.NewPlayerStatsRepo(db)
	achievementRepo := repository.NewAchievementRepo(db)

	// Phase 8 repositories — match submissions & coach
	matchSubmissionRepo := repository.NewMatchSubmissionRepo(db)
	coachSchoolRepo := repository.NewCoachSchoolRepo(db)

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
	tournamentService := service.NewTournamentService(tournamentRepo, tournamentTeamRepo, teamRepo, teamMemberRepo, gameRepo)
	schoolService := service.NewSchoolService(schoolRepo)

	// Phase 2 services — bracket & live score
	bracketService := service.NewBracketService(bracketRepo, matchGameRepo, tournamentRepo, tournamentTeamRepo, teamRepo, standingsRepo, hub)
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

	// Phase 3 services — schedule & audit
	scheduleService := service.NewScheduleService(scheduleRepo)
	_ = service.NewAuditService(activityLogRepo) // audit service available for injection into handlers as needed

	// Phase 4 services — notifications
	notificationService := service.NewNotificationService(notificationRepo, hub)
	bracketService.SetNotificationService(notificationService)

	// Prediction service
	predictionService := service.NewPredictionService(predictionRepo, bracketRepo)

	// Phase 6 services — player stats & achievements
	playerStatsService := service.NewPlayerStatsService(playerStatsRepo, achievementRepo, userRepo, gameRepo)
	playerDashboardService := service.NewPlayerDashboardService(
		teamMemberRepo, teamRepo, bracketRepo, tournamentRepo,
		matchSubmissionRepo, schoolRepo, gameRepo, userRepo,
	)

	// Phase 8 services — match submissions & coach
	matchSubmissionService := service.NewMatchSubmissionService(
		matchSubmissionRepo, bracketRepo, brLobbyRepo, brResultRepo, teamRepo,
		teamMemberRepo, brLobbyTeamRepo, gameRepo, userRepo,
		bracketService, brService, notificationService, hub,
	)
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
	schoolHandler := handler.NewSchoolHandler(schoolService)

	// Phase 2 handlers — bracket & battle royale
	bracketHandler := handler.NewBracketHandler(bracketService, tournamentService, hub)
	brHandler := handler.NewBRHandler(brService, standingsService)
	lobbyRotationHandler := handler.NewLobbyRotationHandler(lobbyRotationService, brService)

	// standingsService used by brHandler

	// Upload handler
	uploadHandler := handler.NewUploadHandler(cfg.UploadDir, cfg.UploadMaxSize, cfg.UploadBaseURL)

	// Phase 3 handlers — schedule & admin
	scheduleHandler := handler.NewScheduleHandler(scheduleService)
	adminHandler := handler.NewAdminHandler(userRepo, teamRepo, tournamentRepo, scheduleRepo, bracketRepo, activityLogRepo, gameRepo, schoolRepo)

	// Import handler
	importHandler := handler.NewImportHandler(schoolRepo, teamRepo, teamMemberRepo, gameRepo, userRepo, rdb)

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

	// Phase 8 handlers — match submissions & coach
	// Attach the submission queue for async processing and start the worker pool.
	matchSubmissionHandler := handler.NewMatchSubmissionHandler(matchSubmissionService).
		WithQueue(submissionQueue)

	submissionWorker := queue.NewSubmissionWorker(submissionQueue, matchSubmissionService, cfg.SubmissionWorkers)
	go submissionWorker.Start(serverCtx)
	slog.Info("submission worker pool started", "workers", cfg.SubmissionWorkers)

	coachHandler := handler.NewCoachHandler(coachService)

	// Game rules handler
	gameRulesHandler := handler.NewGameRulesHandler(gameRulesRepo, gameRepo)

	// Event settings handler
	eventSettingsHandler := handler.NewEventSettingsHandler(eventSettingsRepo)

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
	loginRL := middleware.LoginRateLimiter(rdb, cfg.RateLimitLogin)
	registerRL := middleware.EndpointRateLimiter(rdb, "register_attempts", 20, 10*time.Minute)
	forgotPasswordRL := middleware.EndpointRateLimiter(rdb, "forgot_password_attempts", 3, 10*time.Minute)
	uploadRL := middleware.EndpointRateLimiter(rdb, "upload_attempts", 20, time.Minute)
	bracketRL := middleware.EndpointRateLimiter(rdb, "bracket_attempts", 30, time.Minute)
	matchSubmitRL := middleware.EndpointRateLimiter(rdb, "match_submit_attempts", 10, 5*time.Minute)
	publicRL := middleware.EndpointRateLimiter(rdb, "public_api", 60, time.Minute)

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
	auth.Get("/me", authMw, authHandler.GetProfile)
	auth.Put("/me", authMw, authHandler.UpdateProfile)
	auth.Put("/change-password", authMw, authHandler.ChangePassword)

	// Upload route (authenticated)
	api.Post("/upload", authMw, uploadRL, uploadHandler.Upload)

	// Game routes (public)
	api.Get("/games", gameHandler.ListGames)
	api.Get("/games/:slug", gameHandler.GetGameBySlug)

	// Phase 1 — Team, Tournament, School
	teamHandler.RegisterRoutes(api, authMw, adminMw, superadminMw, publicRL)
	tournamentHandler.RegisterRoutes(api, authMw, adminMw, superadminMw)
	schoolHandler.RegisterRoutes(api, authMw, adminMw, publicRL)

	// Phase 2 — Bracket & Live Score, Battle Royale
	bracketHandler.RegisterRoutes(api, authMw, adminMw, bracketRL)
	brHandler.RegisterRoutes(api, authMw, adminMw)
	lobbyRotationHandler.RegisterRoutes(api, authMw, adminMw)

	// Phase 3 — Schedule, Admin Dashboard, Analytics
	scheduleHandler.RegisterRoutes(api, authMw, adminMw, publicRL)
	adminHandler.RegisterRoutes(api, authMw, adminMw, superadminMw, publicRL)
	analyticsHandler.RegisterRoutes(api, authMw, adminMw)

	// Bulk import routes
	importHandler.RegisterRoutes(api, authMw, adminMw)

	// Phase 4 — Notifications
	notificationHandler.RegisterRoutes(api, authMw)

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
	coachHandler.RegisterRoutes(api, authMw, coachMw, adminMw)

	// Event Settings
	eventSettingsHandler.RegisterRoutes(api, authMw, adminMw)

	// Game Rules CMS
	gameRulesHandler.RegisterRoutes(api, authMw, adminMw)

	// CSRF — public endpoint, sets token cookie and returns token in body
	api.Get("/csrf-token", middleware.SetCSRFToken(), csrfHandler.GetToken)
}
