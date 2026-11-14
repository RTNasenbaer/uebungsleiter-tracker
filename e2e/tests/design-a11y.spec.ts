// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * DESIGN.md §14 acceptance: axe without serious/critical (WCAG 2.2 AA) in light and dark,
 * no horizontal scrolling at 320 px and at 200 % zoom, visible keyboard focus everywhere.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { api, expect, test } from './fixtures';

const PAGES = [
  '/',
  '/offen',
  '/neu',
  '/kalender',
  '/termine',
  '/trainings',
  '/ausfaelle',
  '/geraete',
  '/export',
  '/einstellungen',
  '/alarm',
  '/ueber',
];

async function seed(page: Page) {
  await api(page, 'POST', '/api/series', {
    title: 'Techniktraining',
    team: 'U12 Leistungsgruppe',
    location: 'Sporthalle am Gymnasium mit sehr langem Namen',
    weekdays: 2 | 8,
    startTime: '18:00',
    endTime: '19:30',
    startsOn: '2026-10-01',
  });
  await api(page, 'POST', '/api/exceptions', {
    label: 'Herbstferien',
    fromDate: '2026-10-19',
    toDate: '2026-10-30',
    seriesId: null,
  });
}

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${page.url()} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe('design acceptance', () => {
  test.skip(({ browserName }) => browserName === 'firefox', 'axe frame analysis crashes Firefox in CI');

  for (const scheme of ['light', 'dark'] as const) {
    test(`axe on every page (${scheme})`, async ({ page, login }) => {
      test.setTimeout(180_000);
      await page.emulateMedia({ colorScheme: scheme });
      await login();
      await seed(page);
      const found: string[] = [];
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.locator('h1').first()).toBeVisible();
        // data loaded and state transitions (fast = 120 ms, e.g. disabled → enabled) finished
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(300);
        found.push(...(await seriousViolations(page)));
      }
      expect(found).toEqual([]);
    });
  }

  test('no horizontal scrolling at 320 px and at 200 % zoom', async ({ page, login }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'viewport is set explicitly');
    test.setTimeout(180_000);
    await login();
    await seed(page);
    const overflow: string[] = [];
    // 320 × 640 = phone; 640 × 400 = 1280 × 800 at 200 % zoom
    for (const size of [
      { width: 320, height: 640 },
      { width: 640, height: 400 },
    ]) {
      await page.setViewportSize(size);
      for (const path of [...PAGES, '/login']) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const px = await horizontalOverflow(page);
        if (px > 0) overflow.push(`${size.width}px ${path}: +${px}px`);
      }
    }
    expect(overflow).toEqual([]);
  });

  test('keyboard: every focus stop on the start page is visible', async ({ page, login }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile'), 'keyboard path on desktop');
    await login();
    await seed(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Start' })).toBeVisible();
    const invisible: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          name: `${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30)}`,
          visible: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
          onScreen: r.width > 0 && r.height > 0,
        };
      });
      if (info && info.onScreen && !info.visible) invisible.push(info.name);
    }
    expect(invisible).toEqual([]);
  });
});
