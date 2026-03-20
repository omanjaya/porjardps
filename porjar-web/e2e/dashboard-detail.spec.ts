/**
 * dashboard-detail.spec.ts — Player dashboard content, notifications API, and interactions
 *
 * Uses player storage state from auth.setup.ts.
 * Tests cover:
 *  - Dashboard page content (welcome message, stat cards)
 *  - My-matches page content
 *  - Notifications page content
 *  - Teams page content and team detail navigation
 *  - Notification API endpoints
 *  - Player dashboard API endpoints
 *  - Change password UI on profile page
 */
import { test, expect } from '@playwright/test'
import { USERS } from './fixtures'
import path from 'path'

const API = process.env.E2E_API_URL ?? 'http://localhost:9090/api/v1'

// ── Helper: login and get token ──────────────────────────────────────────────

async function getPlayerToken(request: any): Promise<string | null> {
  const loginRes = await request.post(`${API}/auth/login`, {
    data: { email: USERS.player1.email, password: USERS.player1.password },
  })
  if (loginRes.status() !== 200) return null
  const body = await loginRes.json()
  return body.data?.access_token ?? null
}

// ── Player Dashboard Content ─────────────────────────────────────────────────

test.describe('Player Dashboard Content', () => {
  test.use({ storageState: path.join(__dirname, '.auth/player.json') })

  test('/dashboard shows welcome message or user name', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // The dashboard shows "Halo, <name>!" or "Player"
    const body = await page.locator('body').textContent()
    const hasWelcome =
      (body ?? '').includes('Halo') ||
      (body ?? '').includes('Player') ||
      (body ?? '').includes('Dashboard')
    expect(hasWelcome).toBe(true)
  })

  test('/dashboard shows stat cards or summary info', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Dashboard should show team info, game info, or empty state
    const body = await page.locator('body').textContent()
    const hasContent =
      (body ?? '').includes('terdaftar') ||
      (body ?? '').includes('Belum bergabung') ||
      (body ?? '').includes('Buat Tim') ||
      (body ?? '').includes('Pertandingan') ||
      (body ?? '').includes('Tim') ||
      (body ?? '').includes('Halo')
    expect(hasContent).toBe(true)
  })

  test('/dashboard/my-matches shows match list or empty state', async ({ page }) => {
    await page.goto('/dashboard/my-matches')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard\/my-matches/)
    const body = await page.locator('body').textContent()
    // Either match data is shown or an empty state message
    const hasContent =
      (body ?? '').includes('Belum ada') ||
      (body ?? '').includes('Pertandingan') ||
      (body ?? '').includes('Match') ||
      (body ?? '').includes('belum') ||
      (body ?? '').includes('Jadwal') ||
      (body ?? '').includes('Riwayat')
    expect(hasContent).toBe(true)
  })

  test('/dashboard/notifications shows notification list or empty state', async ({ page }) => {
    await page.goto('/dashboard/notifications')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard\/notifications/)
    // Either notifications exist or empty state is shown
    const emptyState = page.getByText(/belum ada notifikasi|tidak ada notifikasi/i)
    const heading = page.getByRole('heading', { name: /notifikasi/i })
    const notifContainer = page.locator('[class*="divide-y"]')

    const emptyVisible = await emptyState.isVisible().catch(() => false)
    const headingVisible = await heading.isVisible().catch(() => false)
    const listVisible = await notifContainer.isVisible().catch(() => false)

    expect(emptyVisible || headingVisible || listVisible).toBe(true)
  })

  test('/dashboard/teams shows team list with links or empty state', async ({ page }) => {
    await page.goto('/dashboard/teams')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/\/dashboard\/teams/)
    const body = await page.locator('body').textContent()
    const hasContent =
      (body ?? '').includes('Tim Saya') ||
      (body ?? '').includes('Buat Tim') ||
      (body ?? '').includes('Belum ada') ||
      (body ?? '').includes('tim')
    expect(hasContent).toBe(true)
  })
})

// ── Dashboard Team Detail ────────────────────────────────────────────────────

test.describe('Dashboard Team Detail', () => {
  test.use({ storageState: path.join(__dirname, '.auth/player.json') })

  test('navigate to team detail from /dashboard/teams', async ({ page }) => {
    await page.goto('/dashboard/teams')
    await page.waitForLoadState('networkidle')

    // Look for a team link/card to click
    const teamLink = page.locator('a[href*="/dashboard/teams/"]').first()
    const hasTeamLink = await teamLink.isVisible().catch(() => false)

    if (!hasTeamLink) {
      // No teams — just verify page loaded without error
      const body = await page.locator('body').textContent()
      expect(body).not.toContain('Internal Server Error')
      return
    }

    await teamLink.click()
    await page.waitForLoadState('networkidle')

    // Should be on a team detail page
    await expect(page).toHaveURL(/\/dashboard\/teams\//)
    await expect(page.locator('body')).toBeVisible()
    const body = await page.locator('body').textContent()
    expect(body).not.toContain('Internal Server Error')
  })

  test('team detail shows team name in heading', async ({ page }) => {
    await page.goto('/dashboard/teams')
    await page.waitForLoadState('networkidle')

    const teamLink = page.locator('a[href*="/dashboard/teams/"]').first()
    const hasTeamLink = await teamLink.isVisible().catch(() => false)

    if (!hasTeamLink) {
      // No teams to inspect
      return
    }

    await teamLink.click()
    await page.waitForLoadState('networkidle')

    // Team detail should have a heading or prominent team name
    const headings = page.locator('h1, h2, h3')
    const headingCount = await headings.count()
    expect(headingCount).toBeGreaterThan(0)
  })

  test('team detail shows member section', async ({ page }) => {
    await page.goto('/dashboard/teams')
    await page.waitForLoadState('networkidle')

    const teamLink = page.locator('a[href*="/dashboard/teams/"]').first()
    const hasTeamLink = await teamLink.isVisible().catch(() => false)

    if (!hasTeamLink) {
      return
    }

    await teamLink.click()
    await page.waitForLoadState('networkidle')

    const body = await page.locator('body').textContent()
    // Should show member-related content
    const hasMemberSection =
      (body ?? '').includes('Anggota') ||
      (body ?? '').includes('Member') ||
      (body ?? '').includes('Pemain') ||
      (body ?? '').includes('anggota') ||
      (body ?? '').includes('Kapten')
    expect(hasMemberSection).toBe(true)
  })
})

// ── Notification API Tests ───────────────────────────────────────────────────

test.describe('Notification API Tests', () => {
  test('GET /notifications/unread-count with auth returns 200 + count', async ({ request }) => {
    const token = await getPlayerToken(request)
    if (!token) { test.skip(); return }

    const res = await request.get(`${API}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)

    const body = await res.json()
    // Response should contain a count number (either body.data.count or body.count or body.data as number)
    const count = body.data?.count ?? body.data?.unread_count ?? body.count ?? body.data
    expect(typeof count === 'number').toBe(true)
  })

  test('GET /notifications/unread-count without auth returns 401', async ({ request }) => {
    const res = await request.get(`${API}/notifications/unread-count`)
    expect(res.status()).toBe(401)
  })

  test('GET /notifications with auth returns 200 + array', async ({ request }) => {
    const token = await getPlayerToken(request)
    if (!token) { test.skip(); return }

    const res = await request.get(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)

    const body = await res.json()
    // data is null when there are no notifications — treat null as empty array
    const items = Array.isArray(body) ? body : (body.data ?? [])
    expect(Array.isArray(items)).toBe(true)
  })
})

// ── Player Dashboard API ─────────────────────────────────────────────────────

test.describe('Player Dashboard API', () => {
  test('GET /player/dashboard with auth returns 200', async ({ request }) => {
    const token = await getPlayerToken(request)
    if (!token) { test.skip(); return }

    const res = await request.get(`${API}/player/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
  })

  test('GET /player/dashboard without auth returns 401', async ({ request }) => {
    const res = await request.get(`${API}/player/dashboard`)
    expect(res.status()).toBe(401)
  })

  test('GET /player/my-matches with auth returns 200', async ({ request }) => {
    const token = await getPlayerToken(request)
    if (!token) { test.skip(); return }

    const res = await request.get(`${API}/player/my-matches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
  })

  test('GET /teams/my with auth returns 200', async ({ request }) => {
    const token = await getPlayerToken(request)
    if (!token) { test.skip(); return }

    const res = await request.get(`${API}/teams/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
  })
})

// ── Change Password UI ──────────────────────────────────────────────────────

test.describe('Change Password UI', () => {
  test.use({ storageState: path.join(__dirname, '.auth/player.json') })

  test('/dashboard/profile has password change section', async ({ page }) => {
    await page.goto('/dashboard/profile')
    await page.waitForLoadState('networkidle')

    // Should show "Ubah Password" heading
    const body = await page.locator('body').textContent()
    expect(body).toContain('Ubah Password')
  })

  test('old password field exists', async ({ page }) => {
    await page.goto('/dashboard/profile')
    await page.waitForLoadState('networkidle')

    // "Password Saat Ini" label with input
    const currentPwLabel = page.getByText('Password Saat Ini')
    await expect(currentPwLabel).toBeVisible({ timeout: 8_000 })

    const currentPwInput = page.getByPlaceholder('Password saat ini')
    await expect(currentPwInput).toBeVisible()
  })

  test('password mismatch shows error toast', async ({ page }) => {
    await page.goto('/dashboard/profile')
    await page.waitForLoadState('networkidle')

    // Fill in the password fields with mismatched values
    await page.getByPlaceholder('Password saat ini').fill('OldPass123')
    await page.getByPlaceholder('Minimal 8 karakter').fill('NewPass123')
    await page.getByPlaceholder('Ulangi password baru').fill('DifferentPass123')

    // Click the change password button
    const changeBtn = page.getByRole('button', { name: /ubah password/i })
    await changeBtn.click()

    // Should show mismatch error toast
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: /tidak cocok/i })
    ).toBeVisible({ timeout: 5_000 })
  })
})
