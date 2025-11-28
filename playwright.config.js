// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const path = require('path');

/**
 * Playwright configuration for CRA app
 */
module.exports = defineConfig({
  testDir: 'tests',
  testMatch: '**/e2e/**/*.spec.js', // 只运行e2e目录下的测试
  globalSetup: path.join(__dirname, 'tests', 'global-setup.js'),
  timeout: 60 * 1000,
  expect: { timeout: 10000 }, // 增加断言超时时间
  fullyParallel: false, // 串行执行避免数据冲突
  retries: 1, // 失败重试1次
  workers: 1, // 单worker避免并发问题
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure', // 失败时保留追踪
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000 // 操作超时时间
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
