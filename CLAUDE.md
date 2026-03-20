# PORJAR — Denpasar Esport Tournament Platform

Full-stack tournament management system for high school esports in Denpasar. Go API (Fiber) + Next.js (App Router) + PostgreSQL + Redis.

## Run Locally

### With Docker (recommended)
```bash
docker-compose up
```
API at :9090, Web at :4200, Postgres at :5499, Redis at :6399

### Manual
```bash
# 1. Start infra
docker-compose up postgres redis -d

# 2. API
cd porjar-api
cp ../.env .env
go run ./cmd/migrate up
go run ./scripts/seed.go
go run ./cmd/server

# 3. Web
cd porjar-web
npm install
npm run dev
```

## Key Commands

| Command | Description |
|---------|-------------|
| `cd porjar-api && go run ./cmd/migrate up` | Run DB migrations |
| `cd porjar-api && go run ./cmd/migrate down` | Rollback last migration |
| `cd porjar-api && go run ./scripts/seed.go` | Seed games, schools, test accounts |
| `cd porjar-api && go build -o ./tmp/main ./cmd/server` | Build API binary |
| `cd porjar-web && npm run dev` | Start web dev server |
| `cd porjar-web && npx playwright test --workers=1` | Run E2E tests (504 tests, ~7min) |
| `cd porjar-web && npx playwright test e2e/FILE.spec.ts` | Run specific E2E test file |

## E2E Testing

- **504 tests** across 24 spec files, all passing
- Run with `--workers=1` (dev server can't handle parallel browsers)
- Seed must be run before tests: `cd porjar-api && set -a && source .env && set +a && go run ./scripts/seed.go`
- Auth setup creates `e2e/.auth/admin.json` and `e2e/.auth/player.json`
- Test accounts: admin@porjar.test / Admin1234, player1@porjar.test / Player1234

## Project Structure

```
porjar/
├── docker-compose.yml          # Dev: postgres, redis, api, web
├── docker-compose.prod.yml     # Production compose
├── nginx.conf                  # Reverse proxy config
├── porjar-api/
│   ├── cmd/server/             # API entrypoint (main.go, routes.go)
│   ├── cmd/migrate/            # Migration CLI
│   ├── internal/
│   │   ├── config/             # Env config
│   │   ├── handler/            # HTTP handlers (Fiber)
│   │   ├── middleware/         # JWT, CORS, CSRF, rate limit, roles, security headers
│   │   ├── model/              # Domain models, DTOs, repository interfaces
│   │   ├── repository/         # PostgreSQL queries (pgxpool)
│   │   ├── service/            # Business logic
│   │   ├── pkg/                # Shared: response, apperror, validator, cache
│   │   ├── ws/                 # WebSocket hub (gorilla) with per-IP limits
│   │   └── queue/              # Redis-based submission queue + workers
│   ├── migrations/             # SQL migrations (0001-0035)
│   ├── scripts/                # Seed scripts
│   ├── static/logos/           # Logo PNGs for PDF generation
│   └── storage/uploads/        # Local file uploads (EXIF stripped)
├── porjar-web/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # React components (shadcn/ui)
│   │   ├── lib/                # API client, WS client, utils (sanitizeUrl)
│   │   ├── store/              # Zustand stores (auth)
│   │   └── hooks/              # Custom hooks (useWebSocket with cleanup)
│   └── e2e/                    # Playwright E2E tests (24 spec files)
└── Docs/                       # Design docs & specs
```

## Tech Stack

- **API:** Go 1.22+, Fiber v2, pgxpool, gorilla/websocket, gofpdf
- **Web:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand
- **DB:** PostgreSQL 16, Redis 7
- **Auth:** JWT (access 2h + refresh 7d), bcrypt, HttpOnly cookies, Redis blacklist
- **Infra:** Docker, Nginx reverse proxy
- **Testing:** Playwright 504 E2E tests

## Security Hardening (completed)

The following security measures are implemented:
- **CSRF:** Double-submit cookie pattern, enforced on all mutations (exempt: auth endpoints)
- **IDOR:** Team membership verified on submissions, notification ownership checked
- **Rate limiting:** Per-IP global (100/min), per-email login (10/15min), per-endpoint for public APIs
- **Input validation:** Bounded pagination, kills/placement/URL limits, min search length
- **WebSocket:** Per-IP connection limit (20), per-client subscription limit (50), origin validation
- **SSRF:** Webhook URL validation + DNS rebinding protection (custom DialContext)
- **Headers:** CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy
- **Cookies:** HttpOnly refresh token, Secure flag on HTTPS, SameSite=Strict
- **Passwords:** Random generation for imports (not NISN), bcrypt, lowercase requirement
- **Files:** EXIF metadata stripped, 0o600 permissions, MIME validation
- **Tokens:** Reset token consumed before update, refresh token ordering fix
- **JWT role:** Verified against DB (cached in Redis 60s)
- **DB:** Transactions for team creation, batch queries (no N+1)

## Features

- Single & double elimination brackets with auto-seed
- Battle royale lobbies with rotation
- Live scores via WebSocket
- CSV import/export of participants
- PDF credential cards per school (grouped by game/team, with logos)
- WhatsApp distribution with token+PIN secure download links
- Admin CRUD: users, teams, tournaments, schools, submissions
- Match submission with auto-verify
- Analytics dashboard with Redis caching

## Environment Variables

API env vars defined in `porjar-api/internal/config/`:
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL_MODE`
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — JWT signing key (min 32 chars in production)
- `JWT_ACCESS_EXPIRY` — Access token TTL (default: 2h)
- `JWT_REFRESH_EXPIRY` — Refresh token TTL (default: 168h/7 days)
- `PORT` — API port (default 9090)
- `CORS_ALLOWED_ORIGINS` — Comma-separated allowed origins
- `WS_MAX_CONNECTIONS` — Max WebSocket connections (default: 5000)

Web env vars:
- `NEXT_PUBLIC_API_URL` — API base URL
- `NEXT_PUBLIC_WS_URL` — WebSocket URL

## Important Notes

- **Docker container uses `air` for hot reload** — if Go build fails in container, old binary keeps running. Check `docker logs porjar-api` for build errors.
- **Slice append bug** — NEVER use `append(sharedSlice, handler)...` for Fiber route registration. It causes handler aliasing. Use explicit middleware params instead.
- **E2E tests with CSRF** — unauthenticated POST/PUT/DELETE tests accept both 401 and 403 (CSRF may reject before auth).
- **Schools data** — 132 schools, 104 with coach_phone. Phone numbers imported from PDF registration forms.
- **EventSettings** exists at `/event-settings` — can be used to make branding dynamic (currently PORJAR is hardcoded in some places).
