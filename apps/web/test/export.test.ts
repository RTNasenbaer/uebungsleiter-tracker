// SPDX-License-Identifier: AGPL-3.0-or-later
import { mkdirSync, writeFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { describe, expect, it } from 'vitest';
import { aggregateReport, type SessionDto } from '@ult/shared';
import { buildCsv, parseCsv } from '../src/lib/export/csv';
import { parseIcs } from '../src/lib/export/ics';
import { buildReportPdf } from '../src/lib/export/pdf';
import { buildXlsx, parseXlsx } from '../src/lib/export/xlsx';

function session(
  date: string,
  team: string,
  status: SessionDto['status'],
  extra: Partial<SessionDto> = {},
): SessionDto {
  return {
    id: `${date}-${team}`,
    occurrenceKey: `s:${date}-${team}`,
    seriesId: 's',
    date,
    startTime: '18:00',
    endTime: '19:30',
    title: 'Training',
    team,
    location: 'Halle Süd',
    units: 1,
    payCents: 1500,
    isOverride: false,
    status,
    kind: 'training',
    note: null,
    answeredAt: null,
    answeredVia: null,
    answeredDeviceId: null,
    snoozedUntil: null,
    alarmOffsetMin: 10,
    color: null,
    ...extra,
  };
}

const sessions = [
  session('2026-01-13', 'U12', 'held', { note: 'Vertretung; Müller' }),
  session('2026-01-15', 'U14', 'held', { units: 2 }),
  session('2026-03-03', 'U12', 'held'),
  session('2026-03-10', 'U12', 'not_held'),
  session('2026-12-15', 'U12', 'planned'),
];

async function pdfText(bytes: Uint8Array): Promise<string[]> {
  const doc = await getDocument({ data: bytes.slice() }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ('str' in it ? it.str : '')).join(' '));
  }
  return pages;
}

describe('CSV', () => {
  it('writes UTF-8 with BOM, semicolons and umlauts', () => {
    const csv = buildCsv(sessions);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe(
      'Datum;Wochentag;Beginn;Ende;Training;Mannschaft;Ort;Art;Einheiten;Status;Vergütung (€);Notiz',
    );
    expect(lines[1]).toBe(
      '13.01.2026;Dienstag;18:00;19:30;Training;U12;Halle Süd;Training;1;gehalten;15,00;"Vertretung; Müller"',
    );
  });

  it('parses its own output back', () => {
    const rows = parseCsv(buildCsv(sessions));
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({
      Datum: '13.01.2026',
      Notiz: 'Vertretung; Müller',
      'Vergütung (€)': '15,00',
    });
  });
});

describe('XLSX', () => {
  it('has the sheets "Termine" and "Monatsübersicht" with sums and can be read back', async () => {
    const report = aggregateReport(sessions, 2026, { includePlanned: false });
    const bytes = await buildXlsx(sessions, report);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes.buffer as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Termine', 'Monatsübersicht']);
    const termine = wb.getWorksheet('Termine')!;
    expect(termine.getRow(1).getCell(1).value).toBe('Datum');
    expect(termine.getRow(2).getCell(7).value).toBe('Halle Süd');
    const monate = wb.getWorksheet('Monatsübersicht')!;
    expect(monate.getRow(2).values).toEqual([undefined, 'Januar', 'U12, U14', 3]);
    expect(monate.getRow(14).getCell(2).value).toBe('Summe:');
    expect(monate.getRow(14).getCell(3).value).toBe(4);

    const back = await parseXlsx(bytes);
    expect(back).toHaveLength(5);
    expect(back[1]).toMatchObject({ Mannschaft: 'U14', Einheiten: '2' });
  });
});

describe('ICS', () => {
  it('parses all-day holiday events (DTEND exclusive)', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//test//EN',
      'BEGIN:VEVENT',
      'UID:1',
      'DTSTART;VALUE=DATE:20261012',
      'DTEND;VALUE=DATE:20261025',
      'SUMMARY:Herbstferien',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:2',
      'DTSTART;VALUE=DATE:20261003',
      'SUMMARY:Tag der Deutschen Einheit',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    expect(parseIcs(ics)).toEqual([
      { fromDate: '2026-10-03', toDate: '2026-10-03', label: 'Tag der Deutschen Einheit' },
      { fromDate: '2026-10-12', toDate: '2026-10-24', label: 'Herbstferien' },
    ]);
  });
});

describe('Antrag-PDF', () => {
  it('renders the club form with months, groups and the total (A4, one page)', async () => {
    const report = aggregateReport(sessions, 2026, { includePlanned: false });
    const bytes = await buildReportPdf({
      report,
      settings: {
        displayName: 'Muster, Max',
        iban: '',
        reportIntroTemplate: 'Bitte bis {frist} an {empfaenger} senden. Jahr {jahr}.',
        reportRecipient: 'kasse@example.org',
        reportDeadline: '12-15',
        clubName: 'TV Beispiel',
      },
      sessions,
      detailPage: false,
      includePlanned: false,
    });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842]);
    const [text] = await pdfText(bytes);
    expect(text).toContain('Übungsleiternachweis 2026');
    expect(text).toContain('Muster, Max');
    expect(text).toContain('Bitte bis 15.12.2026 an kasse@example.org senden. Jahr 2026.');
    for (const m of ['Januar', 'Februar', 'März', 'Dezember']) expect(text).toContain(m);
    expect(text).toContain('U12, U14');
    expect(text).toContain('Summe:');
    expect(text).toContain('Trainingseinheiten (90–120 Minuten) pro Monat');
    expect(text).toMatch(/Summe:\s+4/);
  });

  it('adds the optional detail page', async () => {
    const report = aggregateReport(sessions, 2026, { includePlanned: true });
    const bytes = await buildReportPdf({
      report,
      settings: {
        displayName: '',
        iban: '',
        reportIntroTemplate: '{jahr}',
        reportRecipient: '',
        reportDeadline: '12-15',
        clubName: '',
      },
      sessions,
      detailPage: true,
      includePlanned: true,
    });
    // kept for visual inspection (pdftoppm) – test-results/ is gitignored
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/antrag-beispiel.pdf', bytes);
    const pages = await pdfText(bytes);
    expect(pages).toHaveLength(2);
    expect(pages[1]).toContain('13.01.2026');
    expect(pages[1]).toContain('Halle Süd');
    expect(pages[1]).toContain('15.12.2026'); // planned session counted on page 1 is listed too
    expect(pages[1]).toContain('4 Termine · 5 Einheiten');
    expect(pages[0]).toMatch(/Summe:\s+5/);
  });
});
