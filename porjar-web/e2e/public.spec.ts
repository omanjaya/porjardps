/**
 * public.spec.ts — Public pages accessible without login
 *
 * Covers:
 *  - Landing page loads
 *  - Tournament list shows tournaments
 *  - Tournament detail accessible
 *  - Games page loads
 *  - Schedule page loads
 *  - /login and /register pages render
 *  - Core performance: pages respond within 3s
 */
import { test, expect } from '@playwright/test'

// No auth needed — use empty state
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Landing & nav', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/)
    // Page should have rendered HTML body content
    await expect(page.locator('body')).not.toBeEmpty()
  })

  test('homepage has navigation links', async ({ page }) => {
    await page.goto('/')
    // Use domcontentloaded — networkidle can hang on pages with GSAP animations
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    const linkCount = await page.locator('a[href]').count()
    expect(linkCount).toBeGreaterThan(0)
  })
})

test.describe('Tournaments', () => {
  test('tournament list page loads', async ({ page }) => {
    const start = Date.now()
    await page.goto('/tournaments')
    expect(Date.now() - start).toBeLessThan(3000)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('tournament list shows content or empty state', async ({ page }) => {
    await page.goto('/tournaments')
    await page.waitForLoadState('networkidle')
    // Tournament cards are <Link href="/tournaments/[id]"> elements
    // Empty state shows "Belum Ada Turnamen"
    const hasTournaments = await page.locator('a[href*="/tournaments/"]:not([href="/tournaments"])').count()
    const hasEmpty = await page.getByText(/Belum Ada Turnamen|tidak ada|no tournament/i).count()
    expect(hasTournaments + hasEmpty).toBeGreaterThan(0)
  })
})

test.describe('Games', () => {
  test('games page loads', async ({ page }) => {
    await page.goto('/games')
    await expect(page).not.toHaveURL(/\/login/)
  })
})

test.describe('Schedule', () => {
  test('schedule page loads', async ({ page }) => {
    await page.goto('/schedule')
    await expect(page).not.toHaveURL(/\/login/)
  })
})

test.describe('Auth pages', () => {
  test('/login page renders form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email|nisn/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /masuk|login/i })).toBeVisible()
  })

  test('/register page renders form', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/^password$/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /daftar|register|buat/i })).toBeVisible()
  })

  test('/forgot-password page renders', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page).not.toHaveURL(/404|not.found/)
  })
})
