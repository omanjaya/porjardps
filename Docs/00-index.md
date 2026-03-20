# PORJAR Denpasar Esport — Documentation

Platform turnamen esport untuk Pekan Olahraga Pelajar (Porjar) Kota Denpasar. Mengelola registrasi peserta, bracket pertandingan, live score, klasemen, dan jadwal untuk 5 game: HOK, ML, FF, PUBGM, eFootball.

---

## Documents

| # | Document | Description |
|---|---|---|
| 01 | [System Design](./01-system-design.md) | Goals, deployment model, user roles, tech decisions |
| 02 | [Layered Architecture](./02-architecture.md) | Go backend layers, Next.js structure, request lifecycle, WebSocket flow |
| 03 | [Clean Code Practices](./03-clean-code.md) | Naming, error handling, response format, patterns |
| 04 | [Shared Components](./04-shared-components.md) | Reusable UI components, icon system, layout structure |
| 05 | [Database Schema](./05-database-schema.md) | All tables, columns, indexes, migration strategy |
| 06 | [UI/UX Design](./06-ui-ux.md) | Design system, layouts, key page wireframes |
| 07 | [API Contract](./07-api-contract.md) | All endpoints, request/response schemas, auth requirements |
| 08 | [Validation Rules](./08-validation-rules.md) | Field rules + business rules per entity |
| 09 | [Feature Specifications](./09-feature-specs.md) | User stories, acceptance criteria, edge cases per feature |
| 10 | [Error Catalog](./10-error-catalog.md) | All error codes, messages, HTTP status, frontend handling |
| 11 | [Testing Strategy](./11-testing-strategy.md) | Unit, integration, E2E approach, tools, coverage targets |
| 12 | [Security](./12-security.md) | Auth, RBAC, injection prevention, headers, audit log |
| 13 | [Environment & Config](./13-environment.md) | Env vars, Docker setup, local dev, production deployment |
| 14 | [Progress Tracker](./14-progress.md) | Phase checklist — what's done, in progress, pending |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Go (Fiber) |
| Frontend | Next.js 14+ (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| Icons | Phosphor Icons |
| Database | PostgreSQL 15+ |
| Cache / Session | Redis |
| Real-time | WebSocket (gorilla/websocket) |
| Auth | Custom JWT (access + refresh) |
| State Management | Zustand |
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt (Certbot) |
| Migration | golang-migrate / goose |

---

## Game Coverage

| Game | Slug | Type | Team Size | Format |
|---|---|---|---|---|
| Honor of Kings | `hok` | Bracket | 5+1 | Single Elim, Double Elim, Group + Playoff |
| Mobile Legends | `ml` | Bracket | 5+1 | Single Elim, Double Elim, Group + Playoff |
| Free Fire | `ff` | Battle Royale | 4+1 | Point System (12 teams/lobby) |
| PUBG Mobile | `pubgm` | Battle Royale | 4+1 | Point System (16 teams/lobby) |
| eFootball | `efootball` | Bracket | 1+0 | Single Elim, Double Elim, Round Robin |

---

## Key Design Decisions

- Single database instance (not per-school like SION — this is a single event platform)
- Layered architecture: Handler -> Service -> Repository -> Model
- All errors use standardized error codes
- Validation at two layers: input format (handler) + business rules (service)
- JWT access token (15 min) + httpOnly refresh token (7 days)
- Role-based access control: player, admin, superadmin
- WebSocket for real-time live score broadcasting
- Two distinct tournament systems: bracket (MOBA/fighting) and battle royale (point-based)

---

## Target

- ~5000 users (non-concurrent, traffic spike during event)
- Timeline: < 1 bulan
- Deployment: Self-hosted VPS (Ubuntu 22.04+)

---

## Status

> In planning — MVP development not yet started.
