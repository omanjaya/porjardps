# Testing Strategy — PORJAR Denpasar Esport

## Philosophy

- Tests exist to prevent regressions, not to hit a coverage number
- Test behavior, not implementation
- Prioritize: service layer unit tests > API integration tests > E2E
- A feature is not done until its critical paths have tests

---

## Test Pyramid

```
         /\
        /E2E\          -- Few, slow, high value
       /------\
      /  API   \       -- Medium, test real HTTP flow
     /----------\
    / Unit Tests \     -- Many, fast, test business logic
   /--------------\
```

---

## Go Backend

### Unit Tests — Service Layer

Test business logic in isolation. Mock all dependencies (repositories, WebSocket hub).

**What to test:**
- Happy path
- Each validation error path
- Each business rule violation
- State transitions (match status, tournament status)
- Point calculation logic (BR)
- Bracket generation correctness

**Tools:** `testing` (stdlib), `testify/assert`, `testify/mock`

```go
// internal/service/bracket_service_test.go

func TestGenerateSingleEliminationBracket(t *testing.T) {
    t.Run("success - 8 teams generates 7 matches", func(t *testing.T) {
        repo := &MockBracketRepo{}
        teamRepo := &MockTeamRepo{}
        teamRepo.On("FindByTournament", ...).Return(make8Teams(), nil)
        repo.On("BulkCreate", ...).Return(nil)

        svc := NewBracketService(repo, teamRepo, nil, nil)
        result, err := svc.GenerateBracket(ctx, tournamentID, nil)

        assert.NoError(t, err)
        assert.Equal(t, 7, result.MatchesCreated)
        assert.Equal(t, 3, result.TotalRounds)
        repo.AssertExpectations(t)
    })

    t.Run("success - 6 teams generates 7 matches with 2 BYEs", func(t *testing.T) {
        teamRepo := &MockTeamRepo{}
        teamRepo.On("FindByTournament", ...).Return(make6Teams(), nil)
        // Padded to 8, 2 BYEs auto-advance
        ...
    })

    t.Run("error - less than 2 teams", func(t *testing.T) {
        teamRepo := &MockTeamRepo{}
        teamRepo.On("FindByTournament", ...).Return(make1Team(), nil)

        svc := NewBracketService(nil, teamRepo, nil, nil)
        _, err := svc.GenerateBracket(ctx, tournamentID, nil)

        var appErr *apperror.AppError
        assert.ErrorAs(t, err, &appErr)
        assert.Equal(t, "INSUFFICIENT_TEAMS", appErr.Code)
    })

    t.Run("error - bracket already exists", func(t *testing.T) { ... })
}

func TestCompleteMatch(t *testing.T) {
    t.Run("success - winner advances to next match", func(t *testing.T) { ... })
    t.Run("error - match not live", func(t *testing.T) { ... })
    t.Run("error - invalid winner", func(t *testing.T) { ... })
    t.Run("error - score mismatch", func(t *testing.T) { ... })
}
```

```go
// internal/service/br_service_test.go

func TestCalculatePoints(t *testing.T) {
    t.Run("1st place with 12 kills = 27 points", func(t *testing.T) {
        rules := defaultPointRules() // 1st=15, per kill=1
        result := calculatePoints(rules, 1, 12)

        assert.Equal(t, 15, result.PlacementPoints)
        assert.Equal(t, 12, result.KillPoints)
        assert.Equal(t, 27, result.TotalPoints)
    })

    t.Run("8th place with 3 kills = 4 points", func(t *testing.T) {
        rules := defaultPointRules() // 8th=1, per kill=1
        result := calculatePoints(rules, 8, 3)

        assert.Equal(t, 1, result.PlacementPoints)
        assert.Equal(t, 3, result.KillPoints)
        assert.Equal(t, 4, result.TotalPoints)
    })
}

func TestUpdateCumulativeStandings(t *testing.T) {
    t.Run("standings recalculated correctly across 3 lobbies", func(t *testing.T) { ... })
    t.Run("rank tiebreaker: kills then best placement", func(t *testing.T) { ... })
}
```

**Coverage target: 80% on service layer**

---

### Integration Tests — API Layer

Test the full HTTP stack against a real test database.

**What to test:**
- Request parsing
- Auth middleware (401 without token, 403 wrong role)
- Response shape matches contract
- Database state after mutation
- WebSocket broadcast triggered after score update

**Tools:** `net/http/httptest`, `testcontainers-go` (PostgreSQL in Docker)

```go
// internal/handler/bracket_handler_test.go

func TestCompleteMatch_Integration(t *testing.T) {
    db := setupTestDB(t)
    server := setupTestServer(db)
    adminToken := generateTestToken("admin", adminID)
    playerToken := generateTestToken("player", playerID)

    t.Run("POST /admin/matches/:id/complete - success", func(t *testing.T) {
        body := `{ "winner_id": "uuid-team-a" }`
        req := httptest.NewRequest("POST", "/api/v1/admin/matches/uuid-match/complete", strings.NewReader(body))
        req.Header.Set("Authorization", "Bearer "+adminToken)
        req.Header.Set("Content-Type", "application/json")

        w := httptest.NewRecorder()
        server.ServeHTTP(w, req)

        assert.Equal(t, 200, w.Code)

        var resp map[string]interface{}
        json.Unmarshal(w.Body.Bytes(), &resp)
        assert.True(t, resp["success"].(bool))
    })

    t.Run("POST /admin/matches/:id/complete - 401 without token", func(t *testing.T) { ... })
    t.Run("POST /admin/matches/:id/complete - 403 player role", func(t *testing.T) { ... })
    t.Run("POST /admin/matches/:id/complete - 422 match not live", func(t *testing.T) { ... })
}
```

---

### What NOT to Test in Go

- Repository layer directly (covered by integration tests)
- Standard library behavior
- Getters/setters with no logic

---

## Next.js Frontend

### Unit Tests — Components & Hooks

Test component rendering and hook behavior.

**Tools:** Vitest, React Testing Library

```tsx
// components/shared/LiveBadge.test.tsx

describe('LiveBadge', () => {
    it('renders pulsing LIVE text', () => {
        render(<LiveBadge />)
        expect(screen.getByText('LIVE')).toBeInTheDocument()
        expect(screen.getByText('LIVE')).toHaveClass('animate-pulse')
    })
})
```

```tsx
// components/modules/battle-royale/BRLeaderboard.test.tsx

describe('BRLeaderboard', () => {
    it('renders teams sorted by total points', () => {
        const standings = [
            { team: { name: 'SMAN 1' }, total_points: 87, rank_position: 1 },
            { team: { name: 'SMKN 3' }, total_points: 79, rank_position: 2 },
        ]
        render(<BRLeaderboard standings={standings} lobbies={[]} />)

        const rows = screen.getAllByRole('row')
        expect(rows[1]).toHaveTextContent('SMAN 1')
        expect(rows[1]).toHaveTextContent('87')
    })
})
```

```tsx
// hooks/useWebSocket.test.ts

describe('useWebSocket', () => {
    it('reconnects on disconnect', async () => { ... })
    it('updates state on score_update message', async () => { ... })
})
```

**Tools for API mocking:** MSW (Mock Service Worker)

---

### E2E Tests — Critical Flows

Full browser tests for the most important user journeys.

**Tools:** Playwright

**Priority flows to test:**

```
1. Auth flow
   - Register -> login -> redirect to dashboard
   - Invalid credentials -> error message
   - Token expired -> auto-refresh -> continue

2. Team creation flow (player)
   - Create team -> add members -> team visible in dashboard
   - Register team to tournament -> success

3. Bracket flow (admin)
   - Generate bracket -> bracket visible
   - Set match to live -> input scores -> complete match -> winner advances

4. BR flow (admin)
   - Create lobby -> input results -> leaderboard updates

5. Public pages
   - Landing page loads with games grid
   - Bracket view renders correctly
   - Standings page shows data

6. Live score (spectator)
   - Open bracket page -> admin updates score -> page reflects change in real-time
```

```typescript
// e2e/bracket.spec.ts

test('admin can complete a bracket match and winner advances', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/admin/tournaments/uuid/bracket')

    // Set match to live
    await page.click('[data-match-id="uuid-match-1"] button:text("Set Live")')
    await expect(page.locator('[data-match-id="uuid-match-1"] .live-badge')).toBeVisible()

    // Input game score
    await page.fill('[name="score_a"]', '13')
    await page.fill('[name="score_b"]', '8')
    await page.click('button:text("Simpan Score Game")')
    await expect(page.locator('.toast-success')).toBeVisible()

    // Complete match
    await page.click('button:text("Selesaikan Pertandingan")')
    await page.click('button:text("Konfirmasi")')
    await expect(page.locator('.toast-success')).toContainText('Pertandingan selesai')

    // Verify winner advanced
    await expect(page.locator('[data-match-id="uuid-match-next"]')).toContainText('SMAN 1')
})
```

---

## Test Data Strategy

### Seeding

```
porjar-api/
└── testdata/
    ├── seed.go          -- creates standard test fixtures
    └── fixtures/
        ├── games.json
        ├── schools.json
        ├── users.json
        ├── teams.json
        └── tournaments.json
```

Standard test accounts (always available in test environment):

| Email | Password | Role |
|---|---|---|
| `admin@porjar.test` | `Admin1234` | admin |
| `superadmin@porjar.test` | `Super1234` | superadmin |
| `player1@porjar.test` | `Player1234` | player |
| `player2@porjar.test` | `Player1234` | player |

---

## Running Tests

```bash
# Go — unit tests only (fast)
go test ./internal/service/...

# Go — integration tests (requires Docker)
go test ./internal/handler/... -tags=integration

# Go — all tests with coverage
go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out

# Frontend — unit tests
npm run test

# Frontend — E2E (requires running server)
npm run test:e2e

# Frontend — E2E in CI mode (headless)
npm run test:e2e:ci
```

---

## CI Pipeline

```yaml
# .github/workflows/test.yml (or equivalent)

on: [push, pull_request]

jobs:
  test-backend:
    steps:
      - go test ./internal/service/...                        # unit (always)
      - go test ./internal/handler/... -tags=integration      # integration (with DB)
      - fail if coverage < 80% on service layer

  test-frontend:
    steps:
      - npm run test                                          # unit
      - npm run test:e2e:ci                                   # E2E on critical flows
```

---

## What a "Done" Feature Looks Like

A feature is considered complete when:

1. Service unit tests cover: happy path + all error branches
2. At least one API integration test per endpoint
3. E2E test covers the primary user journey (if it's a critical flow)
4. All tests pass in CI
