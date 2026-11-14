// SPDX-License-Identifier: AGPL-3.0-or-later
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { api, expect, expectAccessible, screenshot, test } from './fixtures';

async function pdfText(path: string) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(path)) }).promise;
  const content = await (await doc.getPage(1)).getTextContent();
  return { pages: doc.numPages, text: content.items.map((i) => ('str' in i ? i.str : '')).join(' ') };
}

test('report PDF, CSV, XLSX and import with duplicates', async ({ page, login }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'downloads are covered on desktop');
  await login();
  await api(page, 'PUT', '/api/settings', {
    displayName: 'Trainer, Test',
    reportRecipient: 'kasse@example.org',
    clubName: 'TV Beispielstadt',
  });
  const { series } = await api(page, 'POST', '/api/series', {
    title: 'Training',
    team: 'U12',
    location: 'Halle Süd',
    weekdays: 2 | 8,
    startTime: '18:00',
    endTime: '19:30',
    startsOn: '2026-09-01',
  });
  const open = await api(page, 'GET', '/api/sessions/open');
  await api(page, 'POST', '/api/sessions/bulk', {
    keys: open.map((s: { occurrenceKey: string }) => s.occurrenceKey),
    status: 'held',
  });
  await api(page, 'POST', '/api/sessions/answer', {
    occurrence_key: `${series.id}:2026-10-01`,
    status: 'not_held',
  });

  await page.goto('/export');
  await expect(page.getByTestId('report-total')).toHaveText('19');
  await screenshot(page, 'export');
  await expectAccessible(page);

  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'PDF herunterladen' }).click(),
  ]);
  expect(pdf.suggestedFilename()).toBe('Uebungsleiternachweis_2026.pdf');
  const pdfPath = testInfo.outputPath('antrag.pdf');
  await pdf.saveAs(pdfPath);
  const { pages, text } = await pdfText(pdfPath);
  expect(pages).toBe(1);
  expect(text).toContain('Übungsleiternachweis 2026');
  expect(text).toContain('Trainer, Test');
  expect(text).toContain('kasse@example.org');
  expect(text).toMatch(/September\s+U12\s+9/);
  expect(text).toMatch(/Oktober\s+U12\s+8/);
  expect(text).toMatch(/Summe:\s+19/);

  // include planned sessions until 31.12.
  await page.getByLabel('Geplante Termine bis 31.12. mitzählen').check();
  await expect(page.getByTestId('report-total')).toHaveText('35');

  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'CSV herunterladen' }).click(),
  ]);
  const csvPath = testInfo.outputPath('termine.csv');
  await csv.saveAs(csvPath);
  const csvText = readFileSync(csvPath, 'utf8');
  expect(csvText.charCodeAt(0)).toBe(0xfeff);
  expect(csvText).toContain(
    'Datum;Wochentag;Beginn;Ende;Training;Mannschaft;Ort;Art;Einheiten;Status;Vergütung (€);Notiz',
  );
  expect(csvText).toContain(
    '01.09.2026;Dienstag;18:00;19:30;Training;U12;Halle Süd;Training;1;gehalten;15,00;',
  );

  const [xlsx] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Excel (XLSX) herunterladen' }).click(),
  ]);
  const xlsxPath = testInfo.outputPath('termine.xlsx');
  await xlsx.saveAs(xlsxPath);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  expect(wb.worksheets.map((w) => w.name)).toEqual(['Termine', 'Monatsübersicht']);

  const [json] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'JSON-Backup herunterladen' }).click(),
  ]);
  const backup = JSON.parse(readFileSync(await json.path(), 'utf8'));
  expect(backup.format).toBe('uebungsleiter-tracker-backup');

  // import: one duplicate (01.09.) + one new single session
  const importCsv =
    '﻿Datum;Wochentag;Beginn;Ende;Training;Mannschaft;Ort;Art;Einheiten;Status;Vergütung (€);Notiz\r\n' +
    '01.09.2026;Dienstag;18:00;19:30;Training;U12;Halle Süd;Training;1;gehalten;15,00;\r\n' +
    '05.09.2026;Samstag;10:00;14:00;Turnier;U12;Halle Nord;Turnier;2;gehalten;30,00;Vertretung\r\n';
  await page
    .getByTestId('import-file')
    .setInputFiles({ name: 'import.csv', mimeType: 'text/csv', buffer: Buffer.from(importCsv) });
  await expect(page.getByTestId('import-summary')).toHaveText(
    '1 neue Termine, 1 Duplikate, 0 fehlerhafte Zeilen',
  );
  await page.getByRole('button', { name: 'Import starten' }).click();
  await expect(page.getByText('1 angelegt, 0 aktualisiert, 1 übersprungen')).toBeVisible();
  const sat = await api(page, 'GET', '/api/sessions?from=2026-09-05&to=2026-09-05');
  expect(sat[0]).toMatchObject({ title: 'Turnier', kind: 'tournament', units: 2, note: 'Vertretung' });
});
