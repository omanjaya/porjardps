# Layered Architecture — PORJAR Denpasar Esport

## Overview

PORJAR follows a clean separation between frontend, API, and data layers. The Go backend uses a layered architecture pattern. The Next.js frontend communicates via HTTP REST API and WebSocket for real-time updates.

---

## High-Level Architecture

```
+---------------------------+
|        Next.js 14+        |
|  (Frontend + SSR Layer)   |
|  Pages, Components, Hooks |
+---------------------------+
             |
     REST API (JSON) + WebSocket
             |
+---------------------------+
|      Go API Server        |
|  +-----------------------+|
|  |    Handler Layer      ||   <- HTTP handlers, request parsing, response formatting
|  +-----------------------+|
|  |    Service Layer      ||   <- Business logic, bracket generation, point calculation
|  +-----------------------+|
|  |   Repository Layer    ||   <- Database queries, data access abstraction
|  +-----------------------+|
|  |    Model Layer        ||   <- Structs, interfaces, error types
|  +-----------------------+|
|  |   WebSocket Hub       ||   <- Connection manager, broadcast, rooms
|  +-----------------------+|
+---------------------------+
             |
+---------------------------+
|       PostgreSQL 15       |
|  (single database)        |
+---------------------------+
             |
+---------------------------+
|          Redis 7          |
|  (sessions, rate limit,   |
|   WebSocket pub/sub)      |
+---------------------------+
```

---

## Go Backend — Project Structure

```
porjar-api/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point
├── internal/
│   ├── config/
│   │   └── config.go               # Env vars, DB config
│   ├── middleware/
│   │   ├── auth.go                  # JWT middleware
│   │   ├── cors.go
│   │   ├── ratelimit.go             # Rate limiting
│   │   └── logger.go
│   ├── handler/                     # HTTP layer
│   │   ├── auth_handler.go
│   │   ├── game_handler.go
│   │   ├── team_handler.go
│   │   ├── tournament_handler.go
│   │   ├── bracket_handler.go
│   │   ├── battle_royale_handler.go
│   │   ├── schedule_handler.go
│   │   ├── admin_handler.go
│   │   └── websocket_handler.go
│   ├── service/                     # Business logic
│   │   ├── auth_service.go
│   │   ├── team_service.go
│   │   ├── tournament_service.go
│   │   ├── bracket_service.go       # Bracket generation & advancement
│   │   ├── br_service.go            # Battle royale point calculation
│   │   ├── standings_service.go
│   │   └── schedule_service.go
│   ├── repository/                  # Data access
│   │   ├── user_repo.go
│   │   ├── team_repo.go
│   │   ├── tournament_repo.go
│   │   ├── bracket_repo.go
│   │   ├── br_repo.go
│   │   ├── standings_repo.go
│   │   └── schedule_repo.go
│   ├── model/                       # Data models/structs
│   │   ├── user.go
│   │   ├── team.go
│   │   ├── tournament.go
│   │   ├── bracket.go
│   │   ├── battle_royale.go
│   │   └── schedule.go
│   ├── ws/                          # WebSocket hub
│   │   ├── hub.go                   # Connection manager
│   │   ├── client.go
│   │   └── message.go
│   └── pkg/
│       ├── response/                # Standard API response
│       ├── validator/               # Input validation
│       └── bracket/
│           ├── single_elim.go       # Generate single elimination bracket
│           ├── double_elim.go       # Generate double elimination bracket
│           ├── round_robin.go       # Generate round robin schedule
│           └── seeding.go           # Seeding logic
├── migrations/                      # SQL migration files
├── scripts/
│   └── seed.go                      # Seed data (schools, games)
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── go.mod
```

---

## Layer Responsibilities

### Model Layer

Pure Go structs. No dependencies on frameworks or databases.

```go
// internal/model/team.go
type Team struct {
    ID            uuid.UUID
    Name          string
    SchoolID      uuid.UUID
    GameID        uuid.UUID
    CaptainUserID uuid.UUID
    LogoURL       string
    Status        string
    Seed          int
    CreatedAt     time.Time
}

type TeamRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*Team, error)
    FindByGame(ctx context.Context, gameID uuid.UUID, filter TeamFilter) ([]*Team, Pagination, error)
    Save(ctx context.Context, t *Team) error
    UpdateStatus(ctx context.Context, id uuid.UUID, status string) error
}
```

### Repository Layer

Implements model repository interfaces. All SQL lives here.

```go
// internal/repository/team_repo.go
type teamRepo struct {
    db *pgxpool.Pool
}

func (r *teamRepo) FindByID(ctx context.Context, id uuid.UUID) (*model.Team, error) {
    row := r.db.QueryRow(ctx,
        `SELECT id, name, school_id, game_id, captain_user_id, logo_url, status, seed, created_at
         FROM teams WHERE id = $1`, id)
    // scan and return
}
```

### Service Layer

Orchestrates repositories. Contains business rules.

```go
// internal/service/bracket_service.go
type BracketService struct {
    bracketRepo  model.BracketRepository
    teamRepo     model.TeamRepository
    standingsRepo model.StandingsRepository
    wsHub        *ws.Hub
}

func (s *BracketService) CompleteMatch(ctx context.Context, matchID uuid.UUID, winnerID uuid.UUID) error {
    // 1. Validate match exists and is live
    // 2. Set winner_id, loser_id, status = completed
    // 3. Advance winner to next_match
    // 4. Update standings
    // 5. Broadcast via WebSocket
    // 6. Check if tournament is complete
}
```

### Handler Layer

Parses HTTP request, calls service, formats response.

```go
// internal/handler/bracket_handler.go
func (h *BracketHandler) CompleteMatch(c *fiber.Ctx) error {
    matchID, err := uuid.Parse(c.Params("id"))
    if err != nil {
        return response.BadRequest(c, "invalid match ID")
    }

    var req CompleteMatchRequest
    if err := c.BodyParser(&req); err != nil {
        return response.BadRequest(c, err.Error())
    }

    if err := h.service.CompleteMatch(c.Context(), matchID, req.WinnerID); err != nil {
        return response.HandleError(c, err)
    }

    return response.OK(c, nil)
}
```

---

## Next.js Frontend — Structure

```
porjar-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── games/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── tournaments/
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── bracket/page.tsx
│   │   │       ├── standings/page.tsx
│   │   │       └── schedule/page.tsx
│   │   ├── matches/
│   │   │   ├── live/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── teams/
│   │   │   └── [id]/page.tsx
│   │   ├── schedule/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   ├── teams/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── create/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── profile/page.tsx
│   │   └── admin/
│   │       ├── page.tsx
│   │       ├── tournaments/
│   │       │   └── [id]/
│   │       │       ├── page.tsx
│   │       │       ├── bracket/page.tsx
│   │       │       └── lobbies/page.tsx
│   │       ├── teams/page.tsx
│   │       ├── schedules/page.tsx
│   │       ├── schools/page.tsx
│   │       ├── users/page.tsx
│   │       └── live/page.tsx               # Live score input panel
│   ├── components/
│   │   ├── ui/                             # shadcn/ui base components
│   │   ├── shared/                         # Reusable app components
│   │   │   ├── PageHeader/
│   │   │   ├── GameSelector/
│   │   │   ├── LiveBadge/
│   │   │   ├── CountdownTimer/
│   │   │   ├── SearchInput/
│   │   │   ├── EmptyState/
│   │   │   └── ConfirmDialog/
│   │   └── modules/                        # Feature-specific components
│   │       ├── bracket/
│   │       │   ├── BracketView.tsx
│   │       │   ├── MatchNode.tsx
│   │       │   └── BracketControls.tsx
│   │       ├── battle-royale/
│   │       │   ├── BRLeaderboard.tsx
│   │       │   └── LobbyResultTable.tsx
│   │       ├── match/
│   │       │   ├── LiveScoreCard.tsx
│   │       │   ├── MatchDetail.tsx
│   │       │   └── BOSeriesScore.tsx
│   │       ├── schedule/
│   │       │   └── ScheduleTimeline.tsx
│   │       ├── team/
│   │       │   ├── TeamCard.tsx
│   │       │   └── TeamMemberList.tsx
│   │       └── admin/
│   │           ├── AdminScoreInput.tsx
│   │           ├── BRResultInput.tsx
│   │           ├── TeamApprovalTable.tsx
│   │           └── BracketManager.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useAuth.ts
│   │   └── useTournament.ts
│   ├── lib/
│   │   ├── api.ts                          # Fetch wrapper with auth
│   │   ├── ws.ts                           # WebSocket client
│   │   └── utils.ts
│   ├── store/
│   │   └── auth-store.ts                   # Zustand auth store
│   └── types/
│       └── index.ts                        # TypeScript interfaces
├── public/
│   ├── images/
│   │   ├── games/                          # Game icons
│   │   └── logo/                           # Porjar logo
│   └── fonts/
├── tailwind.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## Request Lifecycle (REST API)

```
Browser
  -> Next.js page (SSR or client)
    -> lib/api.ts (fetch wrapper)
      -> Go API /api/v1/tournaments/:id/bracket
        -> Middleware (auth, CORS, rate limit)
          -> Handler (parse request, validate input)
            -> Service (business logic)
              -> Repository (SQL query)
                -> PostgreSQL
              <- Repository (model struct)
            <- Service
          <- Handler (format response)
        <- Go API (JSON response)
      <- lib/api
    <- Next.js (render with data)
  <- Browser
```

---

## Authentication Flow

```
User submits login form
  -> POST /api/v1/auth/login
    -> Validate credentials against DB
    -> Generate Access Token (JWT, 15 min)
    -> Generate Refresh Token (opaque, 7 days, stored in Redis)
    -> Return tokens
  -> Frontend stores:
      Access Token  -> memory (Zustand store)
      Refresh Token -> httpOnly cookie
  -> Every API request includes Authorization: Bearer <token>
  -> On 401 -> auto-refresh via /api/v1/auth/refresh
```

---

## WebSocket Flow

```
Client connects
  -> WS /ws/live-scores
    -> Hub registers client
    -> Client subscribes to channels:
       "tournament:{id}" — all updates for a tournament
       "match:{id}" — specific match updates

Admin updates score
  -> PUT /api/v1/admin/matches/:id/score
    -> Service updates DB
    -> Service calls Hub.Broadcast()
      -> Hub sends to all subscribed clients:
         {
           "type": "score_update",
           "data": { match_id, scores, status, ... }
         }
    -> All connected browsers update in real-time
```

WebSocket message types:

| Type | Trigger | Data |
|---|---|---|
| `score_update` | Admin updates bracket match score | Match ID, team scores, game number, status |
| `match_status` | Match status changes (pending -> live -> completed) | Match ID, new status |
| `bracket_advance` | Winner advances to next round | Match ID, next match ID, team info |
| `br_result_update` | Admin inputs BR lobby results | Lobby ID, team placements, points |
| `standings_update` | Standings recalculated | Tournament ID, updated rankings |

---

## Bracket Generation Flow

```
Admin triggers "Generate Bracket"
  -> POST /api/v1/admin/tournaments/:id/generate-bracket
    -> Service: BracketService.GenerateBracket()
      -> 1. Fetch all approved teams for tournament
      -> 2. Apply seeding (manual seed or random)
      -> 3. Pad to nearest power of 2 (add BYEs)
      -> 4. Generate bracket_matches for all rounds
      -> 5. Link next_match_id for winner advancement
      -> 6. Auto-advance BYE matches
      -> 7. Return complete bracket structure
    -> Response: bracket tree with all matches

Single Elimination (8 teams):
  Round 1 (4 matches) -> Round 2 (2 matches) -> Final (1 match)

  Match 1: Seed 1 vs Seed 8  ─┐
                               ├─ Match 5 ─┐
  Match 2: Seed 4 vs Seed 5  ─┘            │
                                            ├─ Match 7 (Final)
  Match 3: Seed 2 vs Seed 7  ─┐            │
                               ├─ Match 6 ─┘
  Match 4: Seed 3 vs Seed 6  ─┘
```

---

## Battle Royale Point Flow

```
Admin creates lobby
  -> POST /api/v1/admin/lobbies
    -> Lobby with room_id, password, scheduled time

Match completes, admin inputs results
  -> POST /api/v1/admin/lobbies/:id/results
    -> Payload: [{ team_id, placement, kills }, ...]
    -> Service: BRService.InputResults()
      -> 1. Fetch point rules for tournament
      -> 2. For each team:
           placement_points = rules[placement]
           kill_points = kills * point_per_kill
           total_points = placement_points + kill_points
      -> 3. Save br_lobby_results
      -> 4. Recalculate cumulative standings
      -> 5. Update rank_position (ORDER BY total_points DESC, total_kills DESC)
      -> 6. Broadcast leaderboard update via WebSocket
```

---

## Error Flow

```
Handler receives request
  -> Validate input format
    -> FAIL: return 400 with validation errors
  -> Call service
    -> Service validates business rules
      -> FAIL: return domain error (ErrTeamFull, ErrMatchNotLive, etc.)
    -> Service calls repository
      -> Repository executes query
        -> FAIL: return wrapped error with context
      -> Repository returns result
    -> Service returns result
  -> Handler maps error to HTTP response:
     domain.ErrNotFound      -> 404
     domain.ErrUnauthorized  -> 401
     domain.ErrForbidden     -> 403
     domain.ErrConflict      -> 409
     domain.ErrValidation    -> 422
     unexpected error        -> 500
```
