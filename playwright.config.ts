import { defineConfig, devices } from '@playwright/test'

/**
 * E2E-тесты идут на продакшен-сборке и на отдельной базе lic_test:
 * рабочий прогресс в базе lic тесты не трогают.
 */
const PORT = 3300
const TEST_DATABASE_URL = 'postgres://lic:lic@localhost:5433/lic_test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: {
    command: `node e2e/prepare-db.mjs && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    env: { DATABASE_URL: TEST_DATABASE_URL },
    reuseExistingServer: false,
    // Первая холодная сборка воркера с компилятором TypeScript долгая; дальше работает кеш .next/cache.
    timeout: 600_000,
  },
})
