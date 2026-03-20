/**
 * auth.setup.ts — runs once before the test suite.
 * Logs in as each role and saves the browser storage state so other tests
 * can reuse the session without re-logging in.
 */
import { test as setup } from '@playwright/test'
import { loginViaAPI, USERS } from './fixtures'
import path from 'path'
import fs from 'fs'

const AUTH_DIR = path.join(__dirname, '.auth')

setup('create player session', async ({ page }) => {
  await loginViaAPI(page, USERS.player1.email, USERS.player1.password)
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  await page.context().storageState({ path: path.join(AUTH_DIR, 'player.json') })
})

setup('create admin session', async ({ page }) => {
  await loginViaAPI(page, USERS.admin.email, USERS.admin.password)
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  await page.context().storageState({ path: path.join(AUTH_DIR, 'admin.json') })
})
