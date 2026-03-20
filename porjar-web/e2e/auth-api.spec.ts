/**
 * auth-api.spec.ts — Extended auth flow E2E tests
 *
 * Covers missing auth flows not in api.spec.ts or password-reset.spec.ts:
 *   1. Auth API Contract Tests (login response shape, /me with PUT, etc.)
 *   2. Token Refresh edge cases
 *   3. Password Change API (direct HTTP)
 *   4. Forgot Password UI
 *   5. Logout API
 */
import { test, expect } from '@playwright/test'
import { USERS } from './fixtures'

const API = process.env.E2E_API_URL || 'http://localhost:9090/api/v1'

// All tests in this file run without stored auth state
test.use({ storageState: { cookies: [], origins: [] } })

// ─── Helper: login and return tokens + user ─────────────────────────────────
async function apiLogin(
  request: import('@playwright/test').APIRequestContext,
  email: string,
  password: string,
) {
  const res = await request.post(`${API}/auth/login`, {
    data: { email, password },
  })
  const body = await res.json()
  return { res, body, data: body.data }
}

// =============================================================================
// 1. Auth API Contract Tests
// =============================================================================
test.describe('Auth API Contract Tests', () => {
  test('POST /auth/login with valid creds returns 200 + access_token + refresh_token + user', async ({ request }) => {
    const { res, data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)
    expect(res.status()).toBe(200)
    expect(data.access_token).toBeTruthy()
    expect(typeof data.access_token).toBe('string')
    expect(data.refresh_token).toBeTruthy()
    expect(typeof data.refresh_token).toBe('string')
    expect(data.user).toBeDefined()
    expect(data.user.email).toBe(USERS.player1.email)
    expect(data.user.role).toBe('player')
    expect(data.user.id).toBeTruthy()
    expect(data.user.full_name).toBeTruthy()
    // expires_in should be a positive number
    expect(data.expires_in).toBeGreaterThan(0)
  })

  test('POST /auth/login with invalid creds returns 401', async ({ request }) => {
    const { res, body } = await apiLogin(request, USERS.player1.email, 'TotallyWrongPass999')
    expect(res.status()).toBe(401)
    expect(body.success).toBe(false)
  })

  test('POST /auth/login with empty body returns 400 or 422', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: {} })
    expect([400, 422]).toContain(res.status())
  })

  test('GET /auth/me without auth returns 401', async ({ request }) => {
    const res = await request.get(`${API}/auth/me`)
    expect(res.status()).toBe(401)
  })

  test('GET /auth/me with valid token returns 200 + user object', async ({ request }) => {
    const { data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)
    const meRes = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    expect(meRes.status()).toBe(200)
    const meBody = await meRes.json()
    expect(meBody.success).toBe(true)
    expect(meBody.data.email).toBe(USERS.player1.email)
    expect(meBody.data.id).toBeTruthy()
    expect(meBody.data.role).toBe('player')
  })

  test('PUT /auth/me without auth returns 401', async ({ request }) => {
    const res = await request.put(`${API}/auth/me`, {
      data: { full_name: 'Unauthorized Update' },
    })
    expect(res.status()).toBe(401)
  })

  test('PUT /auth/me with valid token updates full_name and returns 200', async ({ request }) => {
    const { data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)
    const originalName = data.user.full_name

    // Update the name
    const updateRes = await request.put(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
      data: { full_name: `E2E Updated ${Date.now()}` },
    })
    expect(updateRes.status()).toBe(200)
    const updateBody = await updateRes.json()
    expect(updateBody.success).toBe(true)
    expect(updateBody.data.full_name).toContain('E2E Updated')

    // Restore original name so we don't pollute other tests
    await request.put(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
      data: { full_name: originalName },
    })
  })
})

// =============================================================================
// 2. Token Refresh API
// =============================================================================
test.describe('Token Refresh API', () => {
  test('POST /auth/refresh with valid refresh_token returns 200 + new tokens', async ({ request }) => {
    const { data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)

    const refreshRes = await request.post(`${API}/auth/refresh`, {
      data: { refresh_token: data.refresh_token },
    })
    expect(refreshRes.status()).toBe(200)
    const refreshBody = await refreshRes.json()
    expect(refreshBody.success).toBe(true)
    expect(refreshBody.data.access_token).toBeTruthy()
    expect(refreshBody.data.refresh_token).toBeTruthy()
    expect(refreshBody.data.expires_in).toBeGreaterThan(0)
    // New refresh token should differ from original (rotation)
    expect(refreshBody.data.refresh_token).not.toBe(data.refresh_token)
  })

  test('POST /auth/refresh with invalid token returns 401', async ({ request }) => {
    const res = await request.post(`${API}/auth/refresh`, {
      data: { refresh_token: 'completely-invalid-refresh-token-xyz' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('POST /auth/refresh without body returns 400 or 422', async ({ request }) => {
    const res = await request.post(`${API}/auth/refresh`, {
      data: {},
    })
    // Empty refresh_token triggers validation error
    expect([400, 422]).toContain(res.status())
  })

  test('POST /auth/refresh with empty refresh_token string returns 400 or 422', async ({ request }) => {
    const res = await request.post(`${API}/auth/refresh`, {
      data: { refresh_token: '' },
    })
    expect([400, 422]).toContain(res.status())
  })
})

// =============================================================================
// 3. Password Change API
// =============================================================================
test.describe('Password Change API', () => {
  test('PUT /auth/change-password without auth returns 401', async ({ request }) => {
    const res = await request.put(`${API}/auth/change-password`, {
      data: {
        old_password: 'SomePass123',
        new_password: 'AnotherPass123',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('PUT /auth/change-password with wrong old password returns 400 or 401', async ({ request }) => {
    // Login to get a valid token
    const { data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)

    const res = await request.put(`${API}/auth/change-password`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
      data: {
        old_password: 'CompletelyWrongOldPassword999',
        new_password: 'ValidNewPass123',
      },
    })
    expect([400, 401]).toContain(res.status())
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('PUT /auth/change-password with empty fields returns 400 or 422', async ({ request }) => {
    const { data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)

    const res = await request.put(`${API}/auth/change-password`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
      data: {
        old_password: '',
        new_password: '',
      },
    })
    expect([400, 422]).toContain(res.status())
  })
})

// =============================================================================
// 4. Forgot Password UI
// =============================================================================
test.describe('Forgot Password UI', () => {
  test('/forgot-password page loads with heading', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')
    await expect(
      page.getByText('Lupa Password', { exact: false }),
    ).toBeVisible()
  })

  test('has email input field', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')
    const emailInput = page.locator('#email')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('submit with empty email stays on page', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /kirim/i }).click()

    // Should stay on /forgot-password (validation prevents navigation)
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/forgot-password/)
  })

  test('submit with valid email shows success message or stays on page', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    await page.locator('#email').fill(USERS.player1.email)
    await page.getByRole('button', { name: /kirim/i }).click()

    // Wait for either success message or page to remain stable (can't verify email delivery)
    const successMsg = page.getByText(
      /jika email terdaftar|link reset password telah dikirim/i,
    )

    await Promise.race([
      successMsg.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null),
      page.waitForTimeout(3000),
    ])

    // Page must not show a 500 server error
    await expect(page.getByText(/500|internal server error/i)).not.toBeVisible()
    // Page should still be on forgot-password or show success content
    await expect(page).toHaveURL(/\/forgot-password/)
  })
})

// =============================================================================
// 5. Logout API
// =============================================================================
test.describe('Logout API', () => {
  test('POST /auth/logout with valid token and refresh_token returns 204', async ({ request }) => {
    // Login first to get tokens
    const { data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)

    const res = await request.post(`${API}/auth/logout`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
      data: { refresh_token: data.refresh_token },
    })
    // Logout returns 204 No Content on success
    expect(res.status()).toBe(204)
  })

  test('POST /auth/logout without auth returns 400 or 422 (missing refresh_token)', async ({ request }) => {
    // No auth header and no refresh_token — should get validation error
    const res = await request.post(`${API}/auth/logout`, {
      data: {},
    })
    // The endpoint validates refresh_token presence before checking auth
    expect([400, 401, 422]).toContain(res.status())
  })

  test('POST /auth/logout with empty refresh_token returns 400, 422, or 204', async ({ request }) => {
    const { data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)

    const res = await request.post(`${API}/auth/logout`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
      data: { refresh_token: '' },
    })
    // API may read refresh_token from HttpOnly cookie when body is empty → 204 success
    expect([204, 400, 422]).toContain(res.status())
  })

  test('access token is invalid after logout', async ({ request }) => {
    // Login, logout, then try to use the access token
    const { data } = await apiLogin(request, USERS.player1.email, USERS.player1.password)

    // Logout
    await request.post(`${API}/auth/logout`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
      data: { refresh_token: data.refresh_token },
    })

    // Try using the old access token — should be rejected
    const meRes = await request.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    // Token blacklisted after logout — expect 401
    expect(meRes.status()).toBe(401)
  })
})
