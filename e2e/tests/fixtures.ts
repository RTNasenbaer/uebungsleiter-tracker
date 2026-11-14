// SPDX-License-Identifier: AGPL-3.0-or-later
import AxeBuilder from '@axe-core/playwright';
import { type Page, test as base, expect } from '@playwright/test';

/** Tuesday 10.11.2026, 12:00 Berlin – frozen in the browser and (via x-test-now) on the test server */
export const NOW = new Date('2026-11-10T12:00:00+01:00');

let counter = 0;

export const test = base.extend<{ login: (opts?: { at?: Date }) => Promise<{ userId: string }> }>({
  login: async ({ page }, use, testInfo) => {
    await use(async (opts = {}) => {
      const at = opts.at ?? NOW;
      await page.clock.install({ time: at });
      await page.addInitScript(() => localStorage.setItem('ult:test-now', '1'));
      const githubId = `e2e-${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}-${++counter}`;
      const res = await page.request.post('/api/test/login', {
        data: { githubId },
        headers: { 'x-test-now': at.toISOString() },
      });
      expect(res.ok()).toBeTruthy();
      return (await res.json()) as { userId: string };
    });
  },
});

export { expect };

export async function api(
  page: Page,
  method: string,
  path: string,
  data?: unknown,
  headers: Record<string, string> = {},
) {
  const now = await page.evaluate(() => new Date().toISOString());
  const res = await page.request.fetch(path, { method, data, headers: { 'x-test-now': now, ...headers } });
  expect(res.ok(), `${method} ${path}: ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

export async function screenshot(page: Page, name: string) {
  const project = test.info().project.name;
  await page.screenshot({ path: `../test-results/screens/${project}/${name}.png`, fullPage: true });
}

export async function expectAccessible(page: Page) {
  // Firefox crashes in CI during axe' frame analysis; Chromium + WebKit cover the same DOM.
  if (test.info().project.name === 'firefox-desktop') return;
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;
