import { Page, expect } from '@playwright/test'

// ── Seed credentials (from scripts/seed.go) ──────────────────────────────────
export const USERS = {
  admin:       { email: 'admin@porjar.test',       password: 'Admin1234', role: 'admin' },
  superadmin:  { email: 'superadmin@porjar.test',  password: 'Super1234', role: 'superadmin' },
  player1:     { email: 'player1@porjar.test',     password: 'Player1234', role: 'player' },
  player2:     { email: 'player2@porjar.test',     password: 'Player1234', role: 'player' },
} as const

// ── Login helper (UI) ─────────────────────────────────────────────────────────
export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  // Press Enter to submit — avoids Next.js dev overlay intercepting button clicks
  await page.locator('#password').press('Enter')
  // wait until redirect completes
  await page.waitForURL(/\/(admin|dashboard|coach)/, { timeout: 10_000 })
}

// ── Login helper (API) — fastest way to seed cookies for protected tests ─────
export async function loginViaAPI(
  page: Page,
  email: string,
  password: string,
) {
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:9090/api/v1'
  const res = await page.request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  })
  const body = await res.json()

  // Set access token cookie so Next.js middleware recognises the session.
  // The API now also sets HttpOnly cookies in the response, but we still
  // need the non-HttpOnly access_token cookie for Next.js middleware (Edge Runtime).
  if (body.data?.access_token) {
    await page.context().addCookies([
      {
        name: 'access_token',
        value: body.data.access_token,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 3600,
      },
      {
        name: 'user_role',
        value: body.data.user?.role ?? 'player',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) + 3600,
      },
    ])
    // Refresh token is now an HttpOnly cookie set by the API response.
    // No need to store in localStorage.
  }

  return body.data
}

// ── Wait for toast ────────────────────────────────────────────────────────────
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }))
    .toBeVisible({ timeout: 5_000 })
}
