# Progress Tracker — PORJAR Denpasar Esport

## How to Use

- `[ ]` Not started
- `[~]` In progress
- `[x]` Done
- `[-]` Skipped / deferred

Update this file as you work. Add notes under each item if needed.

---

## Phase 0 — Foundation

### Documentation
- [x] System design
- [x] Layered architecture
- [x] Clean code practices
- [x] Shared components
- [x] Database schema
- [x] UI/UX design
- [x] API contract
- [x] Validation rules
- [x] Feature specifications
- [x] Error catalog
- [x] Testing strategy
- [x] Security
- [x] Environment & config
- [x] Progress tracker

### Project Setup
- [x] Init Go API project structure (Fiber)
- [x] Init Next.js 14+ web project (App Router)
- [x] Setup Docker + docker-compose (dev)
- [x] Setup PostgreSQL + Redis via Docker
- [x] Setup database migration tool (goose / golang-migrate)
- [x] Setup environment validation (caarlos0/env)
- [x] Setup logger (slog)
- [x] Setup response helper (pkg/response)
- [x] Setup error types (pkg/apperror)
- [x] Setup base router (Fiber)
- [x] Setup CORS middleware
- [x] Setup security headers middleware
- [x] Setup rate limiter middleware (Redis sliding window)
- [x] Setup WebSocket hub (gorilla/websocket)
- [x] Setup Nginx config (dev)
- [x] Install shadcn/ui base components
- [x] Install Phosphor Icons
- [x] Setup Zustand auth store
- [x] Setup API client (lib/api.ts)
- [x] Setup WebSocket client (lib/ws.ts)

---

## Phase 1 — Core (Week 1-2)

### Database
- [x] All 15 migrations written (0001-0015)
- [x] Seed file: games (5 records)
- [x] Seed file: schools (Denpasar SMP/SMA/SMK)
- [x] Seed file: default BR point rules
- [x] Seed file: test accounts (admin, superadmin, player)

### Auth (F-01)
- [x] POST /auth/register
- [x] POST /auth/login
- [x] POST /auth/refresh
- [x] POST /auth/logout
- [x] GET /auth/me
- [x] PUT /auth/me
- [x] POST /auth/forgot-password
- [x] POST /auth/reset-password
- [x] JWT middleware
- [x] Role middleware
- [x] Brute force protection (Redis)
- [x] Frontend: login page
- [x] Frontend: register page
- [x] Frontend: auth store + silent refresh
- [x] Frontend: protected routes middleware

### Games
- [x] GET /games
- [x] GET /games/:slug

### Team Management (F-02, F-03)
- [x] POST /teams
- [x] GET /teams
- [x] GET /teams/:id
- [x] PUT /teams/:id
- [x] POST /teams/:id/members
- [x] DELETE /teams/:id/members/:uid
- [x] GET /teams/my
- [x] Frontend: create team form
- [x] Frontend: team detail + member management
- [x] Frontend: my teams page

### Team Approval (F-03)
- [x] PUT /admin/teams/:id/approve
- [x] PUT /admin/teams/:id/reject
- [x] Frontend: team approval table (admin)

### Tournament Management (F-04)
- [x] POST /admin/tournaments
- [x] PUT /admin/tournaments/:id
- [x] DELETE /admin/tournaments/:id
- [x] GET /tournaments
- [x] GET /tournaments/:id
- [x] POST /tournaments/:id/register
- [x] GET /tournaments/:id/teams
- [x] Frontend: tournament list page
- [x] Frontend: tournament detail page
- [x] Frontend: admin tournament CRUD

### School Management (F-12)
- [x] POST /admin/schools
- [x] PUT /admin/schools/:id
- [x] GET /admin/schools
- [x] Frontend: school management (admin)

### Landing Page (F-14)
- [x] Frontend: hero section
- [x] Frontend: games grid
- [x] Frontend: public layout (navbar + footer)

---

## Phase 2 — Bracket & Live Score (Week 2-3)

### Bracket System (F-05)
- [x] Bracket generation: single elimination
- [x] Bracket generation: seeding logic
- [x] BYE handling
- [x] POST /admin/tournaments/:id/generate-bracket
- [x] GET /tournaments/:id/bracket
- [x] Frontend: interactive bracket view (SVG)
- [x] Frontend: bracket controls (zoom, pan, search)

### Live Score (F-06)
- [x] WebSocket hub implementation
- [x] PUT /admin/matches/:id/status
- [x] PUT /admin/matches/:id/score
- [x] PUT /admin/matches/:id/games/:gn
- [x] POST /admin/matches/:id/complete
- [x] Match completion -> auto-advance winner
- [x] GET /matches/:id
- [x] GET /matches/live
- [x] Frontend: live score cards
- [x] Frontend: match detail page
- [x] Frontend: admin score input panel
- [x] Frontend: WebSocket integration (real-time updates)

### Battle Royale (F-07)
- [x] POST /admin/lobbies
- [x] PUT /admin/lobbies/:id
- [x] PUT /admin/lobbies/:id/status
- [x] POST /admin/lobbies/:id/results
- [x] Point calculation service
- [x] GET /lobbies/:id
- [x] GET /tournaments/:id/lobbies
- [x] Frontend: BR result input (admin)
- [x] Frontend: BR leaderboard

### Standings (F-08)
- [x] Standings service: bracket
- [x] Standings service: battle royale
- [x] GET /tournaments/:id/standings
- [x] Frontend: standings/leaderboard page

---

## Phase 3 — Schedule & Polish (Week 3-4)

### Schedule (F-09)
- [x] POST /admin/schedules
- [x] PUT /admin/schedules/:id
- [x] DELETE /admin/schedules/:id
- [x] GET /schedules
- [x] GET /schedules/today
- [x] GET /schedules/upcoming
- [x] Frontend: schedule timeline page
- [x] Frontend: admin schedule management

### Admin Dashboard (F-10)
- [x] Frontend: stat cards (teams, tournaments, live)
- [x] Frontend: quick actions
- [x] Frontend: activity log widget
- [x] Frontend: admin sidebar navigation

### Player Dashboard (F-11)
- [x] Frontend: my teams overview
- [x] Frontend: upcoming matches
- [x] Frontend: profile edit

### User Management (F-13)
- [x] GET /admin/users
- [x] PUT /admin/users/:id/role
- [x] Frontend: user list + role management (superadmin)

### Double Elimination (advanced)
- [x] Double elimination bracket generation
- [x] Losers bracket linking
- [x] Frontend: double elim bracket view

### File Upload
- [x] POST /upload
- [x] Team logo upload
- [x] Avatar upload

---

## Phase 4 — Deploy & Testing (Week 4)

### Testing
- [~] Service layer unit tests: bracket generation
- [~] Service layer unit tests: BR point calculation
- [~] Service layer unit tests: match completion + advancement
- [~] API integration tests: auth flow
- [~] API integration tests: score input flow
- [~] E2E test: player registration -> team creation -> tournament registration
- [~] E2E test: admin bracket management -> score input -> match completion
- [~] E2E test: admin BR lobby -> result input -> leaderboard update

### Deployment
- [x] Dockerfile (API)
- [x] Dockerfile (web)
- [x] docker-compose.prod.yml
- [x] Nginx configuration
- [ ] SSL certificate (Let's Encrypt)
- [ ] Domain DNS setup
- [ ] Run migrations on production
- [ ] Seed production data (games, schools)
- [ ] Create admin + superadmin accounts
- [x] Health check endpoint
- [ ] Verify WebSocket works through Nginx

### Final QA
- [ ] Mobile responsive check (all pages)
- [ ] WebSocket reconnection on network drop
- [ ] Bracket view renders 16+ teams correctly
- [ ] BR leaderboard real-time update verified
- [ ] Rate limiting verified
- [ ] Security headers verified
- [ ] No test credentials in production

---

## Bugs & Issues

> Log bugs here as they come up during development.

| # | Description | Status | Notes |
|---|---|---|---|
| -- | -- | -- | -- |

---

## Notes

- BR point rules seeded per tournament, not global
- Bracket generation pads to nearest power of 2 with BYEs
- WebSocket is read-only for public users, admin sends updates via REST API
- File uploads stored locally on VPS, not cloud storage (MVP scope)
- Double elimination is Phase 3 stretch goal — single elimination first
