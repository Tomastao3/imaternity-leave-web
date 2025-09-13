// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration for CRA app
 */
module.exports = defineConfig({
  testDir: 'tests',
  timeout: 60 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run e2e:start',
    port: 3000,
    reuseExistingServer: true,
    timeout: 180 * 1000,
    env: { BROWSER: 'none' }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }
  ]
});
