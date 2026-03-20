/**
 * team.spec.ts — Team creation and management E2E tests
 *
 * Covers:
 *   1. Team Creation Page  — UI elements render correctly
 *   2. Form Validation     — client-side / server-side error toasts
 *   3. Team Creation Flow  — happy-path end-to-end submission
 *   4. Teams List Page     — list page loads and exposes a "create" entry-point
 *
 * Prerequisites:
 *   - Full stack running (`docker-compose up`)
 *   - DB seeded (`go run ./scripts/seed.go`)
 *   - Auth sessions created by auth.setup.ts
 *
 * Shadcn <Select> interaction note:
 *   shadcn Select renders a hidden <select> + a visible <button role="combobox">.
 *   To choose an option: click the combobox trigger, then click the desired
 *   <div role="option"> that appears in the portal. Two selects on the page are
 *   addressed by index: .nth(0) = game selector, .nth(1) = school selector.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { USERS, expectToast } from './fixtures'

// ── Reuse the pre-authenticated player session ──────────────────────────────
test.use({ storageState: path.join(__dirname, '.auth/player.json') })

const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:9090/api/v1'

// ── Shared selectors ─────────────────────────────────────────────────────────
const CREATE_URL  = '/dashboard/teams/create'
const LIST_URL    = '/dashboard/teams'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Team Creation Page — element visibility
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Team Creation Page', () => {

  test('page loads correctly', async ({ page }) => {
    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    // Page must not have redirected to login
    await expect(page).not.toHaveURL(/\/login/)

    // The main heading should confirm we are on the right form
    await expect(
      page.getByText('Buat Tim Baru', { exact: false }),
    ).toBeVisible()
  })

  test('shows team name input', async ({ page }) => {
    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    // The text field for the team name
    const nameInput = page.getByPlaceholder('Masukkan nama tim')
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toBeEditable()
  })

  test('shows game selector', async ({ page }) => {
    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    // The first combobox trigger is the game (Cabang E-Sport) selector.
    // shadcn Select renders role="combobox" on the trigger button.
    const gameTrigger = page.getByRole('combobox').nth(0)
    await expect(gameTrigger).toBeVisible()

    // Default placeholder text should indicate no game has been chosen yet
    await expect(gameTrigger).toContainText(/pilih game/i)
  })

  test('shows school selector', async ({ page }) => {
    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    // The second combobox trigger is the school (Sekolah) selector
    const schoolTrigger = page.getByRole('combobox').nth(1)
    await expect(schoolTrigger).toBeVisible()

    // Default placeholder text should indicate no school has been chosen
    await expect(schoolTrigger).toContainText(/pilih sekolah/i)
  })

  test('shows submit button', async ({ page }) => {
    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    const submitBtn = page.getByRole('button', { name: /buat tim/i })
    await expect(submitBtn).toBeVisible()
  })

  test('cancel button navigates back to teams list', async ({ page }) => {
    await page.goto(CREATE_URL, { timeout: 30_000 })
    await page.waitForLoadState('networkidle')

    // "Batal" is a back/cancel link or button
    const cancelEl = page
      .getByRole('link',   { name: /batal/i })
      .or(page.getByRole('button', { name: /batal/i }))

    await expect(cancelEl).toBeVisible()
    await cancelEl.click()

    // After cancelling, user should land on the teams list
    await expect(page).toHaveURL(/\/dashboard\/teams$/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Form Validation — missing-field error toasts
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Form Validation', () => {

  test('requires team name', async ({ page }) => {
    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    // Leave name blank and submit immediately
    await page.getByRole('button', { name: /buat tim/i }).click()

    // Expect an error toast about the missing team name
    await expectToast(page, /nama tim wajib diisi/i)
  })

  test('requires game selection', async ({ page }) => {
    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    // Fill in the team name but leave game and school unselected
    await page.getByPlaceholder('Masukkan nama tim').fill('Tim Validasi Game')

    await page.getByRole('button', { name: /buat tim/i }).click()

    // Expect an error toast about the missing game/cabang e-sport
    await expectToast(page, /pilih cabang e-sport/i)
  })

  test('requires school selection', async ({ page }) => {
    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    // Fill in name and pick a game, but leave school empty
    await page.getByPlaceholder('Masukkan nama tim').fill('Tim Validasi Sekolah')

    // Open game combobox (index 0) and pick the first available option
    await page.getByRole('combobox').nth(0).click()
    await page.waitForSelector('[role="option"]', { state: 'visible' })
    await page.getByRole('option').first().click()

    // Submit without selecting a school
    await page.getByRole('button', { name: /buat tim/i }).click()

    // Expect an error toast about the missing school
    await expectToast(page, /pilih sekolah/i)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Team Creation Flow — happy-path
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Team Creation Flow', () => {

  test('creates team with valid data', async ({ page, request }) => {
    // Clean up any "Test Team *" entries from prior runs so player1 can create again
    const loginRes = await request.post(`${apiUrl}/auth/login`, {
      data: { email: USERS.player1.email, password: USERS.player1.password },
    })
    const loginBody = await loginRes.json()
    const token: string = loginBody.data?.access_token ?? ''
    const takenGameIds = new Set<string>()
    if (token) {
      const teamsRes = await request.get(`${apiUrl}/teams/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const teamsBody = await teamsRes.json()
      for (const team of (teamsBody.data ?? [])) {
        if (typeof team.name === 'string' && team.name.startsWith('Test Team')) {
          await request.delete(`${apiUrl}/teams/${team.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        } else if (team.game?.id) {
          // Track game IDs where player1 already has a team (to avoid them)
          takenGameIds.add(team.game.id)
        }
      }
    }

    // Find a game where player1 is not already in a team
    const gamesRes = await request.get(`${apiUrl}/games`)
    const gamesBody = await gamesRes.json()
    const availableGame = (gamesBody.data ?? []).find(
      (g: { id: string; is_active: boolean }) => g.is_active && !takenGameIds.has(g.id)
    )
    if (!availableGame) {
      test.skip(true, 'Player1 has a team in every available game')
      return
    }

    await page.goto(CREATE_URL)
    await page.waitForLoadState('networkidle')

    // ── Step 1: Enter a unique team name ──────────────────────────────────
    const uniqueName = `Test Team ${Date.now()}`
    await page.getByPlaceholder('Masukkan nama tim').fill(uniqueName)

    // ── Step 2: Select a game where player1 has no existing team ─────────
    // Click the first combobox trigger to open the game dropdown portal
    await page.getByRole('combobox').nth(0).click()

    // Wait for the shadcn Select portal options to mount in the DOM
    await page.waitForSelector('[role="option"]', { state: 'visible' })

    // Pick the option matching our chosen available game (by partial name match)
    const gameOption = page.getByRole('option').filter({ hasText: availableGame.name })
    await gameOption.first().click()

    // ── Step 3: Select the first available school ─────────────────────────
    // Wait for React to finish re-rendering after game selection
    // (game info paragraph "X-Y pemain" appears once the state update settles)
    await page.getByText(/pemain/i).first().waitFor({ state: 'visible', timeout: 3_000 }).catch(() => {})

    await page.getByRole('combobox').nth(1).waitFor({ state: 'visible' })
    await page.getByRole('combobox').nth(1).click()

    // Wait for school options to appear
    await expect(page.getByRole('option').first()).toBeVisible({ timeout: 5_000 })

    // Pick the topmost available school option
    await page.getByRole('option').first().click()

    // ── Step 4: Submit the form ───────────────────────────────────────────
    await page.getByRole('button', { name: /buat tim/i }).click()

    // ── Step 5: Assert success toast ─────────────────────────────────────
    // The API creates the team and returns a pending-approval confirmation
    await expectToast(page, /berhasil dibuat/i)

    // ── Step 6: Assert redirect to teams list ────────────────────────────
    await expect(page).toHaveURL(/\/dashboard\/teams$/, { timeout: 10_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Teams List Page — basic health checks
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Teams List Page', () => {

  test('shows teams list page', async ({ page }) => {
    await page.goto(LIST_URL)
    await page.waitForLoadState('networkidle')

    // Must stay on the teams list URL (not redirected to login)
    await expect(page).toHaveURL(/\/dashboard\/teams/)
    await expect(page).not.toHaveURL(/\/login/)

    // No server-side 500 error rendered to the user
    await expect(page.getByText(/500|internal server error/i)).not.toBeVisible()

    // Page body itself must be present and non-empty
    await expect(page.locator('body')).toBeVisible()
  })

  test('has link to create team', async ({ page }) => {
    await page.goto(LIST_URL)
    await page.waitForLoadState('networkidle')

    // There should be at least one "Buat Tim"-style entry-point on the list page.
    // It may be rendered as an <a> link or a <button>; either is acceptable.
    const createEntryPoint = page
      .getByRole('link',   { name: /buat tim/i })
      .or(page.getByRole('button', { name: /buat tim/i }))

    await expect(createEntryPoint.first()).toBeVisible()
  })
})
