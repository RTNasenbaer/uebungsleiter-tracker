// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 8790);

export default defineConfig({
  testDir: './tests',
  outputDir: '../test-results/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // E2E_BROWSERS=chromium-desktop,mobile-android limits the run (e.g. hosts without WebKit/Firefox system libs)
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'firefox-desktop',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } },
    },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile-android', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 15'] } },
  ].filter((p) => !process.env.E2E_BROWSERS || process.env.E2E_BROWSERS.split(',').includes(p.name)),
  webServer: {
    command: 'bash ./start-server.sh',
    url: `http://localhost:${PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { E2E_PORT: String(PORT) },
  },
});
