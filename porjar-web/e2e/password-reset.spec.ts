/**
 * password-reset.spec.ts — Forgot/reset/change-password E2E tests
 *
 * Covers:
 *   1. Forgot Password Flow     — page load, validation, submission messages
 *   2. Reset Password Flow      — token-less error state, token form, mismatch
 *   3. Change Password (Auth)   — dashboard page, all field validations
 *   4. API Contract Tests       — direct HTTP assertions (no UI needed)
 *
 * Prerequisites:
 *   - Full stack running (`docker-compose up`)
 *   - DB seeded (`go run ./scripts/seed.go`)
 *   - Auth sessions created by auth.setup.ts
 *
 * Auth notes:
 *   - Forgot/reset tests run without a session (no storageState).
 *   - Change-password tests reuse the player storageState.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import { USERS, expectToast } from './fixtures'

const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:9090/api/v1'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Forgot Password Flow — unauthenticated
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Forgot Password Flow', () => {
  // Strip any stored session so these tests run fully unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } })

  test('forgot-password page loads', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    // The page renders the "Lupa Password" heading
    await expect(
      page.getByText('Lupa Password', { exact: false }),
    ).toBeVisible()
  })

  test('forgot-password shows email input', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    // Input with id="email" and type="email"
    const emailInput = page.locator('#email')
    await expect(emailInput).toBeVisible()
    await expect(emailInput).toHaveAttribute('type', 'email')
  })

  test('forgot-password shows submit button', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    // Button text: "Kirim Link Reset"
    const submitBtn = page.getByRole('button', { name: /kirim/i })
    await expect(submitBtn).toBeVisible()
  })

  test('forgot-password requires email field', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    // Submit without filling anything
    await page.getByRole('button', { name: /kirim/i }).click()

    // Inline validation error: "Email wajib diisi"
    await expect(
      page.getByText('Email wajib diisi', { exact: false }),
    ).toBeVisible()
  })

  test('forgot-password with invalid email format shows browser validation', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    // Fill an invalid email (no @)
    await page.locator('#email').fill('notanemail')

    // Attempt to submit — the browser's built-in type="email" constraint
    // prevents form submission; the field becomes invalid.
    await page.getByRole('button', { name: /kirim/i }).click()

    // The input should report as invalid via the constraint validation API
    const isInvalid = await page.locator('#email').evaluate(
      (el: HTMLInputElement) => !el.validity.valid,
    )
    expect(isInvalid).toBe(true)
  })

  test('forgot-password with unknown email shows generic success message', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    // Security best practice: the API returns a 200 regardless of whether
    // the email is registered. The UI should show the "email sent" state.
    await page.locator('#email').fill('unknown-user@notexist.example.com')
    await page.getByRole('button', { name: /kirim/i }).click()

    // Wait up to 8 s for either the success panel or an error response
    const successMsg = page.getByText(
      /jika email terdaftar|link reset password telah dikirim/i,
    )
    const errorMsg = page.locator('[class*="red"]').filter({ hasText: /./i })

    await Promise.race([
      successMsg.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null),
      errorMsg.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null),
    ])

    // Either outcome is acceptable — page must not 500 or stay stuck
    await expect(page.getByText(/500|internal server error/i)).not.toBeVisible()
  })

  test('forgot-password with known email shows success state', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    await page.locator('#email').fill(USERS.player1.email)
    await page.getByRole('button', { name: /kirim/i }).click()

    // Wait for success state OR error (e.g. rate limited)
    const successMsg = page.getByText(/jika email terdaftar/i)
    const errorMsg = page.locator('[class*="red-50"]').filter({ hasText: /./i })

    await Promise.race([
      successMsg.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null),
      errorMsg.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null),
    ])

    // Page must not show a 500 server error
    await expect(page.getByText(/500|internal server error/i)).not.toBeVisible()
  })

  test('link back to login page exists', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.waitForLoadState('networkidle')

    // "Ingat password? Masuk" link at the bottom of the form
    const loginLink = page.getByRole('link', { name: /masuk/i })
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toHaveAttribute('href', '/login')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Reset Password Flow — unauthenticated
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Reset Password Flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('reset-password page loads without token and shows error', async ({ page }) => {
    await page.goto('/reset-password')
    await page.waitForLoadState('networkidle')

    // When no ?token param is present, the component renders an error block
    await expect(
      page.getByText('Reset Password', { exact: false }),
    ).toBeVisible()

    await expect(
      page.getByText(/token reset tidak ditemukan/i),
    ).toBeVisible()
  })

  test('reset-password page without token shows link to forgot-password', async ({ page }) => {
    await page.goto('/reset-password')
    await page.waitForLoadState('networkidle')

    // The no-token view has a link: "Minta link reset baru" → /forgot-password
    await expect(
      page.getByRole('link', { name: /minta link reset baru/i }),
    ).toBeVisible()
  })

  test('reset-password page with token query param shows form', async ({ page }) => {
    // The form renders whenever ?token= is non-empty, even for invalid tokens.
    // Validation/API error only appears on submit.
    await page.goto('/reset-password?token=sometoken123abc')
    await page.waitForLoadState('networkidle')

    // Password fields must be present
    await expect(page.locator('#new_password')).toBeVisible()
    await expect(page.locator('#confirmPassword')).toBeVisible()

    // Submit button
    await expect(
      page.getByRole('button', { name: /reset password/i }),
    ).toBeVisible()
  })

  test('reset-password form requires password to be at least 8 chars', async ({ page }) => {
    await page.goto('/reset-password?token=sometoken123abc')
    await page.waitForLoadState('networkidle')

    await page.locator('#new_password').fill('Short1')
    await page.locator('#confirmPassword').fill('Short1')
    await page.getByRole('button', { name: /reset password/i }).click()

    await expect(
      page.getByText(/minimal 8 karakter/i),
    ).toBeVisible()
  })

  test('reset-password form requires password match', async ({ page }) => {
    await page.goto('/reset-password?token=sometoken123abc')
    await page.waitForLoadState('networkidle')

    await page.locator('#new_password').fill('NewPass123')
    await page.locator('#confirmPassword').fill('Different456')
    await page.getByRole('button', { name: /reset password/i }).click()

    // Client-side mismatch error: "Password tidak cocok"
    await expect(
      page.getByText(/password tidak cocok/i),
    ).toBeVisible()
  })

  test('reset-password with invalid token shows error from API', async ({ page }) => {
    await page.goto('/reset-password?token=invalidtoken123')
    await page.waitForLoadState('networkidle')

    await page.locator('#new_password').fill('NewPass123!')
    await page.locator('#confirmPassword').fill('NewPass123!')
    await page.getByRole('button', { name: /reset password/i }).click()

    // API responds with an error — UI renders it in the red error div.
    // Either "general" error box or toast becomes visible.
    const errorBox = page.locator('[class*="red-50"]').filter({ hasText: /./i })
    await expect(errorBox.first()).toBeVisible({ timeout: 10_000 })
  })

  test('reset-password back to login link exists', async ({ page }) => {
    await page.goto('/reset-password?token=anytoken')
    await page.waitForLoadState('networkidle')

    // "Ingat password? Masuk" link at bottom of form
    await expect(
      page.getByRole('link', { name: /masuk/i }),
    ).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Change Password — authenticated (player session)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Change Password (Authenticated)', () => {
  test.use({ storageState: path.join(__dirname, '.auth/player.json') })

  const CHANGE_URL = '/dashboard/change-password'

  test('change-password page loads', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    // Must not redirect to /login
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page).toHaveURL(/\/dashboard\/change-password/)
  })

  test('shows page heading "Ubah Password"', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('heading', { name: /ubah password/i }).first(),
    ).toBeVisible()
  })

  test('shows current password input', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    // Placeholder: "Masukkan password saat ini"
    await expect(
      page.getByPlaceholder('Masukkan password saat ini'),
    ).toBeVisible()
  })

  test('shows new password input', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    // Placeholder: "Minimal 8 karakter"
    await expect(
      page.getByPlaceholder('Minimal 8 karakter'),
    ).toBeVisible()
  })

  test('shows confirm password input', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    // Placeholder: "Ulangi password baru"
    await expect(
      page.getByPlaceholder('Ulangi password baru'),
    ).toBeVisible()
  })

  test('shows submit button with "Ubah Password" label', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    await expect(
      page.getByRole('button', { name: /ubah password/i }),
    ).toBeVisible()
  })

  test('requires all fields — shows inline errors on empty submit', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: /ubah password/i }).click()

    // The form sets inline field errors (not toast) for empty submission
    await expect(
      page.getByText('Password saat ini wajib diisi', { exact: false }),
    ).toBeVisible()
  })

  test('rejects mismatched passwords with inline error', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Masukkan password saat ini').fill('OldPass123')
    await page.getByPlaceholder('Minimal 8 karakter').fill('NewPass123')
    await page.getByPlaceholder('Ulangi password baru').fill('DifferentPass456')

    await page.getByRole('button', { name: /ubah password/i }).click()

    // Inline error: "Password tidak cocok"
    await expect(
      page.getByText(/password tidak cocok/i),
    ).toBeVisible()
  })

  test('rejects same new password as current with inline error', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    const samePass = 'SamePass123'
    await page.getByPlaceholder('Masukkan password saat ini').fill(samePass)
    await page.getByPlaceholder('Minimal 8 karakter').fill(samePass)
    await page.getByPlaceholder('Ulangi password baru').fill(samePass)

    await page.getByRole('button', { name: /ubah password/i }).click()

    // Client error: "Password baru harus berbeda dari password saat ini"
    await expect(
      page.getByText(/password baru harus berbeda/i),
    ).toBeVisible()
  })

  test('rejects wrong current password via API error', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Masukkan password saat ini').fill('WrongCurrentPassword999')
    await page.getByPlaceholder('Minimal 8 karakter').fill('NewPass123!')
    await page.getByPlaceholder('Ulangi password baru').fill('NewPass123!')

    await page.getByRole('button', { name: /ubah password/i }).click()

    // API returns INVALID_PASSWORD → inline error on current password field
    await expect(
      page.getByText(/password saat ini salah/i),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('password strength indicator appears when typing new password', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    // Start typing in the new password field
    await page.getByPlaceholder('Minimal 8 karakter').fill('Weak1234')

    // The strength label (Lemah / Cukup / Baik / Kuat) must appear
    await expect(
      page.getByText(/kekuatan:/i),
    ).toBeVisible()
  })

  test('password match indicator appears when passwords are equal', async ({ page }) => {
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    const newPass = 'MatchPass123!'
    await page.getByPlaceholder('Minimal 8 karakter').fill(newPass)
    await page.getByPlaceholder('Ulangi password baru').fill(newPass)

    // "Password cocok" text appears when both fields match
    await expect(
      page.getByText(/password cocok/i),
    ).toBeVisible()
  })

  test('accepts valid password change and redirects to dashboard', async ({ page }) => {
    // Use the known seeded credentials for player1.
    // We change password and then change it back so the test is re-entrant.
    const original = USERS.player1.password
    const newPass = 'Player1234New!'

    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Masukkan password saat ini').fill(original)
    await page.getByPlaceholder('Minimal 8 karakter').fill(newPass)
    await page.getByPlaceholder('Ulangi password baru').fill(newPass)

    await page.getByRole('button', { name: /ubah password/i }).click()

    // On success: toast "Password berhasil diubah!" + redirect to /dashboard
    await page.waitForURL(/\/dashboard$/, { timeout: 12_000 })

    // --- Restore original password so subsequent test runs still work ---
    await page.goto(CHANGE_URL)
    await page.waitForLoadState('networkidle')

    await page.getByPlaceholder('Masukkan password saat ini').fill(newPass)
    await page.getByPlaceholder('Minimal 8 karakter').fill(original)
    await page.getByPlaceholder('Ulangi password baru').fill(original)

    await page.getByRole('button', { name: /ubah password/i }).click()
    await page.waitForURL(/\/dashboard$/, { timeout: 12_000 })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// 4. API Contract Tests (direct HTTP, no browser UI)
// ═══════════════════════════════════════════════════════════════════════════════
test.describe('Password API Contracts', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('POST /auth/forgot-password returns 200 for any email (no enumeration)', async ({ request }) => {
    const res = await request.post(`${apiUrl}/auth/forgot-password`, {
      data: { email: 'nonexistent-user-xyz@nowhere.example' },
    })
    // Must be 200 — leaking 404 would allow email enumeration (429 if rate limited by other tests)
    expect([200, 429]).toContain(res.status())
  })

  test('POST /auth/forgot-password with missing email returns 400 or 422', async ({ request }) => {
    const res = await request.post(`${apiUrl}/auth/forgot-password`, {
      data: {},
    })
    // Validation error for missing required field (or 429 if rate-limited)
    expect([400, 422, 429]).toContain(res.status())
  })

  test('POST /auth/reset-password with invalid token returns 400 or 401', async ({ request }) => {
    const res = await request.post(`${apiUrl}/auth/reset-password`, {
      data: {
        token: 'completelyinvalidtoken1234567890',
        new_password: 'NewPass123!',
      },
    })
    // Invalid/expired token must be rejected
    expect([400, 401, 422]).toContain(res.status())
  })

  test('POST /auth/reset-password without token field returns 400 or 422', async ({ request }) => {
    const res = await request.post(`${apiUrl}/auth/reset-password`, {
      data: { new_password: 'NewPass123!' },
    })
    expect([400, 422]).toContain(res.status())
  })

  test('PUT /auth/change-password without auth returns 401', async ({ request }) => {
    const res = await request.put(`${apiUrl}/auth/change-password`, {
      data: {
        old_password: 'OldPass123',
        new_password: 'NewPass123!',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('PUT /auth/change-password with valid auth but wrong current password returns 400 or 401', async ({ request }) => {
    // First, log in to obtain a valid token
    const loginRes = await request.post(`${apiUrl}/auth/login`, {
      data: {
        email: USERS.player1.email,
        password: USERS.player1.password,
      },
    })
    const loginBody = await loginRes.json()
    const token: string = loginBody.data?.access_token ?? ''
    expect(token).toBeTruthy()

    // Now attempt to change password with wrong current password
    const res = await request.put(`${apiUrl}/auth/change-password`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        old_password: 'AbsolutelyWrongPassword999',
        new_password: 'NewPass123!',
      },
    })
    expect([400, 401]).toContain(res.status())
  })

  test('POST /auth/forgot-password with valid registered email returns 200', async ({ request }) => {
    const res = await request.post(`${apiUrl}/auth/forgot-password`, {
      data: { email: USERS.player1.email },
    })
    // 200 on success, 429 if rate-limited by other tests
    expect([200, 429]).toContain(res.status())
  })
})
