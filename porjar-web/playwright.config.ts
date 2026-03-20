import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests assume the full stack is running via docker-compose.
 * Start with: docker-compose up -d
 * Run tests:  npm run test:e2e
 *
 * Credentials come from seed.go — run `go run ./scripts/seed.go` first.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4200'
const API_URL  = process.env.E2E_API_URL  || 'http://localhost:9090/api/v1'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,       // run sequentially within each file — tests may share DB state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 2 workers = 2 spec files run in parallel, safe for Next.js dev server.
  // Bump to 4+ only when running against a production build (next build && next start).
  workers: process.env.CI ? 2 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    // ── Setup: create auth sessions once, reuse across tests ──────────────
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ── Chromium (primary) ────────────────────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/player.json',
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },

    // ── Mobile (smoke) ────────────────────────────────────────────────────
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        storageState: 'e2e/.auth/player.json',
      },
      dependencies: ['setup'],
      testMatch: /public\.spec\.ts/,   // only public pages on mobile
    },
  ],

  // Expose to all test files
  globalSetup: undefined,
})

export { BASE_URL, API_URL }
