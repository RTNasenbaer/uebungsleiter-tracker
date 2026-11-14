// SPDX-License-Identifier: AGPL-3.0-or-later
import { api, expect, expectAccessible, screenshot, test } from './fixtures';

test('new series in the past → open list for "Nachtragen" → bulk confirm', async ({ page, login }) => {
  await login();
  await page.goto('/neu');
  await expect(page.getByRole('heading', { name: 'Neues Training' })).toBeVisible();
  await page.getByLabel('Mannschaft / Gruppe').fill('U12');
  await page.getByLabel('Ort').fill('Sporthalle Mitte');
  await page.getByRole('switch', { name: 'Wiederholen' }).check();
  await page.getByLabel('Startdatum').fill('2026-09-01');
  await page.getByLabel('von', { exact: true }).fill('18:00');
  await page.getByLabel('bis', { exact: true }).fill('19:30');
  await expect(page.getByRole('button', { name: 'Di', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Do', exact: true }).click();
  await expect(page.getByTestId('past-hint')).toHaveText(
    '20 vergangene Termine werden zum Nachtragen angelegt.',
  );
  await screenshot(page, 'neu-serie');
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Speichern' }).click();

  await expect(page).toHaveURL(/\/offen$/);
  const items = page.getByTestId('open-list').getByRole('listitem');
  await expect(items).toHaveCount(20);
  await expect(items.first()).toContainText('Do, 05.11.2026');
  await expect(items.last()).toContainText('Di, 01.09.2026');
  await screenshot(page, 'offen');
  await expectAccessible(page);

  await page.getByLabel('Alle auswählen').check();
  await expect(page.getByText('20 ausgewählt')).toBeVisible();
  await page.getByRole('button', { name: 'Alle markierten: gehalten' }).click();
  await expect(page.getByText('Keine offenen Termine.')).toBeVisible();

  await page.goto('/');
  // 20 held sessions × 15,00 € in 2026; November: 2 held (03.11., 05.11.)
  await expect(page.getByTestId('sum-year')).toHaveText('300,00 €');
  await expect(page.getByTestId('sum-month')).toHaveText('30,00 €');
  await expect(page.getByText('Di, 10.11.2026, 18:00–19:30')).toBeVisible();
  await screenshot(page, 'start');
  await expectAccessible(page);

  await page.goto('/trainings');
  await expect(page.getByTestId('series-card')).toContainText('U12 · Training');
  await expect(page.getByTestId('series-card')).toContainText('Di, Do · 18:00–19:30 · jede Woche');
  await screenshot(page, 'trainings');
  await expectAccessible(page);
});

test('edit series session: "nur dieser" vs. "dieser und alle folgenden"', async ({ page, login }) => {
  await login();
  await api(page, 'POST', '/api/series', {
    title: 'Training',
    team: 'U12',
    location: 'Halle A',
    weekdays: 2,
    startTime: '18:00',
    endTime: '19:30',
    startsOn: '2026-11-01',
  });

  await page.goto('/termine');
  await page.getByLabel('Von', { exact: true }).fill('2026-11-17');
  await page.getByLabel('Bis', { exact: true }).fill('2026-12-08');
  await page.getByRole('button', { name: 'Di, 17.11.2026' }).click();
  await page.getByLabel('Ort').fill('Ausweichhalle');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByTestId('scope-dialog')).toBeVisible();
  await screenshot(page, 'scope-dialog');
  await page.getByRole('button', { name: 'Nur dieser Termin' }).click();
  await expect(page.getByTestId('scope-dialog')).toBeHidden();
  const range = '/api/sessions?from=2026-11-17&to=2026-12-08';
  await expect
    .poll(async () => (await api(page, 'GET', range)).map((s: { location: string }) => s.location))
    .toEqual(['Ausweichhalle', 'Halle A', 'Halle A', 'Halle A']);

  await page.getByRole('button', { name: 'Di, 24.11.2026' }).click();
  await page.getByLabel('von', { exact: true }).fill('17:00');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.getByRole('button', { name: 'Dieser und alle folgenden' }).click();
  await expect(page.getByTestId('scope-dialog')).toBeHidden();
  await expect
    .poll(async () =>
      (await api(page, 'GET', range)).map((s: { date: string; startTime: string }) => [s.date, s.startTime]),
    )
    .toEqual([
      ['2026-11-17', '18:00'],
      ['2026-11-24', '17:00'],
      ['2026-12-01', '17:00'],
      ['2026-12-08', '17:00'],
    ]);
  const series = await api(page, 'GET', '/api/series');
  expect(series).toHaveLength(2);
  await screenshot(page, 'termine');
  await expectAccessible(page);
});

test('single training and holidays', async ({ page, login }) => {
  await login();
  await api(page, 'POST', '/api/series', {
    title: 'Training',
    team: 'U14',
    weekdays: 4, // Wednesday
    startTime: '17:00',
    endTime: '18:30',
    startsOn: '2026-11-01',
  });
  await page.goto('/ausfaelle');
  await page.getByLabel('Bezeichnung').fill('Weihnachtsferien');
  await page.getByLabel('Von', { exact: true }).fill('2026-12-21');
  await page.getByLabel('Bis', { exact: true }).fill('2027-01-06');
  await page.getByRole('button', { name: 'Ausfall hinzufügen' }).last().click();
  await expect(page.getByTestId('exception-list')).toContainText('Weihnachtsferien');
  await screenshot(page, 'ausfaelle');
  await expectAccessible(page);

  const sessions = await api(page, 'GET', '/api/sessions?from=2026-12-14&to=2027-01-13');
  expect(sessions.map((s: { date: string }) => s.date)).toEqual(['2026-12-16', '2027-01-13']);

  // single training ("Turnier") via + Neu
  await page.goto('/neu');
  await page.getByLabel('Training', { exact: true }).fill('Turnier');
  await page.getByLabel('Mannschaft / Gruppe').fill('U14');
  await page.getByLabel('Datum').fill('2026-11-21');
  await page.getByLabel('von', { exact: true }).fill('10:00');
  await page.getByLabel('bis', { exact: true }).fill('16:00');
  await page.getByLabel('Art').selectOption('tournament');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page).toHaveURL(/\/kalender$/);
  await page.getByRole('button', { name: /Sa, 21\.11\.2026/ }).click();
  await expect(page.getByText('10:00–16:00')).toBeVisible();
  await screenshot(page, 'kalender');
  await expectAccessible(page);
});
