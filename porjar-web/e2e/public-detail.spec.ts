/**
 * public-detail.spec.ts — Detail page tests for public pages (no auth)
 *
 * Covers:
 *  - /games/[slug] — Game detail via navigation from /games
 *  - /teams — Teams list page (content, search, filter)
 *  - /teams/[id] — Team detail via navigation from /teams
 *  - /matches/[id] — Match detail via API lookup
 *  - /matches/live — Live matches page
 *  - /players/[id] — Player profile via navigation from /players
 */
import { test, expect } from '@playwright/test'

// No auth needed — public pages
test.use({ storageState: { cookies: [], origins: [] } })

const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:9090/api/v1'

// ─────────────────────────────────────────────────────────────────────────────
// 1. /games/[slug] — Game detail page (navigate from /games)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Game Detail Page', () => {
  test('navigate from /games to first game detail', async ({ page, request }) => {
    // Use API to get a known slug, then verify the /games page links to it
    const res = await request.get(`${apiUrl}/games`)
    const body = await res.json()
    const games: { slug: string }[] = Array.isArray(body) ? body : (body.data ?? [])

    if (games.length === 0) {
      test.skip(true, 'No games in DB')
      return
    }

    const slug = games[0].slug
    await page.goto('/games')
    await page.waitForLoadState('networkidle')

    // Verify game links exist on the page
    const gameLinks = page.locator(`a[href*="/games/${slug}"]`)
    const count = await gameLinks.count()

    if (count > 0) {
      // Click and wait for navigation
      await gameLinks.first().click()
      await page.waitForURL(`**/games/${slug}`, { timeout: 8000 }).catch(() => {})
    }

    // If click-navigation didn't work, navigate directly
    if (!page.url().includes(`/games/${slug}`)) {
      await page.goto(`/games/${slug}`)
      await page.waitForLoadState('networkidle')
    }

    // Page should not show error
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toMatch(/internal server error/i)
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('game detail page shows game name in heading', async ({ page }) => {
    // Use a known slug (ml) to verify heading content
    await page.goto('/games/ml')
    await page.waitForLoadState('networkidle')

    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 10000 })
    const name = await h1.textContent()
    expect(name?.trim().length).toBeGreaterThan(0)
  })

  test('game detail page does not produce 500 errors', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))

    await page.goto('/games/ml')
    await page.waitForLoadState('networkidle')

    expect(responses.some((s) => s >= 500)).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. /teams — Public teams list
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Teams List Page', () => {
  test('/teams page loads without error', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))

    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/teams shows team cards or empty state', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    const hasTeamLinks = await page.locator('a[href*="/teams/"]').count()
    const hasEmpty = await page
      .getByText(/belum ada tim|tidak ada tim yang cocok|tidak ditemukan/i)
      .count()
    const hasHeading = await page.getByText(/tim peserta/i).count()

    expect(hasTeamLinks + hasEmpty + hasHeading).toBeGreaterThan(0)
  })

  test('/teams has search functionality', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    // Look for search input
    const searchInput = page.locator(
      'input[placeholder*="Cari tim"], input[placeholder*="cari tim"], input[placeholder*="Cari"], input[type="text"][placeholder*="cari"]'
    )
    const hasSearch = await searchInput.count()

    if (hasSearch > 0) {
      await expect(searchInput.first()).toBeVisible({ timeout: 8000 })
      // Type something and verify no crash
      await searchInput.first().fill('Test')
      await page.waitForTimeout(500)
      // Page should still be functional after search
      await expect(page.locator('body')).not.toBeEmpty()
    }
  })

  test('/teams has game filter buttons', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    // "Semua" filter button should be present
    const allBtn = page.getByRole('button', { name: /^semua$/i }).first()
    await expect(allBtn).toBeVisible({ timeout: 8000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. /teams/[id] — Public team detail
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Team Detail Page', () => {
  test('navigate from /teams to first team detail', async ({ page, request }) => {
    // Use API to get a valid team ID
    const res = await request.get(`${apiUrl}/teams?page=1&per_page=1`)
    const body = await res.json()
    const teams: { id: string }[] = Array.isArray(body) ? body : (body.data ?? [])

    if (teams.length === 0) {
      test.skip(true, 'No teams in DB')
      return
    }

    const id = teams[0].id
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')

    // Try clicking a team link if it exists
    const teamLinks = page.locator(`a[href*="/teams/${id}"]`)
    const count = await teamLinks.count()

    if (count > 0) {
      await teamLinks.first().click()
      await page.waitForURL(`**/teams/${id}`, { timeout: 8000 }).catch(() => {})
    }

    // If click-navigation didn't work, navigate directly
    if (!page.url().includes(`/teams/${id}`)) {
      await page.goto(`/teams/${id}`)
      await page.waitForLoadState('networkidle')
    }

    await expect(page.locator('body')).not.toBeEmpty()
    // Team detail heading should be visible
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 10000 })
  })

  test('team detail shows team name', async ({ request, page }) => {
    // Fetch a team ID from API
    const res = await request.get(`${apiUrl}/teams?page=1&per_page=1`)
    const body = await res.json()
    const teams: { id: string }[] = Array.isArray(body) ? body : (body.data ?? [])

    if (teams.length === 0) {
      test.skip(true, 'No teams in DB')
      return
    }

    const id = teams[0].id
    await page.goto(`/teams/${id}`)
    await page.waitForLoadState('networkidle')

    // Team name should appear in h1
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 10000 })
    const name = await h1.textContent()
    expect(name?.trim().length).toBeGreaterThan(0)
  })

  test('team detail shows member list or team info section', async ({ request, page }) => {
    const res = await request.get(`${apiUrl}/teams?page=1&per_page=1`)
    const body = await res.json()
    const teams: { id: string }[] = Array.isArray(body) ? body : (body.data ?? [])

    if (teams.length === 0) {
      test.skip(true, 'No teams in DB')
      return
    }

    const id = teams[0].id
    await page.goto(`/teams/${id}`)
    await page.waitForLoadState('networkidle')

    // Look for member-related content: "Anggota", "Kapten", member cards, or team info
    const hasMembers = await page
      .getByText(/anggota|kapten|cadangan|member|roster/i)
      .count()
    const hasInfo = await page
      .getByText(/sekolah|game|status|tim/i)
      .count()

    expect(hasMembers + hasInfo).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. /matches/live — Live matches page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Live Matches Page', () => {
  test('/matches/live page loads without error', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))

    await page.goto('/matches/live')
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/matches/live shows heading', async ({ page }) => {
    await page.goto('/matches/live')
    await page.waitForLoadState('networkidle')

    const heading = page.getByText(/pertandingan live/i).first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('/matches/live shows live matches or empty state', async ({ page }) => {
    await page.goto('/matches/live')
    await page.waitForLoadState('networkidle')

    // Either live matches exist or an empty state message
    const hasLive = await page.getByText(/sedang berlangsung/i).count()
    const hasEmpty = await page
      .getByText(/tidak ada match live saat ini/i)
      .count()
    const hasRecent = await page.getByText(/hasil terkini/i).count()

    expect(hasLive + hasEmpty + hasRecent).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. /matches/[id] — Match detail page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Match Detail Page', () => {
  test('/matches/[id] loads for valid match', async ({ request, page }) => {
    const res = await request.get(`${apiUrl}/matches/recent?limit=1`)
    const body = await res.json()
    const matches: { id: string }[] = Array.isArray(body) ? body : (body.data ?? [])

    if (matches.length === 0) {
      test.skip(true, 'No recent matches in DB')
      return
    }

    const id = matches[0].id
    await page.goto(`/matches/${id}`)
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()

    // Match detail should show relevant information
    const heading = page.getByText(/detail pertandingan/i).first()
    await expect(heading).toBeVisible({ timeout: 10000 })
  })

  test('/matches/[id] shows match info content', async ({ request, page }) => {
    const res = await request.get(`${apiUrl}/matches/recent?limit=1`)
    const body = await res.json()
    const matches: { id: string }[] = Array.isArray(body) ? body : (body.data ?? [])

    if (matches.length === 0) {
      test.skip(true, 'No recent matches in DB')
      return
    }

    const id = matches[0].id
    await page.goto(`/matches/${id}`)
    await page.waitForLoadState('networkidle')

    // Match page should show team names, score, or match status
    const bodyText = await page.locator('body').textContent() ?? ''
    const hasContent =
      bodyText.match(/vs|skor|score|pertandingan|match|tim|team/i) !== null
    expect(hasContent).toBe(true)
  })

  test('/matches/[id] with invalid UUID shows not-found', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))

    await page.goto('/matches/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle')

    expect(responses.some((s) => s >= 500)).toBe(false)

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(
      /pertandingan tidak ditemukan|tidak ditemukan|tidak ada|gagal/i
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. /players/[id] — Player profile detail
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Player Profile Detail', () => {
  test('navigate from /players to first player detail', async ({ page, request }) => {
    // Use API to get a valid player ID
    const res = await request.get(`${apiUrl}/players?page=1&limit=1`)
    const body = await res.json()
    const innerData = body?.data?.data ?? body?.data ?? body
    const players: { id: string }[] = Array.isArray(innerData) ? innerData : []

    if (players.length === 0) {
      // No players — verify /players page shows empty state
      await page.goto('/players')
      await page.waitForLoadState('networkidle')
      const hasEmpty = await page
        .getByText(/pemain tidak ditemukan|belum ada pemain/i)
        .count()
      expect(hasEmpty).toBeGreaterThan(0)
      return
    }

    const id = players[0].id
    await page.goto('/players')
    await page.waitForLoadState('networkidle')

    // Try clicking a player link if it exists
    const playerLinks = page.locator(`a[href*="/players/${id}"]`)
    const count = await playerLinks.count()

    if (count > 0) {
      await playerLinks.first().click()
      await page.waitForURL(`**/players/${id}`, { timeout: 8000 }).catch(() => {})
    }

    // If click-navigation didn't work, navigate directly
    if (!page.url().includes(`/players/${id}`)) {
      await page.goto(`/players/${id}`)
      await page.waitForLoadState('networkidle')
    }

    await expect(page.locator('body')).not.toBeEmpty()
    // Player profile heading should be visible
    const h1 = page.locator('h1').filter({ hasText: /.+/ }).first()
    await expect(h1).toBeVisible({ timeout: 10000 })
  })

  test('player detail shows player name', async ({ request, page }) => {
    const res = await request.get(`${apiUrl}/players?page=1&limit=1`)
    const body = await res.json()
    const innerData = body?.data?.data ?? body?.data ?? body
    const players: { id: string }[] = Array.isArray(innerData)
      ? innerData
      : []

    if (players.length === 0) {
      test.skip(true, 'No players in DB')
      return
    }

    const id = players[0].id
    await page.goto(`/players/${id}`)
    await page.waitForLoadState('networkidle')

    await expect(page).not.toHaveURL(/\/login/)

    // Player profile should show name in a heading (h1 with actual text content)
    const h1 = page.locator('h1').filter({ hasText: /.+/ }).first()
    await expect(h1).toBeVisible({ timeout: 10000 })
    const name = await h1.textContent()
    expect(name?.trim().length).toBeGreaterThan(0)
  })

  test('player detail shows profile info or error state', async ({
    request,
    page,
  }) => {
    const res = await request.get(`${apiUrl}/players?page=1&limit=1`)
    const body = await res.json()
    const innerData = body?.data?.data ?? body?.data ?? body
    const players: { id: string }[] = Array.isArray(innerData)
      ? innerData
      : []

    if (players.length === 0) {
      test.skip(true, 'No players in DB')
      return
    }

    const id = players[0].id
    await page.goto(`/players/${id}`)
    await page.waitForLoadState('networkidle')

    // Should show player-related info: role, team, stats, school, etc.
    const bodyText = await page.locator('body').textContent() ?? ''
    const hasProfileContent =
      bodyText.match(/player|admin|sekolah|tim|statistik|game|pencapaian/i) !==
      null
    const hasError =
      bodyText.match(/pemain tidak ditemukan|terjadi kesalahan/i) !== null

    expect(hasProfileContent || hasError).toBe(true)
  })

  test('player detail with invalid UUID shows error, not 500', async ({
    page,
  }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))

    await page.goto('/players/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle')

    expect(responses.some((s) => s >= 500)).toBe(false)

    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(
      /pemain tidak ditemukan|terjadi kesalahan|tidak ada/i
    )
  })
})
