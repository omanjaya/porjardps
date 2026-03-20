package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"github.com/valyala/fasthttp/fasthttpadaptor"

	"github.com/porjar-denpasar/porjar-api/internal/config"
	"github.com/porjar-denpasar/porjar-api/internal/middleware"
	"github.com/porjar-denpasar/porjar-api/internal/queue"
	"github.com/porjar-denpasar/porjar-api/internal/repository"
	"github.com/porjar-denpasar/porjar-api/internal/service"
	"github.com/porjar-denpasar/porjar-api/internal/ws"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Setup logger
	setupLogger(cfg.AppEnv, cfg.LogLevel)

	slog.Info("starting PORJAR API", "env", cfg.AppEnv, "port", cfg.AppPort)

	// serverCtx is cancelled on OS signal to allow graceful shutdown of background workers.
	serverCtx, serverCancel := context.WithCancel(context.Background())
	defer serverCancel()

	// Database
	db, err := setupDatabase(serverCtx, cfg)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	slog.Info("database connected")

	// Redis
	rdb := setupRedis(cfg)
	if err := rdb.Ping(serverCtx).Err(); err != nil {
		slog.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	slog.Info("redis connected")

	// WebSocket hub
	hub := ws.NewHubWithLimit(cfg.WSMaxConnections)
	go hub.Run()

	// Submission queue — async processing via Redis Streams
	submissionQueue := queue.NewSubmissionQueue(rdb)
	if err := submissionQueue.EnsureConsumerGroup(serverCtx); err != nil {
		slog.Error("failed to initialise submission consumer group", "error", err)
		os.Exit(1)
	}
	slog.Info("submission queue ready")

	// Fiber app
	app := fiber.New(fiber.Config{
		BodyLimit:    2 * 1024 * 1024,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		IdleTimeout:  cfg.IdleTimeout,
		ErrorHandler: middleware.ErrorHandler,
	})

	// Global middleware
	app.Use(middleware.Logger())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.CORS(cfg.CORSAllowedOrigins))
	app.Use(middleware.RateLimiter(rdb, cfg.RateLimitGlobal))
	app.Use(middleware.PrometheusMetrics())

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		dbErr := db.Ping(serverCtx)
		redisErr := rdb.Ping(serverCtx).Err()

		status := "ok"
		dbStatus := "ok"
		redisStatus := "ok"
		httpCode := 200

		if dbErr != nil {
			status = "degraded"
			dbStatus = "error"
			httpCode = 503
		}
		if redisErr != nil {
			status = "degraded"
			redisStatus = "error"
			httpCode = 503
		}

		queueDepth, _ := submissionQueue.Depth(serverCtx)

		return c.Status(httpCode).JSON(fiber.Map{
			"status":               status,
			"version":              "0.1.0",
			"db":                   dbStatus,
			"redis":                redisStatus,
			"ws_connections":       hub.ConnectionCount(),
			"submission_queue_depth": queueDepth,
		})
	})

	// /metrics — Prometheus scrape endpoint.
	// In production this should only be reachable from the internal Docker network
	// (Prometheus scrapes via the service name); it is NOT wired through Nginx.
	app.Get("/metrics", func(c *fiber.Ctx) error {
		// Block access from outside the internal network in production.
		// The Docker-internal scraper connects from 172.x.x.x / 10.x.x.x ranges.
		if cfg.AppEnv == "production" {
			ip := c.IP()
			if !isInternalIP(ip) {
				return c.SendStatus(fiber.StatusForbidden)
			}
		}
		fasthttpadaptor.NewFastHTTPHandler(promhttp.Handler())(c.Context())
		return nil
	})

	// Background goroutine: refresh gauge metrics every 15 s so Prometheus always
	// sees up-to-date values between scrapes.
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-serverCtx.Done():
				return
			case <-ticker.C:
				// WebSocket connections
				middleware.WSConnectionsActive.Set(float64(hub.ConnectionCount()))

				// Submission queue depth
				if depth, err := submissionQueue.Depth(serverCtx); err == nil {
					middleware.SubmissionQueueDepth.Set(float64(depth))
				}

				// DB pool open connections (acquired + idle)
				stat := db.Stat()
				middleware.DBPoolOpenConnections.Set(float64(stat.TotalConns()))
			}
		}
	}()

	// API routes
	api := app.Group("/api/v1")
	setupRoutes(api, db, rdb, hub, cfg, submissionQueue, serverCtx)

	// WebSocket routes
	ws.SetupRoutes(app, hub, cfg.JWTSecret, cfg.CORSAllowedOrigins)

	// Static file serving (uploads)
	app.Static("/uploads", cfg.UploadDir)

	// Start match scheduler (auto-live matches when scheduled time arrives)
	schedulerBracketRepo := repository.NewBracketRepo(db)
	schedulerBrLobbyRepo := repository.NewBRLobbyRepo(db)
	scheduler := service.NewMatchScheduler(schedulerBracketRepo, schedulerBrLobbyRepo, hub)
	scheduler.Start()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := app.Listen(fmt.Sprintf(":%d", cfg.AppPort)); err != nil {
			slog.Error("server error", "error", err)
		}
	}()

	<-quit
	slog.Info("shutting down server...")

	// Cancel serverCtx to stop all background goroutines (submission workers, etc.)
	serverCancel()

	scheduler.Stop()

	// Close all active WebSocket connections before HTTP shutdown so clients
	// receive a proper close frame instead of a TCP reset.
	hub.Stop()

	if err := app.Shutdown(); err != nil {
		slog.Error("error during shutdown", "error", err)
	}

	slog.Info("server stopped")
}

func setupLogger(env, level string) {
	var handler slog.Handler
	opts := &slog.HandlerOptions{}

	switch level {
	case "debug":
		opts.Level = slog.LevelDebug
	case "warn":
		opts.Level = slog.LevelWarn
	case "error":
		opts.Level = slog.LevelError
	default:
		opts.Level = slog.LevelInfo
	}

	if env == "production" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	slog.SetDefault(slog.New(handler))
}

func setupDatabase(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBSSLMode,
	)

	poolCfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse db config: %w", err)
	}

	poolCfg.MaxConns = int32(cfg.DBMaxConnections)
	poolCfg.MinConns = int32(cfg.DBIdleConnections)

	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, fmt.Errorf("create db pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return pool, nil
}

func setupRedis(cfg *config.Config) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
}

// isInternalIP returns true when the remote address belongs to a private /
// loopback range used inside Docker networks (172.16-31.x.x, 10.x.x.x, 127.x).
// This is a best-effort guard; the primary protection is that /metrics is NOT
// exposed through Nginx in production.
func isInternalIP(ip string) bool {
	// Allow loopback
	if ip == "127.0.0.1" || ip == "::1" {
		return true
	}
	// Docker bridge networks: 172.16.0.0/12 and 10.0.0.0/8
	if len(ip) >= 3 && ip[:3] == "10." {
		return true
	}
	if len(ip) >= 4 && ip[:4] == "172." {
		// 172.16.0.0 – 172.31.255.255
		var a, b int
		if n, _ := fmt.Sscanf(ip, "172.%d.%d", &a, &b); n == 2 && a >= 16 && a <= 31 {
			_ = b
			return true
		}
	}
	if len(ip) >= 8 && ip[:8] == "192.168." {
		return true
	}
	return false
}
