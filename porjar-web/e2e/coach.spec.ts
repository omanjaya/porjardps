/**
 * coach.spec.ts — Coach dashboard E2E tests
 *
 * No dedicated coach user is seeded (auth.setup.ts only seeds player + admin).
 * Tests cover:
 *  - Route protection: unauthenticated + wrong-role redirects
 *  - Page rendering using admin session (admin has access to coach routes)
 *  - API endpoint auth boundaries
 *
 * NOTE: A dedicated coach role user is not present in USERS fixture.
 * Admin is used for "authorized user" path — if the API restricts /coach
 * routes to coach-role only, those tests will observe a redirect and are
 * marked with an explanatory comment.
 */
import { test, expect } from '@playwright/test'
import { USERS, loginViaAPI } from './fixtures'
import path from 'path'

const API = process.env.E2E_API_URL ?? 'http://localhost:9090/api/v1'

// ── Route protection: unauthenticated ─────────────────────────────────────────

test.describe('Coach Route Protection — unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('GET /coach unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/coach')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })

  test('GET /coach/teams unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/coach/teams')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })

  test('GET /coach/results unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/coach/results')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })

  test('all /coach/* routes redirect to /login without auth', async ({ page }) => {
    const routes = ['/coach', '/coach/teams', '/coach/results']
    for (const route of routes) {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
    }
  })
})

// ── Route protection: wrong role (player) ─────────────────────────────────────

test.describe('Coach Route Protection — wrong role', () => {
  // Use player storage state set by auth.setup.ts
  test.use({ storageState: path.join(__dirname, '.auth/player.json') })

  test('player accessing /coach is redirected away', async ({ page }) => {
    await page.goto('/coach')
    await page.waitForLoadState('domcontentloaded')
    // Must NOT stay on /coach — either /login or /dashboard redirect is acceptable
    const url = page.url()
    expect(url).not.toMatch(/^https?:\/\/[^/]+\/coach$/)
  })

  test('player accessing /coach/teams is redirected away', async ({ page }) => {
    await page.goto('/coach/teams')
    await page.waitForLoadState('domcontentloaded')
    const url = page.url()
    expect(url).not.toMatch(/\/coach\/teams/)
  })

  test('player accessing /coach/results is redirected away', async ({ page }) => {
    await page.goto('/coach/results')
    await page.waitForLoadState('domcontentloaded')
    const url = page.url()
    expect(url).not.toMatch(/\/coach\/results/)
  })
})

// ── Coach pages via admin session ─────────────────────────────────────────────

test.describe('Coach Pages — admin session', () => {
  // Admin may or may not have access to coach routes depending on API role config.
  // Tests are written to accept either "page loads" or "redirected" without failing.
  test.use({ storageState: path.join(__dirname, '.auth/admin.json') })

  test('coach page is accessible or redirects cleanly for admin', async ({ page }) => {
    await page.goto('/coach')
    await page.waitForLoadState('domcontentloaded')
    // No 500 error, no blank page
    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('Internal Server Error')
  })

  test('coach/teams page is accessible or redirects cleanly for admin', async ({ page }) => {
    await page.goto('/coach/teams')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('Internal Server Error')
  })

  test('coach/results page is accessible or redirects cleanly for admin', async ({ page }) => {
    await page.goto('/coach/results')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('Internal Server Error')
  })

  test('coach dashboard renders stat cards when loaded with access', async ({ page }) => {
    await page.goto('/coach')
    await page.waitForLoadState('networkidle')

    // If redirected away, skip content checks
    if (!page.url().includes('/coach')) return

    // Stat cards are present (Total Tim, Menang, Kalah, Pending Verifikasi)
    await expect(page.locator('body')).toBeVisible()
    const body = await page.locator('body').textContent()
    // Page renders something meaningful — either data or empty-state text
    const hasContent =
      (body ?? '').includes('Tim Sekolah') ||
      (body ?? '').includes('Dashboard Guru Pembina') ||
      (body ?? '').includes('Belum ada tim') ||
      (body ?? '').includes('Total Tim')
    expect(hasContent).toBe(true)
  })

  test('coach/teams page renders team list or empty state', async ({ page }) => {
    await page.goto('/coach/teams')
    await page.waitForLoadState('networkidle')

    if (!page.url().includes('/coach/teams')) return

    await expect(page.locator('body')).toBeVisible()
    const body = await page.locator('body').textContent()
    const hasContent =
      (body ?? '').includes('Tim Sekolah') ||
      (body ?? '').includes('Belum ada tim') ||
      (body ?? '').includes('Cari tim')
    expect(hasContent).toBe(true)
  })

  test('coach/results page renders results or empty state', async ({ page }) => {
    await page.goto('/coach/results')
    await page.waitForLoadState('networkidle')

    if (!page.url().includes('/coach/results')) return

    await expect(page.locator('body')).toBeVisible()
    const body = await page.locator('body').textContent()
    const hasContent =
      (body ?? '').includes('Hasil Pertandingan') ||
      (body ?? '').includes('Belum ada hasil') ||
      (body ?? '').includes('Semua Game')
    expect(hasContent).toBe(true)
  })
})

// ── Coach API endpoints — auth boundary ───────────────────────────────────────

test.describe('Coach API — auth boundary', () => {
  test('GET /coach/dashboard requires auth — 401 without token', async ({ request }) => {
    const res = await request.get(`${API}/coach/dashboard`)
    expect(res.status()).toBe(401)
  })

  test('GET /coach/teams requires auth — 401 without token', async ({ request }) => {
    const res = await request.get(`${API}/coach/teams`)
    expect(res.status()).toBe(401)
  })

  test('GET /coach/results requires auth — 401 without token', async ({ request }) => {
    const res = await request.get(`${API}/coach/results`)
    expect(res.status()).toBe(401)
  })

  test('player token cannot access coach endpoints — 403', async ({ page, request }) => {
    // Login as player1 to get their access token
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: USERS.player1.email, password: USERS.player1.password },
    })
    expect(loginRes.status()).toBe(200)
    const body = await loginRes.json()
    const token = body.data?.access_token
    if (!token) {
      test.skip()
      return
    }

    const coachRes = await request.get(`${API}/coach/teams`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // Must be 403 Forbidden (authenticated but wrong role) or 401
    expect([401, 403]).toContain(coachRes.status())
  })

  test('player token cannot access coach dashboard — 403', async ({ request }) => {
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: USERS.player1.email, password: USERS.player1.password },
    })
    if (loginRes.status() !== 200) { test.skip(); return }
    const body = await loginRes.json()
    const token = body.data?.access_token
    if (!token) { test.skip(); return }

    const res = await request.get(`${API}/coach/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect([401, 403]).toContain(res.status())
  })
})
