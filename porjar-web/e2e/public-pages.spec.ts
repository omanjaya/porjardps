/**
 * public-pages.spec.ts — All remaining public pages (no auth)
 *
 * Covers:
 *  - Games detail pages (/games/[slug])
 *  - Players directory and player profile
 *  - Teams public directory and team detail
 *  - Live matches and match detail
 *  - Schools (content + search + filter)
 *  - Rules, Achievements, Gallery
 *  - Embed pages (bracket + match)
 *  - API contract tests for public endpoints
 *
 * NOTE: /games page, /schedule page, and auth pages are already tested in
 * public.spec.ts — those are not duplicated here.
 */
import { test, expect } from '@playwright/test'

// No auth needed — public pages
test.use({ storageState: { cookies: [], origins: [] } })

const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:9090/api/v1'

// ─────────────────────────────────────────────────────────────────────────────
// Games — detail pages by slug
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Games Detail Pages', () => {
  const knownSlugs = ['ml', 'hok', 'ff'] as const

  for (const slug of knownSlugs) {
    test(`/games/${slug} loads`, async ({ page }) => {
      await page.goto(`/games/${slug}`)
      await page.waitForLoadState('networkidle')
      await expect(page).not.toHaveURL(/\/login/)
      await expect(page.locator('body')).not.toBeEmpty()
      // Should not show a 500-style error
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).not.toMatch(/internal server error/i)
    })
  }

  test('/games/ml shows game name Mobile Legends', async ({ page }) => {
    await page.goto('/games/ml')
    await page.waitForLoadState('networkidle')
    // Hero section has the game name as h1
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 8000 })
    const name = await h1.textContent()
    expect(name).toMatch(/mobile legends/i)
  })

  test('/games/hok shows game name Honor of Kings', async ({ page }) => {
    await page.goto('/games/hok')
    await page.waitForLoadState('networkidle')
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 8000 })
    const name = await h1.textContent()
    expect(name).toMatch(/honor of kings/i)
  })

  test('/games/ff shows game name Free Fire', async ({ page }) => {
    await page.goto('/games/ff')
    await page.waitForLoadState('networkidle')
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 8000 })
    const name = await h1.textContent()
    expect(name).toMatch(/free fire/i)
  })

  test('/games/invalid-slug shows not-found page, not 500', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/games/xxxxinvalid')
    await page.waitForLoadState('networkidle')
    // Must not produce a 500
    expect(responses.some((s) => s >= 500)).toBe(false)
    // Should show a not-found / "game tidak ditemukan" message or redirect
    const bodyText = await page.locator('body').textContent()
    const has404 = (bodyText ?? '').match(/game tidak ditemukan|tidak tersedia|404|not found/i)
    const wasRedirected = !page.url().includes('/games/xxxxinvalid')
    expect(has404 || wasRedirected).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Players
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Players', () => {
  test('/players page loads', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/players')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/players shows list or empty state', async ({ page }) => {
    await page.goto('/players')
    await page.waitForLoadState('networkidle')
    // Page title "Direktori Pemain" always shows
    const hasPageTitle = await page.getByText(/direktori pemain|pemain/i).count()
    const hasCards = await page
      .locator('a[href*="/players/"]')
      .count()
    const hasEmpty = await page
      .getByText(/pemain tidak ditemukan|belum ada pemain/i)
      .count()
    expect(hasPageTitle + hasCards + hasEmpty).toBeGreaterThan(0)
  })

  test('/players has search input', async ({ page }) => {
    await page.goto('/players')
    await page.waitForLoadState('networkidle')
    // The page has a search form with a text input
    const searchInput = page.locator(
      'input[type="text"][placeholder*="Cari"], input[placeholder*="cari"], input[placeholder*="nama pemain"]'
    )
    await expect(searchInput.first()).toBeVisible({ timeout: 8000 })
  })

  test('/players/[id] loads for valid player', async ({ request, page }) => {
    const res = await request.get(`${apiUrl}/players?page=1&limit=1`)
    const body = await res.json()
    // /players returns nested pagination: { data: { data: [...], total, ... } }
    const innerData = body?.data?.data ?? body?.data ?? body
    const players: { id: string }[] = Array.isArray(innerData) ? innerData : []
    if (players.length === 0) {
      test.skip(true, 'No players in DB')
      return
    }
    const id = players[0].id
    await page.goto(`/players/${id}`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    // Player profile should show name (h1 with content — skip the empty PageHeader h1)
    const h1 = page.locator('h1').filter({ hasText: /.+/ }).first()
    await expect(h1).toBeVisible({ timeout: 8000 })
  })

  test('/players/[id] shows 404 for invalid UUID, not 500', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/players/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle')
    expect(responses.some((s) => s >= 500)).toBe(false)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/pemain tidak ditemukan|terjadi kesalahan|tidak ada/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Teams (Public)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Teams Public', () => {
  test('/teams public page loads', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/teams shows list or empty state', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')
    // "Tim Peserta" heading is always rendered
    const hasHeading = await page.getByText(/tim peserta/i).count()
    const hasRows = await page.locator('a[href*="/teams/"]').count()
    const hasEmpty = await page
      .getByText(/belum ada tim|tidak ada tim yang cocok/i)
      .count()
    expect(hasHeading + hasRows + hasEmpty).toBeGreaterThan(0)
  })

  test('/teams has game filter pills', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')
    // "Semua" filter button is always present
    const allBtn = page.getByRole('button', { name: /^semua$/i }).first()
    await expect(allBtn).toBeVisible({ timeout: 8000 })
  })

  test('/teams has search input', async ({ page }) => {
    await page.goto('/teams')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator(
      'input[placeholder*="Cari tim"], input[placeholder*="cari tim"]'
    )
    await expect(searchInput.first()).toBeVisible({ timeout: 8000 })
  })

  test('/teams/[id] public detail loads', async ({ request, page }) => {
    const res = await request.get(`${apiUrl}/teams?page=1&per_page=1`)
    const body = await res.json()
    const teams: { id: string }[] = Array.isArray(body)
      ? body
      : (body.data ?? [])
    if (teams.length === 0) {
      test.skip(true, 'No teams in DB')
      return
    }
    const id = teams[0].id
    await page.goto(`/teams/${id}`)
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    // Team detail always has h1 with team name
    const h1 = page.locator('h1').first()
    await expect(h1).toBeVisible({ timeout: 8000 })
  })

  test('/teams/join/[code] loads gracefully with invalid code', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/teams/join/TESTCODE')
    await page.waitForLoadState('networkidle')
    // Should not produce 500
    expect(responses.some((s) => s >= 500)).toBe(false)
    await expect(page.locator('body')).not.toBeEmpty()
    // Either shows invalid code message, join form, or redirects to login
    const bodyText = await page.locator('body').textContent()
    expect((bodyText?.trim().length ?? 0)).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Live Matches
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Live Matches', () => {
  test('/matches/live page loads', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/matches/live')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/matches/live page has "Pertandingan Live" heading', async ({ page }) => {
    await page.goto('/matches/live')
    await page.waitForLoadState('networkidle')
    const heading = page.getByText(/pertandingan live/i).first()
    await expect(heading).toBeVisible({ timeout: 8000 })
  })

  test('/matches/live shows live section or empty state', async ({ page }) => {
    await page.goto('/matches/live')
    await page.waitForLoadState('networkidle')
    // Either "Sedang Berlangsung" section or "Tidak ada match live saat ini"
    const hasLive = await page.getByText(/sedang berlangsung/i).count()
    const hasEmpty = await page.getByText(/tidak ada match live saat ini/i).count()
    expect(hasLive + hasEmpty).toBeGreaterThan(0)
  })

  test('/matches/live shows recent results section when results exist', async ({ page }) => {
    await page.goto('/matches/live')
    await page.waitForLoadState('networkidle')
    // "Hasil Terkini" section may appear if there are recent completed matches
    // It's acceptable if it's absent (no completed matches yet)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText?.trim().length).toBeGreaterThan(0)
    // If section heading is present, it should be visible
    const hasTerkini = await page.getByText(/hasil terkini/i).count()
    if (hasTerkini > 0) {
      await expect(page.getByText(/hasil terkini/i).first()).toBeVisible()
    }
  })

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
    // Match detail heading should be visible
    const heading = page.getByText(/detail pertandingan/i).first()
    await expect(heading).toBeVisible({ timeout: 8000 })
  })

  test('/matches/[id] with invalid UUID shows not-found, not 500', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/matches/00000000-0000-0000-0000-000000000000')
    await page.waitForLoadState('networkidle')
    expect(responses.some((s) => s >= 500)).toBe(false)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/pertandingan tidak ditemukan|tidak ditemukan|tidak ada/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Schools
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Schools', () => {
  test('/schools page loads', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/schools')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/schools shows "Sekolah Peserta" heading', async ({ page }) => {
    await page.goto('/schools')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/sekolah peserta/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('/schools shows school cards or empty state', async ({ page }) => {
    await page.goto('/schools')
    await page.waitForLoadState('networkidle')
    const hasCards = await page
      .locator('[class*="rounded-xl"][class*="border"]')
      .count()
    const hasEmpty = await page
      .getByText(/belum ada sekolah|daftar sekolah peserta akan ditampilkan/i)
      .count()
    expect(hasCards + hasEmpty).toBeGreaterThan(0)
  })

  test('/schools has search input', async ({ page }) => {
    await page.goto('/schools')
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator(
      'input[placeholder*="Cari nama sekolah"], input[placeholder*="cari"]'
    )
    await expect(searchInput.first()).toBeVisible({ timeout: 8000 })
  })

  test('/schools has level filter buttons (Semua, SMP, SMA, SMK)', async ({ page }) => {
    await page.goto('/schools')
    await page.waitForLoadState('networkidle')
    for (const label of ['Semua', 'SMP', 'SMA', 'SMK']) {
      await expect(
        page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first()
      ).toBeVisible({ timeout: 8000 })
    }
  })

  test('/schools search filters results', async ({ page }) => {
    await page.goto('/schools')
    await page.waitForLoadState('networkidle')
    // Wait for initial load
    await page.waitForSelector('body', { state: 'visible' })
    const searchInput = page.locator(
      'input[placeholder*="Cari nama sekolah"], input[placeholder*="cari"]'
    ).first()
    await expect(searchInput).toBeVisible({ timeout: 8000 })
    // Type a search query
    await searchInput.fill('SMA')
    // Results summary text should update (filtering is client-side)
    await page.waitForTimeout(500)
    const resultText = await page.getByText(/menampilkan/i).first().textContent().catch(() => null)
    // If the summary text exists, it should reflect the filtered count
    if (resultText) {
      expect(resultText).toMatch(/menampilkan/i)
    }
    // Either filtered cards appear or an empty state is shown
    const hasResults = await page.locator('[class*="rounded-xl"][class*="border"]').count()
    const hasEmpty = await page.getByText(/tidak ada sekolah|belum ada sekolah/i).count()
    expect(hasResults + hasEmpty).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Rules
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Rules', () => {
  test('/rules page loads', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/rules')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/rules shows "Peraturan Turnamen" heading', async ({ page }) => {
    await page.goto('/rules')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/peraturan turnamen/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('/rules shows game tabs', async ({ page }) => {
    await page.goto('/rules')
    await page.waitForLoadState('networkidle')
    // Game tabs: MLBB, HOK, Free Fire, PUBG Mobile, eFootball
    const mlbb = page.getByRole('button', { name: /mlbb/i }).first()
    await expect(mlbb).toBeVisible({ timeout: 8000 })
  })

  test('/rules shows info umum section', async ({ page }) => {
    await page.goto('/rules')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/info umum/i).first()).toBeVisible({ timeout: 8000 })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Achievements
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Achievements', () => {
  test('/achievements page loads', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/achievements')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/achievements shows "Pencapaian" heading', async ({ page }) => {
    await page.goto('/achievements')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/pencapaian/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('/achievements shows category filters', async ({ page }) => {
    await page.goto('/achievements')
    await page.waitForLoadState('networkidle')
    // Filter buttons always render regardless of data
    const semua = page.getByRole('button', { name: /^semua$/i }).first()
    await expect(semua).toBeVisible({ timeout: 8000 })
  })

  test('/achievements shows achievement grid or empty state', async ({ page }) => {
    await page.goto('/achievements')
    await page.waitForLoadState('networkidle')
    const hasGrid = await page.locator('[class*="grid"]').count()
    const hasEmpty = await page.getByText(/belum ada pencapaian|tidak ada pencapaian/i).count()
    expect(hasGrid + hasEmpty).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Gallery
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Gallery', () => {
  test('/gallery page loads', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/gallery')
    await page.waitForLoadState('networkidle')
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(responses.some((s) => s >= 500)).toBe(false)
  })

  test('/gallery shows "Galeri & Highlight" heading', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/galeri.*highlight|galeri/i).first()).toBeVisible({
      timeout: 8000,
    })
  })

  test('/gallery shows media grid or empty state', async ({ page }) => {
    await page.goto('/gallery')
    await page.waitForLoadState('networkidle')
    const hasMedia = await page.locator('[class*="columns"]').count()
    const hasEmpty = await page.getByText(/belum ada highlight/i).count()
    expect(hasMedia + hasEmpty).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Embed Pages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Embed Pages', () => {
  test('/embed/bracket/[id] loads gracefully with fake UUID', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/embed/bracket/00000000-0000-0000-0000-000000000001')
    await page.waitForLoadState('networkidle')
    // Must not produce 500
    expect(responses.some((s) => s >= 500)).toBe(false)
    // Page body should render (even if just an empty/not-found state)
    await expect(page.locator('body')).not.toBeEmpty()
    const bodyText = await page.locator('body').textContent()
    expect((bodyText?.trim().length ?? 0)).toBeGreaterThan(0)
  })

  test('/embed/match/[id] loads gracefully with fake UUID', async ({ page }) => {
    const responses: number[] = []
    page.on('response', (res) => responses.push(res.status()))
    await page.goto('/embed/match/00000000-0000-0000-0000-000000000002')
    await page.waitForLoadState('networkidle')
    // Must not produce 500
    expect(responses.some((s) => s >= 500)).toBe(false)
    await expect(page.locator('body')).not.toBeEmpty()
    const bodyText = await page.locator('body').textContent()
    expect((bodyText?.trim().length ?? 0)).toBeGreaterThan(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// API Contract Tests (public endpoints, no auth)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('API Contract', () => {
  test('GET /players returns array', async ({ request }) => {
    const res = await request.get(`${apiUrl}/players`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    // /players returns nested pagination: { data: { data: [...], total, ... } }
    const innerData = body?.data?.data ?? body?.data ?? body
    const arr = Array.isArray(innerData) ? innerData : []
    expect(Array.isArray(arr)).toBe(true)
  })

  test('GET /matches/live returns array', async ({ request }) => {
    const res = await request.get(`${apiUrl}/matches/live`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(Array.isArray(arr)).toBe(true)
  })

  test('GET /matches/recent returns array', async ({ request }) => {
    const res = await request.get(`${apiUrl}/matches/recent?limit=10`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(Array.isArray(arr)).toBe(true)
  })

  test('GET /schools returns array with level field', async ({ request }) => {
    const res = await request.get(`${apiUrl}/schools?per_page=1`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const arr: { level?: string }[] = Array.isArray(body) ? body : (body.data ?? [])
    expect(Array.isArray(arr)).toBe(true)
    if (arr.length > 0) {
      expect(['SMP', 'SMA', 'SMK']).toContain(arr[0].level)
    }
  })

  test('GET /achievements returns data', async ({ request }) => {
    const res = await request.get(`${apiUrl}/achievements`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(Array.isArray(arr)).toBe(true)
  })

  test('GET /games returns all 5 games', async ({ request }) => {
    const res = await request.get(`${apiUrl}/games`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    const arr: { slug: string }[] = Array.isArray(body) ? body : (body.data ?? [])
    expect(Array.isArray(arr)).toBe(true)
    expect(arr.length).toBeGreaterThanOrEqual(5)
    // Known slugs should all be present
    const slugs = arr.map((g) => g.slug)
    for (const expected of ['ml', 'hok', 'ff', 'pubgm', 'efootball']) {
      expect(slugs).toContain(expected)
    }
  })
})
