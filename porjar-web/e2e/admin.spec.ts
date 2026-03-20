/**
 * admin.spec.ts — Admin dashboard flows
 *
 * Uses admin auth state saved by auth.setup.ts.
 * Covers:
 *  - Admin dashboard loads
 *  - Tournament list/management loads
 *  - Analytics page loads
 *  - User management loads
 *  - Activity log loads
 */
import { test, expect } from '@playwright/test'
import path from 'path'

// Use pre-saved admin session
test.use({ storageState: path.join(__dirname, '.auth/admin.json') })

test.describe('Admin Dashboard', () => {
  test('admin home loads', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('tournament management page loads', async ({ page }) => {
    await page.goto('/admin/tournaments')
    await expect(page).toHaveURL(/\/admin\/tournaments/)
  })

  test('analytics page loads', async ({ page }) => {
    await page.goto('/admin/analytics')
    await expect(page).toHaveURL(/\/admin\/analytics/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('user management page loads', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('activity log page loads', async ({ page }) => {
    await page.goto('/admin/activities')
    await expect(page).toHaveURL(/\/admin\/activities/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('schools page loads', async ({ page }) => {
    await page.goto('/admin/schools')
    await expect(page).toHaveURL(/\/admin\/schools/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('schedules page loads', async ({ page }) => {
    await page.goto('/admin/schedules')
    await expect(page).toHaveURL(/\/admin\/schedules/)
    await expect(page).not.toHaveURL(/\/login/)
  })
})

// ── Admin Tournament Detail ───────────────────────────────────────────────────

test.describe('Admin Tournament Detail', () => {
  test('tournament detail page accessible if tournament exists', async ({ page }) => {
    await page.goto('/admin/tournaments')
    await page.waitForLoadState('networkidle')

    // Look for any tournament link rendered in the table/list
    const tournamentLinks = page.locator('a[href*="/admin/tournaments/"]')
    const count = await tournamentLinks.count()

    if (count > 0) {
      await tournamentLinks.first().click()
      await page.waitForLoadState('domcontentloaded')
      // Must not redirect to login or crash
      await expect(page).not.toHaveURL(/\/login/)
      await expect(page.locator('body')).toBeVisible()
      const bodyText = await page.locator('body').innerText()
      expect(bodyText).not.toMatch(/500|Internal Server Error/i)
    } else {
      // No tournaments seeded — just verify list page itself is stable
      await expect(page).not.toHaveURL(/\/login/)
      await expect(page.locator('body')).toBeVisible()
    }
  })
})

// ── Admin Submissions Management ─────────────────────────────────────────────

test.describe('Admin Submissions Management', () => {
  test('submissions page loads', async ({ page }) => {
    await page.goto('/admin/submissions')
    await expect(page).toHaveURL(/\/admin\/submissions/)
    await expect(page).not.toHaveURL(/\/login/)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toMatch(/500|Internal Server Error/i)
  })

  test('live monitoring page loads', async ({ page }) => {
    await page.goto('/admin/live')
    await expect(page).toHaveURL(/\/admin\/live/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('settings page loads', async ({ page }) => {
    await page.goto('/admin/settings')
    await expect(page).toHaveURL(/\/admin\/settings/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('webhooks page loads', async ({ page }) => {
    await page.goto('/admin/webhooks')
    await expect(page).toHaveURL(/\/admin\/webhooks/)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('rules management page loads', async ({ page }) => {
    await page.goto('/admin/rules')
    await expect(page).toHaveURL(/\/admin\/rules/)
    await expect(page).not.toHaveURL(/\/login/)
  })
})
