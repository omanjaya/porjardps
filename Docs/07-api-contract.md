# API Contract — PORJAR Denpasar Esport

## Base URL

```
Production : https://esport.porjar-denpasar.id/api/v1
Development: http://localhost:8080/api/v1
```

---

## Global Conventions

### Request Headers

```
Authorization : Bearer <access_token>     (required on protected routes)
Content-Type  : application/json
```

### Response Envelope

All responses follow this structure:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": null
}
```

Paginated responses include `meta`:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 143,
    "total_pages": 8
  }
}
```

### HTTP Status Codes

| Code | Usage |
|---|---|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No content (DELETE) |
| 400 | Bad request / validation error |
| 401 | Unauthenticated |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable entity (business rule violation) |
| 500 | Internal server error |

### Pagination Query Params

```
GET /teams?page=1&per_page=20&sort=name&order=asc
```

---

## Auth

### POST /auth/register

```json
// Request
{
  "email": "budi@sman1denpasar.sch.id",
  "password": "Secret123",
  "full_name": "Budi Santoso",
  "phone": "081234567890"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "budi@sman1denpasar.sch.id",
    "full_name": "Budi Santoso",
    "role": "player"
  }
}
```

### POST /auth/login

```json
// Request
{
  "email": "budi@sman1denpasar.sch.id",
  "password": "Secret123"
}

// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "rt_abc123",
    "expires_in": 900,
    "user": {
      "id": "uuid",
      "email": "budi@sman1denpasar.sch.id",
      "role": "player",
      "full_name": "Budi Santoso"
    }
  }
}
```

### POST /auth/refresh

```json
// Request
{
  "refresh_token": "rt_abc123"
}

// Response 200
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "expires_in": 900
  }
}
```

### POST /auth/logout

```json
// Request
{
  "refresh_token": "rt_abc123"
}

// Response 204 (no body)
```

### GET /auth/me

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "budi@sman1denpasar.sch.id",
    "role": "player",
    "full_name": "Budi Santoso",
    "phone": "081234567890",
    "avatar_url": null
  }
}
```

### PUT /auth/me

```json
// Request
{
  "full_name": "Budi Santoso Updated",
  "phone": "081234567891",
  "avatar_url": "https://..."
}

// Response 200
{ "success": true, "data": { "id": "uuid", ... } }
```

### POST /auth/forgot-password

```json
// Request
{ "email": "budi@sman1denpasar.sch.id" }

// Response 200
{ "success": true, "data": null }
// Always 200 to prevent email enumeration
```

### POST /auth/reset-password

```json
// Request
{
  "token": "reset_token_from_email",
  "new_password": "NewSecret123"
}

// Response 200
{ "success": true, "data": null }
```

---

## Games

### GET /games

Access: public

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Mobile Legends: Bang Bang",
      "slug": "ml",
      "game_type": "bracket",
      "min_team_members": 5,
      "max_team_members": 5,
      "max_substitutes": 1,
      "icon_url": "/images/games/ml.png",
      "is_active": true,
      "active_tournaments": 2
    }
  ]
}
```

### GET /games/:slug

Access: public

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Mobile Legends: Bang Bang",
    "slug": "ml",
    "game_type": "bracket",
    "min_team_members": 5,
    "max_team_members": 5,
    "max_substitutes": 1,
    "icon_url": "/images/games/ml.png",
    "rules_url": "https://...",
    "tournaments": [
      {
        "id": "uuid",
        "name": "ML Single Elimination - Porjar 2026",
        "format": "single_elimination",
        "status": "ongoing",
        "team_count": 16
      }
    ]
  }
}
```

---

## Teams

### POST /teams

Access: `player`

```json
// Request
{
  "name": "SMAN 1 Warriors",
  "game_id": "uuid",
  "school_id": "uuid"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "SMAN 1 Warriors",
    "status": "pending",
    "captain_user_id": "uuid"
  }
}
// Creator auto-becomes captain
```

### GET /teams

Access: public

Query: `game_id`, `school_id`, `status`, `search`, `page`, `per_page`

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "SMAN 1 Warriors",
      "school": { "id": "uuid", "name": "SMA Negeri 1 Denpasar", "level": "SMA" },
      "game": { "id": "uuid", "slug": "ml", "name": "Mobile Legends" },
      "captain": { "id": "uuid", "full_name": "Budi Santoso" },
      "member_count": 5,
      "status": "approved",
      "logo_url": null
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 48, "total_pages": 3 }
}
```

### GET /teams/:id

Access: public

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "SMAN 1 Warriors",
    "school": { "id": "uuid", "name": "SMA Negeri 1 Denpasar" },
    "game": { "id": "uuid", "slug": "ml", "name": "Mobile Legends" },
    "status": "approved",
    "seed": 1,
    "logo_url": null,
    "members": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "full_name": "Budi Santoso",
        "in_game_name": "BudiML",
        "in_game_id": "12345",
        "role": "captain",
        "jersey_number": 1
      }
    ],
    "tournaments": [
      { "id": "uuid", "name": "ML Single Elim", "status": "ongoing" }
    ]
  }
}
```

### PUT /teams/:id

Access: `captain` (owner), `admin`

```json
// Request
{
  "name": "SMAN 1 Warriors v2",
  "logo_url": "https://..."
}
```

### POST /teams/:id/members

Access: `captain` (owner)

```json
// Request
{
  "user_id": "uuid",
  "in_game_name": "AgusGG",
  "in_game_id": "67890",
  "role": "member",
  "jersey_number": 2
}

// Response 201
{ "success": true, "data": { "id": "uuid" } }

// Possible errors:
// 422 TEAM_FULL — max members reached
// 409 MEMBER_ALREADY_IN_TEAM — user already in team
```

### DELETE /teams/:id/members/:uid

Access: `captain` (owner), `admin`

Response: 204

### GET /teams/my

Access: authenticated

Returns all teams the current user belongs to.

---

## Tournaments

### GET /tournaments

Access: public

Query: `game_id`, `status`, `page`, `per_page`

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "game": { "id": "uuid", "slug": "ml", "name": "Mobile Legends" },
      "name": "ML Single Elimination - Porjar 2026",
      "format": "single_elimination",
      "stage": "main",
      "best_of": 3,
      "max_teams": 16,
      "status": "ongoing",
      "start_date": "2026-03-20T00:00:00Z",
      "end_date": "2026-03-25T00:00:00Z",
      "team_count": 16
    }
  ]
}
```

### GET /tournaments/:id

Access: public

Full detail including rules text, registration dates, etc.

### POST /tournaments/:id/register

Access: `player` (captain only)

```json
// Request
{
  "team_id": "uuid"
}

// Response 201
{ "success": true, "data": { "id": "uuid" } }

// Possible errors:
// 422 TEAM_NOT_APPROVED — team status not approved
// 422 TEAM_INSUFFICIENT_MEMBERS — not enough players
// 422 REGISTRATION_CLOSED — past registration deadline
// 422 TOURNAMENT_FULL — max teams reached
// 409 TEAM_ALREADY_REGISTERED — duplicate registration
```

### GET /tournaments/:id/teams

Access: public

### GET /tournaments/:id/bracket

Access: public

```json
// Response 200
{
  "success": true,
  "data": {
    "tournament_id": "uuid",
    "format": "single_elimination",
    "total_rounds": 4,
    "matches": [
      {
        "id": "uuid",
        "round": 1,
        "match_number": 1,
        "bracket_position": "winners",
        "team_a": { "id": "uuid", "name": "SMAN 1 Warriors", "seed": 1, "logo_url": null },
        "team_b": { "id": "uuid", "name": "SMKN 3 Team", "seed": 16, "logo_url": null },
        "score_a": 2,
        "score_b": 1,
        "winner": { "id": "uuid", "name": "SMAN 1 Warriors" },
        "status": "completed",
        "scheduled_at": "2026-03-20T10:00:00Z",
        "next_match_id": "uuid",
        "best_of": 3
      }
    ]
  }
}
```

### GET /tournaments/:id/standings

Access: public

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "rank_position": 1,
      "team": { "id": "uuid", "name": "SMAN 1 Denpasar", "logo_url": null },
      "matches_played": 5,
      "wins": 4,
      "losses": 1,
      "total_points": 87,
      "total_kills": 32,
      "total_placement_points": 55,
      "best_placement": 1,
      "avg_placement": 2.3,
      "is_eliminated": false
    }
  ]
}
```

### GET /tournaments/:id/schedule

Access: public

---

## Bracket Matches

### GET /matches/:id

Access: public

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "tournament": { "id": "uuid", "name": "ML Single Elim" },
    "game": { "slug": "ml", "name": "Mobile Legends" },
    "round": 2,
    "match_number": 1,
    "team_a": { "id": "uuid", "name": "SMAN 1 Warriors", "logo_url": null },
    "team_b": { "id": "uuid", "name": "SMKN 3 Team", "logo_url": null },
    "score_a": 2,
    "score_b": 1,
    "status": "completed",
    "best_of": 3,
    "games": [
      { "game_number": 1, "score_a": 1, "score_b": 0, "winner_id": "uuid", "duration_minutes": 18, "mvp": "BudiML" },
      { "game_number": 2, "score_a": 0, "score_b": 1, "winner_id": "uuid", "duration_minutes": 22, "mvp": "AgusGG" },
      { "game_number": 3, "score_a": 1, "score_b": 0, "winner_id": "uuid", "duration_minutes": 15, "mvp": "BudiML" }
    ],
    "scheduled_at": "2026-03-20T10:00:00Z",
    "started_at": "2026-03-20T10:05:00Z",
    "completed_at": "2026-03-20T11:15:00Z",
    "stream_url": null
  }
}
```

### GET /matches/live

Access: public

Returns all matches with `status = 'live'`.

---

## Battle Royale Lobbies

### GET /lobbies/:id

Access: public (room_id/password only visible to registered teams)

```json
// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "tournament": { "id": "uuid", "name": "FF Battle Royale - Porjar 2026" },
    "lobby_name": "Lobby 1 Day 1",
    "lobby_number": 1,
    "day_number": 1,
    "status": "completed",
    "scheduled_at": "2026-03-20T10:00:00Z",
    "results": [
      {
        "team": { "id": "uuid", "name": "SMAN 1 Denpasar" },
        "placement": 1,
        "kills": 12,
        "placement_points": 15,
        "kill_points": 12,
        "total_points": 27
      }
    ]
  }
}
```

### GET /tournaments/:id/lobbies

Access: public

---

## Schedule

### GET /schedules

Access: public

Query: `date`, `game_id`, `tournament_id`, `status`, `page`, `per_page`

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "ML Semifinal 1 - SMAN 1 vs SMAN 4",
      "tournament": { "id": "uuid", "name": "ML Single Elim" },
      "game": { "slug": "ml", "name": "Mobile Legends" },
      "scheduled_at": "2026-03-22T14:00:00Z",
      "end_at": "2026-03-22T16:00:00Z",
      "venue": "Online",
      "status": "upcoming",
      "bracket_match_id": "uuid",
      "br_lobby_id": null
    }
  ]
}
```

### GET /schedules/today

Access: public

### GET /schedules/upcoming

Access: public

Query: `limit` (default 5)

---

## Admin — Tournament Management

### POST /admin/tournaments

Access: `admin`, `superadmin`

```json
// Request
{
  "game_id": "uuid",
  "name": "ML Single Elimination - Porjar 2026",
  "format": "single_elimination",
  "stage": "main",
  "best_of": 3,
  "max_teams": 16,
  "registration_start": "2026-03-10T00:00:00Z",
  "registration_end": "2026-03-18T23:59:59Z",
  "start_date": "2026-03-20T00:00:00Z",
  "end_date": "2026-03-25T00:00:00Z",
  "rules": "Peraturan turnamen..."
}

// Response 201
{ "success": true, "data": { "id": "uuid" } }
```

### PUT /admin/tournaments/:id

Access: `admin`, `superadmin`

### DELETE /admin/tournaments/:id

Access: `superadmin`

### POST /admin/tournaments/:id/generate-bracket

Access: `admin`, `superadmin`

```json
// Request (optional seeding override)
{
  "seeding": [
    { "team_id": "uuid", "seed": 1 },
    { "team_id": "uuid", "seed": 2 }
  ]
}

// Response 201
{
  "success": true,
  "data": {
    "matches_created": 15,
    "total_rounds": 4,
    "byes": 0
  }
}

// Possible errors:
// 422 BRACKET_ALREADY_GENERATED — bracket exists, must delete first
// 422 INSUFFICIENT_TEAMS — less than 2 approved teams
```

---

## Admin — Team Approval

### PUT /admin/teams/:id/approve

Access: `admin`, `superadmin`

```json
// Response 200
{ "success": true, "data": { "id": "uuid", "status": "approved" } }
```

### PUT /admin/teams/:id/reject

Access: `admin`, `superadmin`

```json
// Request
{ "reason": "Nama tim tidak sesuai ketentuan" }

// Response 200
{ "success": true, "data": { "id": "uuid", "status": "rejected" } }
```

---

## Admin — Score Input (Live)

### PUT /admin/matches/:id/status

Access: `admin`, `superadmin`

```json
// Request
{ "status": "live" }

// Response 200
{ "success": true, "data": { "id": "uuid", "status": "live" } }
// Triggers WebSocket broadcast: match_status
```

### PUT /admin/matches/:id/score

Access: `admin`, `superadmin`

```json
// Request
{
  "score_a": 2,
  "score_b": 1
}

// Response 200
{ "success": true, "data": { "id": "uuid", "score_a": 2, "score_b": 1 } }
// Triggers WebSocket broadcast: score_update
```

### PUT /admin/matches/:id/games/:game_number

Access: `admin`, `superadmin`

```json
// Request
{
  "winner_id": "uuid",
  "score_a": 13,
  "score_b": 8,
  "duration_minutes": 18,
  "mvp_user_id": "uuid",
  "map_name": "Twisted Treeline",
  "hero_bans": {
    "team_a": ["Fanny", "Ling"],
    "team_b": ["Lancelot", "Hayabusa"]
  }
}

// Response 200
{ "success": true, "data": { ... } }
// Triggers WebSocket broadcast: score_update
```

### POST /admin/matches/:id/complete

Access: `admin`, `superadmin`

```json
// Request
{
  "winner_id": "uuid"
}

// Response 200
{
  "success": true,
  "data": {
    "match_id": "uuid",
    "winner_id": "uuid",
    "next_match_id": "uuid",
    "advanced": true
  }
}
// Triggers WebSocket broadcast: bracket_advance + standings_update

// Possible errors:
// 422 MATCH_NOT_LIVE — match must be live to complete
// 422 INVALID_WINNER — winner must be team_a or team_b
// 422 SCORE_MISMATCH — winner score must be higher
```

---

## Admin — Battle Royale

### POST /admin/lobbies

Access: `admin`, `superadmin`

```json
// Request
{
  "tournament_id": "uuid",
  "lobby_name": "Lobby 1 Day 1",
  "lobby_number": 1,
  "day_number": 1,
  "room_id": "CUSTOM123",
  "room_password": "pass456",
  "scheduled_at": "2026-03-20T10:00:00Z"
}

// Response 201
{ "success": true, "data": { "id": "uuid" } }
```

### PUT /admin/lobbies/:id/status

Access: `admin`, `superadmin`

```json
// Request
{ "status": "live" }
```

### POST /admin/lobbies/:id/results

Access: `admin`, `superadmin`

```json
// Request
{
  "results": [
    { "team_id": "uuid", "placement": 1, "kills": 12 },
    { "team_id": "uuid", "placement": 2, "kills": 8 },
    { "team_id": "uuid", "placement": 3, "kills": 6 }
  ]
}

// Response 201
{
  "success": true,
  "data": {
    "lobby_id": "uuid",
    "results_count": 12,
    "standings_updated": true
  }
}
// Triggers WebSocket broadcast: br_result_update + standings_update
```

---

## Admin — Schedule

### POST /admin/schedules

Access: `admin`, `superadmin`

```json
// Request
{
  "tournament_id": "uuid",
  "bracket_match_id": "uuid",
  "title": "ML Semifinal 1 - SMAN 1 vs SMAN 4",
  "venue": "Online",
  "scheduled_at": "2026-03-22T14:00:00Z",
  "end_at": "2026-03-22T16:00:00Z"
}
```

### PUT /admin/schedules/:id

Access: `admin`, `superadmin`

### DELETE /admin/schedules/:id

Access: `admin`, `superadmin`

---

## Admin — Schools

### GET /admin/schools

Access: `admin`, `superadmin`

Query: `level`, `search`, `page`, `per_page`

### POST /admin/schools

Access: `admin`, `superadmin`

```json
// Request
{
  "name": "SMA Negeri 1 Denpasar",
  "level": "SMA",
  "address": "Jl. Kamboja No. 1, Denpasar"
}
```

### PUT /admin/schools/:id

Access: `admin`, `superadmin`

---

## Admin — Users

### GET /admin/users

Access: `superadmin`

Query: `role`, `search`, `page`, `per_page`

### PUT /admin/users/:id/role

Access: `superadmin`

```json
// Request
{ "role": "admin" }

// Possible errors:
// 422 CANNOT_CHANGE_OWN_ROLE
```

---

## WebSocket

### WS /ws/live-scores

Subscribe to all live score updates.

### WS /ws/matches/:id

Subscribe to a specific match.

**Message format documented in 02-architecture.md**

---

## File Upload

### POST /upload

Access: authenticated

```
Content-Type: multipart/form-data
Field: file (max 5MB)
Allowed types: image/jpeg, image/png, image/webp
```

```json
// Response 201
{
  "success": true,
  "data": {
    "url": "https://esport.porjar-denpasar.id/uploads/uuid.jpg",
    "filename": "uuid.jpg",
    "size": 204800,
    "mime_type": "image/jpeg"
  }
}
```
