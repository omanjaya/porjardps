package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	// Server
	AppEnv       string        `env:"APP_ENV,required"`
	AppPort      int           `env:"APP_PORT" envDefault:"8080"`
	AppSecret    string        `env:"APP_SECRET,required"`
	ReadTimeout  time.Duration `env:"READ_TIMEOUT" envDefault:"30s"`
	WriteTimeout time.Duration `env:"WRITE_TIMEOUT" envDefault:"30s"`
	IdleTimeout  time.Duration `env:"IDLE_TIMEOUT" envDefault:"60s"`

	// Database
	DBHost            string `env:"DB_HOST,required"`
	DBPort            int    `env:"DB_PORT" envDefault:"5432"`
	DBName            string `env:"DB_NAME,required"`
	DBUser            string `env:"DB_USER,required"`
	DBPassword        string `env:"DB_PASSWORD,required"`
	DBSSLMode         string `env:"DB_SSL_MODE" envDefault:"disable"`
	DBMaxConnections  int    `env:"DB_MAX_CONNECTIONS" envDefault:"200"`
	DBIdleConnections int    `env:"DB_IDLE_CONNECTIONS" envDefault:"20"`

	// Redis
	RedisHost     string `env:"REDIS_HOST,required"`
	RedisPort     int    `env:"REDIS_PORT" envDefault:"6379"`
	RedisPassword string `env:"REDIS_PASSWORD"`
	RedisDB       int    `env:"REDIS_DB" envDefault:"0"`

	// JWT
	JWTSecret        string        `env:"JWT_SECRET,required"`
	JWTAccessExpiry  time.Duration `env:"JWT_ACCESS_EXPIRY" envDefault:"2h"`
	JWTRefreshExpiry time.Duration `env:"JWT_REFRESH_EXPIRY" envDefault:"168h"`

	// File Upload
	UploadDir     string `env:"UPLOAD_DIR" envDefault:"./storage/uploads"`
	UploadMaxSize int    `env:"UPLOAD_MAX_SIZE" envDefault:"5242880"`
	UploadBaseURL string `env:"UPLOAD_BASE_URL" envDefault:"http://localhost:8080/uploads"`

	// CORS
	CORSAllowedOrigins string `env:"CORS_ALLOWED_ORIGINS" envDefault:"http://localhost:3000"`

	// Rate Limiting
	RateLimitGlobal   int  `env:"RATE_LIMIT_GLOBAL" envDefault:"500"`
	RateLimitLogin    int  `env:"RATE_LIMIT_LOGIN" envDefault:"20"`
	RateLimitDisabled bool `env:"RATE_LIMIT_DISABLED" envDefault:"false"`

	// Centrifugo
	CentrifugoURL    string `env:"CENTRIFUGO_URL" envDefault:"http://centrifugo:8000"`
	CentrifugoAPIKey string `env:"CENTRIFUGO_API_KEY"`

	// Challonge
	ChallongeAPIKey string `env:"CHALLONGE_API_KEY"`

	// Logging
	LogLevel  string `env:"LOG_LEVEL" envDefault:"info"`
	LogFormat string `env:"LOG_FORMAT" envDefault:"text"`

	// Submission queue worker pool
	SubmissionWorkers int `env:"SUBMISSION_WORKERS" envDefault:"10"`

	// SMTP (email notifications). Defaults make email a no-op.
	SMTPEnabled  bool   `env:"SMTP_ENABLED" envDefault:"false"`
	SMTPHost     string `env:"SMTP_HOST"`
	SMTPPort     int    `env:"SMTP_PORT" envDefault:"587"`
	SMTPUsername string `env:"SMTP_USERNAME"`
	SMTPPassword string `env:"SMTP_PASSWORD"`
	SMTPFromAddr string `env:"SMTP_FROM_ADDR" envDefault:"noreply@esidenpasar.com"`
	SMTPFromName string `env:"SMTP_FROM_NAME" envDefault:"ESI Denpasar"`

	// Public web app base URL, used to build links in transactional emails.
	AppURL string `env:"APP_URL" envDefault:"https://esidenpasar.com"`

	// Push notifications (VAPID)
	VAPIDPrivateKey string `env:"VAPID_PRIVATE_KEY"`
	VAPIDPublicKey  string `env:"VAPID_PUBLIC_KEY"`
	VAPIDSubject    string `env:"VAPID_SUBJECT" envDefault:"mailto:admin@esidenpasar.com"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("invalid configuration: %w", err)
	}
	return cfg, nil
}
