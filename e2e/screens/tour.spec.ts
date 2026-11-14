// SPDX-License-Identifier: AGPL-3.0-or-later
/** Visits every screen with realistic demo data and stores screenshots for docs/design/. */
import { mkdirSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { api, expect, test } from '../tests/fixtures';

const OUT = process.env.SCREENS_OUT ?? '../test-results/screens-tour/out';

async function shot(page: Page, name: string) {
  const dir = `${OUT}/${test.info().project.name}`;
  mkdirSync(dir, { recursive: true });
  // let fonts and transitions settle
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/${name}.jpg`, fullPage: true, type: 'jpeg', quality: 72 });
}

async function seed(page: Page) {
  await api(page, 'PUT', '/api/settings', {
    displayName: 'Trainer, Test',
    reportRecipient: 'kasse@example.org',
    clubName: 'TV Beispielstadt',
  });
  await api(page, 'POST', '/api/series', {
    title: 'Training',
    team: 'U12',
    location: 'Sporthalle Mitte',
    weekdays: 2 | 8,
    startTime: '18:00',
    endTime: '19:30',
    startsOn: '2026-09-01',
  });
  await api(page, 'POST', '/api/series', {
    title: 'Techniktraining',
    team: 'U14',
    location: 'Halle Süd',
    weekdays: 16,
    startTime: '17:00',
    endTime: '18:30',
    startsOn: '2026-09-04',
    color: '#16a34a',
  });
  await api(page, 'POST', '/api/exceptions', {
    label: 'Herbstferien',
    fromDate: '2026-10-19',
    toDate: '2026-10-30',
    seriesId: null,
  });
  const open = (await api(page, 'GET', '/api/sessions/open')) as { occurrenceKey: string; date: string }[];
  // leave the three most recent ones open
  const answer = open.filter((s) => s.date < '2026-11-03');
  await api(page, 'POST', '/api/sessions/bulk', { keys: answer.map((s) => s.occurrenceKey), status: 'held' });
  const notHeld = answer.find((s) => s.date === '2026-10-08');
  if (notHeld)
    await api(page, 'POST', '/api/sessions/answer', {
      occurrence_key: notHeld.occurrenceKey,
      status: 'not_held',
    });
}

test('screen tour', async ({ page, login }) => {
  test.setTimeout(300_000);
  await page.goto('/login');
  await expect(page.getByRole('link', { name: 'Mit GitHub anmelden' })).toBeVisible();
  await shot(page, '12-login');
  await page.goto('/koppeln');
  await shot(page, '12b-koppeln');

  await login();
  await seed(page);

  // in-app question: a session that just ended
  await api(page, 'POST', '/api/sessions', {
    date: '2026-11-10',
    startTime: '10:00',
    endTime: '11:30',
    title: 'Training',
    team: 'U16',
    location: 'Sporthalle Mitte',
  });
  await page.goto('/');
  const dialog = page.getByTestId('answer-dialog');
  await expect(dialog).toBeVisible();
  await shot(page, '01-in-app-abfrage');
  await page.getByRole('button', { name: /Später/ }).click();
  await expect(dialog).toBeHidden();

  await page.goto('/');
  await expect(page.getByTestId('sum-year')).toBeVisible();
  await shot(page, '02-start');

  await page.goto('/offen');
  await expect(page.getByTestId('open-list')).toBeVisible();
  await shot(page, '03-offen');

  await page.goto('/neu');
  await shot(page, '04-neu');
  await page.getByRole('switch', { name: 'Wiederholen' }).check();
  await page.getByLabel('Mannschaft / Gruppe').fill('U10');
  await page.getByLabel('Startdatum').fill('2026-10-01');
  await shot(page, '04b-neu-serie');

  await page.goto('/kalender');
  await page.getByRole('button', { name: /Do, 12\.11\.2026/ }).click();
  await shot(page, '05-kalender');

  await page.goto('/termine');
  await expect(page.getByRole('button', { name: /Di, 10\.11\.2026/ }).first()).toBeVisible();
  await shot(page, '06-termine');
  await page
    .getByRole('button', { name: /Di, 17\.11\.2026/ })
    .first()
    .click();
  await shot(page, '06b-termin-bearbeiten');
  await page.getByLabel('Ort').fill('Ausweichhalle');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByTestId('scope-dialog')).toBeVisible();
  await shot(page, '06c-serientermin-aendern');
  await page.keyboard.press('Escape');

  await page.goto('/trainings');
  await expect(page.getByTestId('series-card').first()).toBeVisible();
  await shot(page, '06d-trainings');

  await page.goto('/ausfaelle');
  await expect(page.getByTestId('exception-list')).toBeVisible();
  await shot(page, '06e-ausfaelle');

  await page.goto('/geraete');
  await shot(page, '07-geraete');
  await page.getByRole('button', { name: 'Gerät koppeln' }).first().click();
  await expect(page.getByTestId('pairing-code')).toBeVisible();
  await shot(page, '07b-geraete-koppeln');
  await page.keyboard.press('Escape');

  await page.goto('/export');
  await expect(page.getByTestId('report-total')).toBeVisible();
  await shot(page, '08-export');

  await page.goto('/einstellungen');
  await expect(page.getByLabel('Name, Vorname')).toBeVisible();
  await shot(page, '09-einstellungen');

  await page.goto('/alarm');
  await shot(page, '10-alarm-einrichtung');

  await page.goto('/ueber');
  await shot(page, '13-ueber');
});
