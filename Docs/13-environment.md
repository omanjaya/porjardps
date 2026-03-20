# Environment & Configuration — PORJAR Denpasar Esport

## Overview

Configuration is managed via environment variables. No hardcoded values in code.

Both the Go API and Next.js frontend have their own `.env` files. A `docker-compose.yml` wires everything together for both local development and production.

---

## Go API — Environment Variables

File: `porjar-api/.env` (copy from `porjar-api/.env.example`)

```env
# --- Server ------------------------------------------------
APP_ENV=development           # development | production
APP_PORT=8080
APP_SECRET=                   # random 32-byte string, required in production
                              # generate: openssl rand -hex 32

# --- Database ----------------------------------------------
DB_HOST=localhost
DB_PORT=5432
DB_NAME=porjar
DB_USER=porjar
DB_PASSWORD=                  # required
DB_SSL_MODE=disable           # disable for dev, require for production
DB_MAX_CONNECTIONS=25
DB_IDLE_CONNECTIONS=5

# --- Redis -------------------------------------------------
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=               # optional in dev, required in production
REDIS_DB=0

# --- JWT ---------------------------------------------------
JWT_SECRET=                   # random 32-byte string (different from APP_SECRET)
JWT_ACCESS_EXPIRY=15m         # access token TTL
JWT_REFRESH_EXPIRY=168h       # refresh token TTL (7 days)

# --- File Upload -------------------------------------------
UPLOAD_DIR=./storage/uploads  # local path for dev
UPLOAD_MAX_SIZE=5242880       # 5MB in bytes
UPLOAD_BASE_URL=http://localhost:8080/uploads

# --- CORS --------------------------------------------------
CORS_ALLOWED_ORIGINS=http://localhost:3000

# --- Rate Limiting -----------------------------------------
RATE_LIMIT_GLOBAL=100         # requests per minute per IP
RATE_LIMIT_LOGIN=5            # login attempts per minute per IP

# --- WebSocket ---------------------------------------------
WS_MAX_CONNECTIONS=5000       # max concurrent WebSocket connections
WS_PING_INTERVAL=30s          # ping interval for keepalive
WS_IDLE_TIMEOUT=300s          # disconnect after 5 min idle

# --- Logging -----------------------------------------------
LOG_LEVEL=debug               # debug | info | warn | error
LOG_FORMAT=text               # text (dev) | json (production)
```

---

## Next.js Frontend — Environment Variables

File: `porjar-web/.env.local` (copy from `porjar-web/.env.example`)

```env
# --- API ---------------------------------------------------
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
                              # NEXT_PUBLIC_ prefix = exposed to browser
                              # production: https://esport.porjar-denpasar.id/api/v1

# --- WebSocket ---------------------------------------------
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
                              # production: wss://esport.porjar-denpasar.id/ws

# --- App ---------------------------------------------------
NEXT_PUBLIC_APP_NAME=PORJAR Denpasar Esport
NEXT_PUBLIC_APP_URL=http://localhost:3000

# --- Cookies -----------------------------------------------
# No .env needed -- cookie config is hardcoded based on APP_ENV
# Secure=true enforced automatically when HTTPS is detected
```

---

## Docker Compose — Local Development

File: `docker-compose.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: porjar
      POSTGRES_PASSWORD: porjar_dev
      POSTGRES_DB: porjar
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U porjar"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  api:
    build:
      context: ./porjar-api
      dockerfile: Dockerfile.dev
    env_file: ./porjar-api/.env
    ports:
      - "8080:8080"
    volumes:
      - ./porjar-api:/app         # hot reload in dev
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  web:
    build:
      context: ./porjar-web
      dockerfile: Dockerfile.dev
    env_file: ./porjar-web/.env.local
    ports:
      - "3000:3000"
    volumes:
      - ./porjar-web:/app         # hot reload
      - /app/node_modules         # prevent host override
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

---

## Docker Compose — Production

File: `docker-compose.prod.yml`

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # Not exposed publicly -- internal network only

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data

  api:
    image: porjar/api:${PORJAR_VERSION}
    restart: always
    env_file: .env.prod
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis

  web:
    image: porjar/web:${PORJAR_VERSION}
    restart: always
    env_file: .env.prod.web
    ports:
      - "3000:3000"
    depends_on:
      - api

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - certbot_data:/etc/letsencrypt
    depends_on:
      - api
      - web

volumes:
  postgres_data:
  redis_data:
  certbot_data:
```

---

## Nginx Configuration

File: `nginx.conf`

```nginx
server {
    listen 80;
    server_name esport.porjar-denpasar.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name esport.porjar-denpasar.id;

    ssl_certificate /etc/letsencrypt/live/esport.porjar-denpasar.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/esport.porjar-denpasar.id/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://web:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://api:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }

    # File uploads
    location /uploads/ {
        alias /var/www/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Local Development Setup

Step-by-step for a new developer:

```bash
# 1. Clone repository
git clone https://github.com/porjar-denpasar/porjar
cd porjar

# 2. Setup environment files
cp porjar-api/.env.example porjar-api/.env
cp porjar-web/.env.example porjar-web/.env.local
# Edit both files -- fill in required values

# 3. Start infrastructure
docker-compose up postgres redis -d

# 4. Run database migrations
cd porjar-api
go run ./cmd/migrate up

# 5. Seed development data (games, schools, test accounts)
go run ./scripts/seed.go

# 6. Start API server (with hot reload)
air  # install: go install github.com/air-verse/air@latest

# 7. Start frontend (new terminal)
cd porjar-web
npm install
npm run dev

# App running at:
# Frontend  : http://localhost:3000
# API       : http://localhost:8080
# WebSocket : ws://localhost:8080/ws/live-scores
```

---

## Production Deployment

```bash
# 1. Build Docker images
docker build -t porjar/api:1.0.0 ./porjar-api
docker build -t porjar/web:1.0.0 ./porjar-web

# 2. Create production env files on VPS
cp .env.example .env.prod
cp .env.web.example .env.prod.web
# Fill in production values (generated secrets, real domain)

# 3. Run migrations
docker-compose -f docker-compose.prod.yml run --rm api go run ./cmd/migrate up

# 4. Seed production data (games, schools)
docker-compose -f docker-compose.prod.yml run --rm api go run ./scripts/seed.go --env=production

# 5. Start all services
docker-compose -f docker-compose.prod.yml up -d

# 6. Setup SSL (first time)
certbot certonly --webroot -w /var/www/certbot -d esport.porjar-denpasar.id

# 7. Verify
curl https://esport.porjar-denpasar.id/api/v1/health
```

---

## Environment Validation (Go)

Fail fast on startup if required env vars are missing:

```go
// config/config.go

type Config struct {
    AppEnv      string `env:"APP_ENV,required"`
    AppPort     int    `env:"APP_PORT" envDefault:"8080"`
    AppSecret   string `env:"APP_SECRET,required"`
    DBHost      string `env:"DB_HOST,required"`
    DBPort      int    `env:"DB_PORT" envDefault:"5432"`
    DBName      string `env:"DB_NAME,required"`
    DBUser      string `env:"DB_USER,required"`
    DBPassword  string `env:"DB_PASSWORD,required"`
    JWTSecret   string `env:"JWT_SECRET,required"`
    RedisHost   string `env:"REDIS_HOST,required"`
    // ... all fields
}

func Load() (*Config, error) {
    cfg := &Config{}
    if err := env.Parse(cfg); err != nil {
        return nil, fmt.Errorf("invalid configuration: %w", err)
    }
    return cfg, nil
}
```

Library: `github.com/caarlos0/env/v11`

If any `required` field is empty, server refuses to start with clear error.

---

## Secrets Management

| Secret | Where | How to Generate |
|---|---|---|
| `APP_SECRET` | `.env.prod` | `openssl rand -hex 32` |
| `JWT_SECRET` | `.env.prod` | `openssl rand -hex 32` |
| `DB_PASSWORD` | `.env.prod` | `openssl rand -base64 24` |
| `REDIS_PASSWORD` | `.env.prod` | `openssl rand -base64 16` |
| `PORJAR_VERSION` | `.env.prod` | Git tag, e.g. `1.0.0` |

Rules:
- Never commit `.env` files to git
- `.env.example` contains only placeholder values, safe to commit
- Rotate `JWT_SECRET` invalidates all active sessions (users must re-login)

---

## Logging in Production

```go
// Structured JSON logs in production
// Parsed by log aggregator (optional: Loki, Papertrail)

logger.Info("match score updated",
    "match_id", matchID,
    "tournament_id", tournamentID,
    "score_a", scoreA,
    "score_b", scoreB,
    "updated_by", userID,
)

// Never log:
// - passwords or tokens
// - full request bodies (may contain PII)
// - room credentials (BR lobby passwords)
```

---

## Health Check

```
GET /health

// Response 200
{
  "status": "ok",
  "version": "1.0.0",
  "db": "ok",
  "redis": "ok",
  "ws_connections": 234
}

// Response 503 if any dependency is down
{
  "status": "degraded",
  "db": "error",
  "redis": "ok",
  "ws_connections": 0
}
```

Used by Docker healthcheck and monitoring.
