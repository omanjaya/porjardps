# Clean Code Practices — PORJAR Denpasar Esport

## Principles

- Single Responsibility: each function, file, and module does one thing
- Explicit over implicit: avoid magic, config over convention where possible
- Error handling is first-class: never ignore errors in Go
- No premature abstraction: extract only when a pattern repeats 3+ times
- Consistency over cleverness: readable by a new developer in 5 minutes

---

## Go Backend

### Naming

```go
// Functions: verb + noun, clear intent
func GetTeamByID(...)              // not: FetchTeam, TeamGet
func CreateBracketMatch(...)       // not: MakeBracket, AddMatch
func IsMatchLive(...)              // boolean functions start with Is/Has/Can
func CalculateKillPoints(...)      // descriptive for business logic

// Variables: short in small scope, descriptive in wider scope
for i, t := range teams { ... }       // i, t fine in loop
totalPlacementPoints := calculatePlacement(placement)  // descriptive at function level

// Constants: PascalCase
const MaxTeamMembers   = 5
const DefaultPageSize  = 20
const PointPerKill     = 1
```

### Error Handling

```go
// Always wrap errors with context
match, err := repo.FindByID(ctx, id)
if err != nil {
    return fmt.Errorf("GetMatchByID %s: %w", id, err)
}

// Use sentinel errors for known error types in model
var (
    ErrTeamNotFound      = errors.New("team not found")
    ErrTeamFull          = errors.New("team is at maximum capacity")
    ErrMatchNotLive      = errors.New("match is not in live status")
    ErrAlreadyRegistered = errors.New("team already registered for tournament")
    ErrBracketGenerated  = errors.New("bracket already generated for tournament")
)

// Check specific errors in service/handler
if errors.Is(err, model.ErrTeamNotFound) {
    return response.NotFound(c, "team not found")
}
```

### Context Propagation

```go
// Always pass context as first argument
func (s *BracketService) CompleteMatch(ctx context.Context, matchID uuid.UUID, winnerID uuid.UUID) error

// Never store context in struct
type BracketService struct {
    ctx context.Context // don't do this
}
```

### Struct Initialization

```go
// Always use named fields
match := model.BracketMatch{
    ID:           uuid.New(),
    TournamentID: tournamentID,
    Round:        round,
    MatchNumber:  matchNum,
    TeamAID:      &teamA,
    TeamBID:      &teamB,
    Status:       "pending",
}

// Not:
match := model.BracketMatch{uuid.New(), tournamentID, round, matchNum, &teamA, &teamB, "pending"}
```

### Repository Pattern

```go
// Interface defined in model, implemented in repository
// Easy to mock in tests

// model/bracket.go
type BracketRepository interface {
    FindByID(ctx context.Context, id uuid.UUID) (*BracketMatch, error)
    FindByTournament(ctx context.Context, tournamentID uuid.UUID) ([]*BracketMatch, error)
    Save(ctx context.Context, m *BracketMatch) error
    UpdateScore(ctx context.Context, id uuid.UUID, scoreA, scoreB int) error
    UpdateWinner(ctx context.Context, id uuid.UUID, winnerID, loserID uuid.UUID) error
    AdvanceToNext(ctx context.Context, matchID uuid.UUID, teamID uuid.UUID) error
}
```

### Response Format

All API responses follow a consistent envelope:

```go
// pkg/response/response.go
type Response struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *ErrorBody  `json:"error,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

type ErrorBody struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

type Meta struct {
    Page       int `json:"page"`
    PerPage    int `json:"per_page"`
    Total      int `json:"total"`
    TotalPages int `json:"total_pages"`
}
```

```json
// Success
{
  "success": true,
  "data": { "id": "...", "name": "SMAN 1 Denpasar Team A" }
}

// Error
{
  "success": false,
  "error": {
    "code": "TEAM_NOT_FOUND",
    "message": "Tim dengan ID tersebut tidak ditemukan"
  }
}

// Paginated
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "per_page": 20, "total": 48, "total_pages": 3 }
}
```

---

## Next.js Frontend

### Component Structure

```
components/modules/bracket/
├── BracketView.tsx         # SVG bracket renderer
├── MatchNode.tsx           # Individual match in bracket
├── BracketControls.tsx     # Zoom, pan, filter controls
└── index.ts                # Barrel export
```

### Component Principles

```tsx
// Single responsibility per component
// BracketView only renders — no fetching, no business logic

interface BracketViewProps {
    matches: BracketMatch[]
    rounds: number
    onMatchClick: (matchId: string) => void
    liveMatchIds?: string[]
}

export function BracketView({ matches, rounds, onMatchClick, liveMatchIds }: BracketViewProps) {
    // render only
}
```

### Data Fetching

```tsx
// Use server components for initial data (SSR)
// app/tournaments/[id]/bracket/page.tsx
export default async function BracketPage({ params }: { params: { id: string } }) {
    const bracket = await getBracketData(params.id)
    return <BracketView matches={bracket.matches} rounds={bracket.rounds} />
}

// Use React Query / SWR for client-side mutations
const { mutate } = useMutation({
    mutationFn: updateMatchScore,
    onSuccess: () => queryClient.invalidateQueries(['bracket', tournamentId])
})
```

### API Client

```ts
// lib/api.ts
// All API calls go through typed wrappers — no raw fetch in components

export async function getBracketData(tournamentId: string): Promise<BracketData> {
    const res = await apiClient.get(`/tournaments/${tournamentId}/bracket`)
    return res.data
}

export async function updateMatchScore(matchId: string, payload: ScorePayload): Promise<void> {
    await apiClient.put(`/admin/matches/${matchId}/score`, payload)
}
```

### TypeScript

```ts
// Always type API responses
interface BracketMatch {
    id: string
    tournamentId: string
    round: number
    matchNumber: number
    teamA: TeamSummary | null
    teamB: TeamSummary | null
    winner: TeamSummary | null
    scoreA: number
    scoreB: number
    status: MatchStatus
    scheduledAt: string | null
    bestOf: number
}

// Use discriminated unions for state
type MatchStatus = 'pending' | 'scheduled' | 'live' | 'completed' | 'bye'
type GameType = 'bracket' | 'battle_royale'
type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'battle_royale_points' | 'group_stage_playoff'

// Avoid `any` — use `unknown` and narrow where needed
```

---

## File & Folder Naming

| Type | Convention | Example |
|---|---|---|
| Go files | snake_case | `bracket_service.go` |
| Go packages | lowercase, single word | `service`, `handler` |
| Next.js pages | kebab-case folder | `app/tournaments/[id]/page.tsx` |
| Components | PascalCase | `BracketView.tsx` |
| Hooks | camelCase with `use` prefix | `useWebSocket.ts` |
| API lib | camelCase | `api.ts` |
| DB migrations | numbered prefix | `0001_create_users.sql` |
| Types | PascalCase interfaces | `BracketMatch`, `TeamSummary` |

---

## Git Commit Convention

```
feat: add bracket generation for single elimination
feat: implement BR lobby result input
fix: correct point calculation for tied placements
fix: WebSocket reconnection on network drop
refactor: extract seeding logic to shared utility
chore: update Go dependencies
```

---

## What to Avoid

- No `interface{}` or `any` in Go unless absolutely necessary
- No direct `os.Exit` inside handlers or services (only in `main.go`)
- No business logic in handlers
- No database queries in service layer directly (always through repository)
- No `console.log` left in production frontend code
- No hardcoded strings — use constants or config
- No WebSocket messages sent directly from handler — always through Hub
- No bracket manipulation without going through BracketService
