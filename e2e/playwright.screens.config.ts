// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Screenshot tour for the design docs (not part of `pnpm test:e2e`):
 *   SCREENS_OUT=../docs/design/after pnpm --filter @ult/e2e screens
 * All projects run in Chromium so the tour also works on hosts without WebKit.
 */
import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

const sizes = [
  { name: 'pixel7', use: { ...devices['Pixel 7'] } },
  {
    name: 'iphone15',
    use: {
      ...devices['iPhone 15'],
      browserName: 'chromium' as const,
      defaultBrowserType: 'chromium' as const,
    },
  },
  { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
];

export default defineConfig({
  ...base,
  testDir: './screens',
  outputDir: '../test-results/screens-tour',
  reporter: [['list']],
  retries: 0,
  projects: sizes.flatMap((s) =>
    (['light', 'dark'] as const).map((scheme) => ({
      name: `${s.name}-${scheme}`,
      use: { ...s.use, colorScheme: scheme },
    })),
  ),
});
