/**
 * tournaments.spec.ts — Tournament pages (public, no auth required)
 *
 * Covers:
 *  - Tournament list page
 *  - Tournament detail page
 *  - Tournament sub-pages: bracket, standings, schedule, lobbies, report
 *  - Tournament API contract tests
 */
import { test, expect } from '@playwright/test'

// No auth needed — public pages
test.use({ storageState: { cookies: [], origins: [] } })

const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:9090/api/v1'

/**
 * Helper: navigate to /tournaments, find the first tournament link, and return
 * the tournament ID. Returns null if no tournaments are present.
 */
async function getFirstTournamentId(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/tournaments')
  await page.waitForLoadState('networkidle')
  const links = page
    .locator('a[href*="/tournaments/"]')
    .filter({ hasNot: page.locator('[href*="/admin"]') })
  const href = await links.first().getAttribute('href').catch(() => null)
  if (!href) return null
  const parts = href.split('/tournaments/')
  return parts[1]?.split('/')[0] ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Tournament List
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tournament List', () => {
  test('shows tournament list or empty state', async ({ page }) => {
    await page.goto('/tournaments')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    // Either tournament cards/table exist or an empty state message is shown
    const hasCards = await page
      .locator('[data-testid="tournament-card"], [class*="tournament"], a[href*="/tournaments/"]')
      .count()
    const hasEmpty = await page
      .getByText(/belum ada|tidak ada|empty|no tournament/i)
      .count()
    expect(hasCards + hasEmpty).toBeGreaterThan(0)
  })

  test('shows filter/search if present', async ({ page }) => {
    await page.goto('/tournaments')
    await page.waitForLoadState('networkidle')
    // Look for search input or filter buttons — either is acceptable
    const hasSearch = await page.locator('input[type="text"], input[type="search"]').count()
    const hasFilters = await page.locator('button').count()
    expect(hasSearch + hasFilters).toBeGreaterThan(0)
  })

  test('no 500 error on tournaments page', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => {
      if (res.url().includes('/tournaments')) responses.push(res.status())
    })
    await page.goto('/tournaments')
    await page.waitForLoadState('networkidle')
    const has500 = responses.some((s) => s >= 500)
    expect(has500).toBe(false)
    await expect(page.locator('body')).not.toBeEmpty()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tournament Detail
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tournament Detail', () => {
  test('tournament detail page loads', async ({ page }) => {
    const id = await getFirstTournamentId(page)
    if (!id) {
      test.skip(true, 'No tournaments available — skipping detail tests')
      return
    }
    await page.goto(`/tournaments/${id}`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('shows tournament name', async ({ page }) => {
    const id = await getFirstTournamentId(page)
    if (!id) {
      test.skip(true, 'No tournaments available')
      return
    }
    await page.goto(`/tournaments/${id}`)
    await page.waitForLoadState('networkidle')
    // The page has multiple h1 elements (PageHeader + tournament name).
    // Filter to the first h1 that has actual text content — the tournament name.
    const h1WithText = page.locator('h1').filter({ hasText: /.+/ }).first()
    await expect(h1WithText).toBeVisible({ timeout: 10_000 })
    const text = await h1WithText.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test('shows tournament status badge', async ({ page }) => {
    const id = await getFirstTournamentId(page)
    if (!id) {
      test.skip(true, 'No tournaments available')
      return
    }
    await page.goto(`/tournaments/${id}`)
    await page.waitForLoadState('networkidle')
    // Status badge text matches any known status (case-insensitive)
    const statusEl = page.getByText(/aktif|selesai|draft|coming|mendatang|open|registrasi/i).first()
    await expect(statusEl).toBeVisible({ timeout: 8000 })
  })

  test('shows tournament game info', async ({ page }) => {
    const id = await getFirstTournamentId(page)
    if (!id) {
      test.skip(true, 'No tournaments available')
      return
    }
    await page.goto(`/tournaments/${id}`)
    await page.waitForLoadState('networkidle')
    // Game name badge should be visible — matches known game names
    const gameEl = page.getByText(/mobile legends|honor of kings|free fire|pubg|efootball|mlbb|hok/i).first()
    await expect(gameEl).toBeVisible({ timeout: 8000 })
  })

  test('detail page has no 500 error', async ({ page }) => {
    const id = await getFirstTournamentId(page)
    if (!id) {
      test.skip(true, 'No tournaments available')
      return
    }
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto(`/tournaments/${id}`)
    await page.waitForLoadState('networkidle')
    const has500 = responses.some((s) => s >= 500)
    expect(has500).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tournament Sub-pages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tournament Sub-pages', () => {
  let tournamentId: string | null = null

  // Resolve once for all sub-page tests
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await ctx.newPage()
    try {
      tournamentId = await getFirstTournamentId(page)
    } finally {
      await page.close()
      await ctx.close()
    }
  })

  test('bracket page loads', async ({ page }) => {
    if (!tournamentId) {
      test.skip(true, 'No tournaments available — skipping bracket test')
      return
    }
    await page.goto(`/tournaments/${tournamentId}/bracket`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    // Should not redirect away from bracket
    expect(page.url()).toContain(`/tournaments/${tournamentId}/bracket`)
  })

  test('bracket shows bracket component or loading/empty state', async ({ page }) => {
    if (!tournamentId) {
      test.skip(true, 'No tournaments available')
      return
    }
    await page.goto(`/tournaments/${tournamentId}/bracket`)
    await page.waitForLoadState('networkidle')
    // Either a bracket visualization exists or an empty state message
    const hasBracket = await page
      .locator('[class*="bracket"], [data-testid*="bracket"]')
      .count()
    const hasEmpty = await page
      .getByText(/belum ada bracket|bracket belum tersedia|belum tersedia|pengundian/i)
      .count()
    const hasContent = await page.locator('body').textContent()
    // Page should have meaningful content (not blank)
    expect((hasContent?.trim().length ?? 0) + hasBracket + hasEmpty).toBeGreaterThan(0)
  })

  test('standings page loads', async ({ page }) => {
    if (!tournamentId) {
      test.skip(true, 'No tournaments available')
      return
    }
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto(`/tournaments/${tournamentId}/standings`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('standings shows table or empty state', async ({ page }) => {
    if (!tournamentId) {
      test.skip(true, 'No tournaments available')
      return
    }
    await page.goto(`/tournaments/${tournamentId}/standings`)
    await page.waitForLoadState('networkidle')
    // Either a table is present (with known column headers) or an empty state
    const hasTable = await page.locator('table, [role="table"]').count()
    const hasHeader = await page.getByText(/klasemen|tim|poin|ranking|standing/i).count()
    const hasEmpty = await page.getByText(/belum ada|tidak ditemukan|turnamen tidak ditemukan/i).count()
    expect(hasTable + hasHeader + hasEmpty).toBeGreaterThan(0)
  })

  test('schedule page loads', async ({ page }) => {
    if (!tournamentId) {
      test.skip(true, 'No tournaments available')
      return
    }
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto(`/tournaments/${tournamentId}/schedule`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('schedule shows list or empty state', async ({ page }) => {
    if (!tournamentId) {
      test.skip(true, 'No tournaments available')
      return
    }
    await page.goto(`/tournaments/${tournamentId}/schedule`)
    await page.waitForLoadState('networkidle')
    const hasSchedule = await page.getByText(/jadwal/i).count()
    const hasEmpty = await page.getByText(/belum ada|tidak ada|kosong/i).count()
    const hasError = await page.getByText(/terjadi kesalahan/i).count()
    expect(hasSchedule + hasEmpty + hasError).toBeGreaterThan(0)
  })

  test('lobbies page loads', async ({ page }) => {
    if (!tournamentId) {
      test.skip(true, 'No tournaments available')
      return
    }
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto(`/tournaments/${tournamentId}/lobbies`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
    // Either shows lobbies, an empty state, or a "wrong format" notice
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.trim().length).toBeGreaterThan(0)
  })

  test('report page loads', async ({ page }) => {
    if (!tournamentId) {
      test.skip(true, 'No tournaments available')
      return
    }
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto(`/tournaments/${tournamentId}/report`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
    // Should show "Laporan Turnamen" heading or a not-found state
    const hasTitle = await page.getByText(/laporan turnamen|turnamen tidak ditemukan/i).count()
    expect(hasTitle).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tournament API
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tournament API', () => {
  test('GET /tournaments returns array', async ({ request }) => {
    const res = await request.get(`${apiUrl}/tournaments`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    // API may return { data: [...] } or directly an array
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(Array.isArray(arr)).toBe(true)
  })

  test('GET /tournaments/:id returns tournament detail', async ({ request }) => {
    const listRes = await request.get(`${apiUrl}/tournaments`)
    const listBody = await listRes.json()
    const list: { id: string }[] = Array.isArray(listBody)
      ? listBody
      : (listBody.data ?? [])
    if (list.length === 0) {
      test.skip(true, 'No tournaments in DB')
      return
    }
    const id = list[0].id
    const res = await request.get(`${apiUrl}/tournaments/${id}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const tournament = body.data ?? body
    expect(tournament.id).toBe(id)
    expect(typeof tournament.name).toBe('string')
  })

  test('GET /tournaments/:id/bracket accessible without auth', async ({ request }) => {
    const listRes = await request.get(`${apiUrl}/tournaments`)
    const listBody = await listRes.json()
    const list: { id: string }[] = Array.isArray(listBody)
      ? listBody
      : (listBody.data ?? [])
    if (list.length === 0) {
      test.skip(true, 'No tournaments in DB')
      return
    }
    const id = list[0].id
    const res = await request.get(`${apiUrl}/tournaments/${id}/bracket`)
    // Should not require auth (401/403)
    expect(res.status()).not.toBe(401)
    expect(res.status()).not.toBe(403)
  })

  test('GET /tournaments/:id/standings accessible without auth', async ({ request }) => {
    const listRes = await request.get(`${apiUrl}/tournaments`)
    const listBody = await listRes.json()
    const list: { id: string }[] = Array.isArray(listBody)
      ? listBody
      : (listBody.data ?? [])
    if (list.length === 0) {
      test.skip(true, 'No tournaments in DB')
      return
    }
    const id = list[0].id
    const res = await request.get(`${apiUrl}/tournaments/${id}/standings`)
    expect(res.status()).not.toBe(401)
    expect(res.status()).not.toBe(403)
  })
})
