/**
 * auth.spec.ts — Authentication flows
 */
import { test, expect } from '@playwright/test'
import { USERS } from './fixtures'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Login', () => {
  test('admin login redirects to /admin', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(USERS.admin.email)
    await page.locator('#password').fill(USERS.admin.password)
    await page.locator('#password').press('Enter')
    await page.waitForURL(/\/admin/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/admin/)
  })

  test('player login redirects to /dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(USERS.player1.email)
    await page.locator('#password').fill(USERS.player1.password)
    await page.locator('#password').press('Enter')
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('wrong credentials — stays on login page', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(USERS.player2.email)
    await page.locator('#password').fill('wrongpassword')
    await page.locator('#password').press('Enter')
    // Must NOT redirect away from login
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
  })

  test('empty form stays on login page', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#password').press('Enter')
    await expect(page).toHaveURL(/\/login/)
  })

  test('access_token cookie is set after login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(USERS.player1.email)
    await page.locator('#password').fill(USERS.player1.password)
    await page.locator('#password').press('Enter')
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
    const cookies = await page.context().cookies()
    const tokenCookie = cookies.find(c => c.name === 'access_token')
    expect(tokenCookie).toBeDefined()
    expect(tokenCookie!.value.length).toBeGreaterThan(20)
  })
})

test.describe('Register', () => {
  test('register with valid data redirects to /login', async ({ page }) => {
    const unique = Date.now()
    await page.goto('/register')
    await page.locator('#full_name').fill(`Test User ${unique}`)
    await page.locator('#email').fill(`testuser${unique}@porjar.test`)
    await page.locator('#password').fill('TestPass123')
    await page.locator('#confirmPassword').fill('TestPass123')
    // Check the consent checkbox (required since UU PDP compliance update)
    const consentCheck = page.locator('#consent')
    if (await consentCheck.count() > 0) {
      await consentCheck.check()
    }
    await page.locator('#confirmPassword').press('Enter')
    // Wait for the form submission + API call + redirect to settle
    await page.waitForLoadState('networkidle').catch(() => {})
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 })
  })

  test('duplicate email — stays on register page', async ({ page }) => {
    await page.goto('/register')
    await page.locator('#full_name').fill('Duplicate User')
    await page.locator('#email').fill(USERS.player1.email)
    await page.locator('#password').fill('TestPass123')
    await page.locator('#confirmPassword').fill('TestPass123')
    await page.locator('#confirmPassword').press('Enter')
    // Must NOT redirect to /login on duplicate email
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/register/)
  })

  test('password mismatch shows error', async ({ page }) => {
    await page.goto('/register')
    await page.locator('#full_name').fill('Mismatch User')
    await page.locator('#email').fill(`mismatch${Date.now()}@porjar.test`)
    await page.locator('#password').fill('TestPass123')
    await page.locator('#confirmPassword').fill('DifferentPass456')
    await page.locator('#confirmPassword').press('Enter')
    await expect(
      page.getByText(/tidak sama|mismatch|cocok|sesuai/i)
    ).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Logout', () => {
  test('logout redirects to /login', async ({ page }) => {
    // Login first via form
    await page.goto('/login')
    await page.locator('#email').fill(USERS.player1.email)
    await page.locator('#password').fill(USERS.player1.password)
    await page.locator('#password').press('Enter')
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
    // Wait for dashboard to fully hydrate before interacting with the header
    await page.waitForLoadState('networkidle').catch(() => {})

    // Logout button is an icon-only button (SignOut) in the header flex container.
    // Use evaluate() to dispatch a native DOM click that React's synthetic event system
    // responds to — needed because Next.js dev overlay can interfere with Playwright clicks.
    const logoutBtn = page.locator('header button').last()
    await logoutBtn.waitFor({ state: 'attached', timeout: 10_000 })
    await logoutBtn.evaluate((el) => (el as HTMLElement).click())

    // handleLogout() in DashboardLayout calls router.push('/') → home page
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 8_000 })
  })
})

test.describe('Route protection', () => {
  test('visiting /dashboard unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })

  test('visiting /admin unauthenticated redirects to /login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 })
  })

  test('player cannot access /admin', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(USERS.player1.email)
    await page.locator('#password').fill(USERS.player1.password)
    await page.locator('#password').press('Enter')
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
    await page.goto('/admin')
    await expect(page).not.toHaveURL(/^http:\/\/localhost:4200\/admin$/, { timeout: 8_000 })
  })
})
