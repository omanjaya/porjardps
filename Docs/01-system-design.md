# System Design — PORJAR Denpasar Esport

## Overview

PORJAR Denpasar Esport is a tournament management platform built for Pekan Olahraga Pelajar (Porjar) Kota Denpasar. It handles the complete tournament lifecycle: team registration, bracket generation, live score updates, leaderboard calculations, and schedule management across 5 esport titles.

The platform serves three user groups: players/students who register and track their matches, administrators who manage tournaments and input scores, and spectators who view live results and standings.

---

## Goals

- Provide end-to-end tournament management for 5 esport games
- Support two distinct competition formats: bracket-based (MOBA/fighting) and battle royale (point system)
- Deliver real-time score updates via WebSocket to all connected viewers
- Enable admin to efficiently manage brackets, input scores, and publish results
- Handle ~5000 registered users with traffic spikes during live matches
- Deploy within 1 month on a single VPS instance

---

## Deployment Model

Single-instance deployment on a VPS:

```
VPS (Ubuntu 22.04)
├── Nginx (reverse proxy + SSL termination)
├── Docker Container: porjar-api
│   └── Go (Fiber) API server + WebSocket hub
├── Docker Container: porjar-web
│   └── Next.js (frontend + SSR)
├── Docker Container: PostgreSQL 15
│   └── Single database: porjar
└── Docker Container: Redis 7
    └── Session store, WebSocket pub/sub, rate limit counters
```

Domain setup:

```
esport.porjar-denpasar.id → Nginx → porjar-web (port 3000) + porjar-api (port 8080)
```

SSL provisioned via Let's Encrypt (Certbot).

---

## System Boundaries

```
                    PUBLIC
                      |
          +-----------+-----------+
          |                       |
    [Public Pages]          [Auth Gateway]
    Landing, Games,          /login
    Bracket, Standings,      /register
    Schedule, Live Score     /refresh
                                |
                     +----------+----------+
                     |          |          |
              [Player Dash] [API]    [Admin Panel]
              (Next.js)    (Go)     (Next.js)
                     |
               [PostgreSQL]
                     |
                  [Redis]
                     |
              [WebSocket Hub]
```

---

## User Roles

| Role | Access Area |
|---|---|
| Player | Register, create/join team, view bracket & standings, personal dashboard |
| Admin | Tournament management, team approval, score input, schedule management |
| Superadmin | All admin access + user role management, system configuration |

---

## Key Technical Decisions

| Concern | Decision | Reason |
|---|---|---|
| Backend language | Go (Golang) with Fiber | High performance, low memory, excellent concurrency for WebSocket |
| Frontend | Next.js 14+ (App Router) | SSR for public pages (SEO), strong React ecosystem |
| UI library | shadcn/ui + Tailwind CSS | Fully customizable, dark theme support, no vendor lock-in |
| Database | PostgreSQL 15+ | Relational, JSONB for flexible data (hero bans, match details) |
| Real-time | WebSocket (gorilla/websocket) | Native Go support, no external dependency, bi-directional communication |
| Auth | Custom JWT | Full control, no third-party dependency, access + refresh token pattern |
| Cache | Redis | Session store, rate limiting, WebSocket pub/sub for horizontal scaling |
| Container | Docker + Docker Compose | Consistent environment, single-command deployment |
| Reverse proxy | Nginx | WebSocket proxy support, SSL termination, static file serving |
| Icons | Phosphor Icons | Premium quality, multiple weights, consistent esport aesthetic |
| State management | Zustand | Lightweight, no boilerplate, pairs well with WebSocket updates |
| Bracket rendering | Custom SVG component | Full control over esport-style bracket visualization |

---

## Game Architecture

The platform supports two fundamentally different competition systems:

### Bracket System (HOK, ML, eFootball)

```
Teams seeded
  → Generate bracket matches (single/double elimination)
    → Admin schedules matches
      → Match goes live → admin inputs score per game (BO series)
        → Match complete → winner auto-advances in bracket
          → Final match → tournament complete
```

Key entities: `bracket_matches`, `match_games` (for BO3/BO5)

### Battle Royale Point System (FF, PUBGM)

```
Teams registered
  → Admin creates lobbies (room ID + password)
    → Match played → admin inputs placement + kills per team
      → System calculates points (placement_points + kill_points)
        → Cumulative leaderboard updated across all lobbies
          → Final standings after all lobbies complete
```

Key entities: `br_lobbies`, `br_lobby_results`, `br_point_rules`

---

## Traffic Estimation

| Scenario | Expected Load |
|---|---|
| Registration period | 500-1000 users over 1 week, low RPS |
| Normal tournament day | 200-500 concurrent viewers on bracket/standings |
| Peak (live match, final) | 1000-2000 concurrent WebSocket connections |
| Admin score input | 1-3 admins simultaneously, minimal DB load |

VPS requirements: 2 vCPU, 4 GB RAM, 20 GB SSD.

---

## Non-Goals (for MVP)

- Mobile native app (Android/iOS)
- Video streaming/embedding integration
- Automated score detection from game API
- Multi-event support (single Porjar Denpasar event)
- Payment/ticketing system
- Chat/messaging between teams
