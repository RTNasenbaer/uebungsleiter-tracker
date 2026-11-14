// SPDX-License-Identifier: AGPL-3.0-or-later
import { api, expect, expectAccessible, screenshot, test } from './fixtures';

test('in-app question appears for a due session and records "Ja"', async ({ page, login }) => {
  await login(); // 10.11.2026 12:00
  // ended 11:30 → phone alarm 11:40 → in-app question from 11:38
  await api(page, 'POST', '/api/sessions', {
    date: '2026-11-10',
    startTime: '10:00',
    endTime: '11:30',
    title: 'Training',
    team: 'U12',
  });
  await page.goto('/');
  const dialog = page.getByTestId('answer-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('U12 Training');
  await expect(dialog).toContainText('Di, 10.11.2026');
  await screenshot(page, 'in-app-abfrage');
  await expectAccessible(page);
  await dialog.getByRole('button', { name: 'JA, gehalten' }).click();
  await expect(dialog).toBeHidden();
  const [s] = await api(page, 'GET', '/api/sessions?from=2026-11-10&to=2026-11-10');
  expect(s).toMatchObject({ status: 'held', answeredVia: 'web' });
});

test('"Später" snoozes the question', async ({ page, login }) => {
  await login();
  await api(page, 'POST', '/api/sessions', {
    date: '2026-11-10',
    startTime: '10:00',
    endTime: '11:30',
    title: 'Training',
    team: 'U14',
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Später (30 min)' }).click();
  await expect(page.getByTestId('answer-dialog')).toBeHidden();
  const [s] = await api(page, 'GET', '/api/sessions?from=2026-11-10&to=2026-11-10');
  expect(s.snoozedUntil).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Start' })).toBeVisible();
  await expect(page.getByTestId('answer-dialog')).toBeHidden();
});

test('devices: pairing code and switching the alarm device', async ({ page, login }) => {
  await login();
  await page.goto('/geraete');
  await page.getByRole('button', { name: 'Gerät koppeln' }).click();
  const code = page.getByTestId('pairing-code');
  await expect(code).toHaveText(/^\s*[A-Z0-9]{4} [A-Z0-9]{4}\s*$/);
  await expect(page.getByAltText('QR-Code zum Koppeln')).toBeVisible();
  await screenshot(page, 'geraete-koppeln');
  const plain = (await code.textContent())!.replace(/\s/g, '');

  // two phones redeem codes
  const client = { 'x-test-client': `${test.info().project.name}-${Date.now()}` };
  await api(page, 'POST', '/api/pair', { code: plain, name: 'Pixel 8' }, client);
  const { code: code2 } = await api(page, 'POST', '/api/devices/pairing-code');
  await api(page, 'POST', '/api/pair', { code: code2, name: 'Tablet' }, client);

  await page.keyboard.press('Escape');
  await page.reload();
  const list = page.getByTestId('device-list');
  await expect(list.getByRole('radio', { name: /Pixel 8/ })).toBeChecked();
  await list.getByRole('radio', { name: /Tablet/ }).check();
  await expect
    .poll(async () => {
      const devices = await api(page, 'GET', '/api/devices');
      return devices
        .filter((d: { isAlarmDevice: boolean }) => d.isAlarmDevice)
        .map((d: { name: string }) => d.name);
    })
    .toEqual(['Tablet']);
  await expect(list.getByText('Erinnerungsgerät')).toBeVisible();
  await screenshot(page, 'geraete');
  await expectAccessible(page);
});

test('settings and about page', async ({ page, login }) => {
  await login();
  await page.goto('/einstellungen');
  await page.getByLabel('Name, Vorname').fill('Trainer, Test');
  await page.getByLabel('Abgabefrist (TT.MM.)').fill('10.12.');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect
    .poll(async () => {
      const s = await api(page, 'GET', '/api/settings');
      return [s.displayName, s.reportDeadline];
    })
    .toEqual(['Trainer, Test', '12-10']);
  await screenshot(page, 'einstellungen');
  await expectAccessible(page);

  await page.goto('/ueber');
  await expect(page.getByTestId('source-link')).toHaveAttribute(
    'href',
    /github\.com\/.+\/uebungsleiter-tracker/,
  );
  await expect(page.getByText('AGPL-3.0-or-later')).toBeVisible();
});

test('login page without session', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('link', { name: 'Mit GitHub anmelden' })).toBeVisible();
  await screenshot(page, 'login');
  await expectAccessible(page);
});
