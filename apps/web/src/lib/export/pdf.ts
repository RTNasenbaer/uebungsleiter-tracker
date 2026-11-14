// SPDX-License-Identifier: AGPL-3.0-or-later
/** "Übungsleiternachweis" PDF (SPEC §7), generated in the browser with pdf-lib. */
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from 'pdf-lib';
import {
  DEFAULT_REPORT_INTRO,
  type ExportSession,
  KIND_LABELS,
  type Report,
  STATUS_LABELS,
  countsForReport,
  fillReportTemplate,
  formatDateShortDe,
  formatDeadline,
  weekdayShortDe,
} from '@ult/shared';

export interface ReportSettings {
  displayName: string;
  iban: string;
  clubName: string;
  reportIntroTemplate: string;
  reportRecipient: string;
  reportDeadline: string;
}

export interface ReportPdfInput {
  report: Report;
  settings: ReportSettings;
  sessions: readonly ExportSession[];
  detailPage: boolean;
  includePlanned: boolean;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.35, 0.35, 0.35);
const HEADER_BG = rgb(0.9, 0.9, 0.9);

/** pdf-lib standard fonts use WinAnsi – replace characters it cannot encode. */
function safe(text: string, font: PDFFont): string {
  return [...text]
    .map((ch) => {
      try {
        font.encodeText(ch);
        return ch;
      } catch {
        return '?';
      }
    })
    .join('');
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

interface Column {
  width: number;
  align?: 'left' | 'right' | 'center';
}

function drawTable(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  x: number,
  yTop: number,
  columns: Column[],
  rows: { cells: string[]; bold?: boolean; header?: boolean; height?: number; aligns?: Column['align'][] }[],
  size: number,
): number {
  let y = yTop;
  const totalWidth = columns.reduce((a, c) => a + c.width, 0);
  for (const row of rows) {
    const f = row.bold || row.header ? bold : font;
    const cellLines = row.cells.map((c, i) => wrap(safe(c, f), f, size, columns[i]!.width - 8));
    const lineCount = Math.max(1, ...cellLines.map((l) => l.length));
    const h = Math.max(row.height ?? 0, lineCount * (size + 3) + 8);
    if (row.header) page.drawRectangle({ x, y: y - h, width: totalWidth, height: h, color: HEADER_BG });
    let cx = x;
    columns.forEach((col, i) => {
      page.drawRectangle({
        x: cx,
        y: y - h,
        width: col.width,
        height: h,
        borderColor: BLACK,
        borderWidth: 0.7,
      });
      const lines = cellLines[i]!;
      lines.forEach((line, li) => {
        const w = f.widthOfTextAtSize(line, size);
        const align = row.aligns?.[i] ?? col.align;
        const tx =
          align === 'right' ? cx + col.width - 4 - w : align === 'center' ? cx + (col.width - w) / 2 : cx + 4;
        page.drawText(line, { x: tx, y: y - 4 - size - li * (size + 3) + 1, size, font: f, color: BLACK });
      });
      cx += col.width;
    });
    y -= h;
  }
  return y;
}

export async function buildReportPdf(input: ReportPdfInput): Promise<Uint8Array> {
  const { report, settings } = input;
  const doc = await PDFDocument.create();
  doc.setTitle(`Übungsleiternachweis ${report.year}`);
  doc.setCreator('Übungsleiter-Tracker');
  doc.setProducer('pdf-lib');
  doc.setLanguage('de-DE');
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage(A4);
  const width = A4[0] - 2 * MARGIN;
  let y = A4[1] - MARGIN;

  const text = (
    t: string,
    opts: { size?: number; f?: PDFFont; x?: number; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const size = opts.size ?? 11;
    const f = opts.f ?? font;
    page.drawText(safe(t, f), {
      x: opts.x ?? MARGIN,
      y: y - size,
      size,
      font: f,
      color: opts.color ?? BLACK,
    });
  };

  if (settings.clubName) {
    text(settings.clubName, { size: 10, color: GREY });
    y -= 20;
  }
  text(`Übungsleiternachweis ${report.year}`, { size: 18, f: bold });
  y -= 30;
  text('für', { size: 11 });
  y -= 22;

  const field = (label: string, value: string) => {
    text(label, { size: 11, f: bold });
    const lx = MARGIN + bold.widthOfTextAtSize(label, 11) + 8;
    if (value) text(value, { size: 11, x: lx });
    else
      page.drawLine({
        start: { x: lx, y: y - 12 },
        end: { x: MARGIN + width, y: y - 12 },
        thickness: 0.6,
        dashArray: [1, 2],
      });
    y -= 22;
  };
  field('Name, Vorname:', settings.displayName);
  field('Kontoverbindung IBAN:', settings.iban);
  y -= 8;

  const intro = fillReportTemplate(settings.reportIntroTemplate || DEFAULT_REPORT_INTRO, {
    jahr: report.year,
    frist: formatDeadline(settings.reportDeadline || '12-15', report.year),
    empfaenger: settings.reportRecipient,
  });
  for (const line of wrap(safe(intro, font), font, 10.5, width)) {
    text(line, { size: 10.5 });
    y -= 14;
  }
  y -= 12;

  const cols: Column[] = [
    { width: width * 0.3 },
    { width: width * 0.38 },
    { width: width * 0.32, align: 'center' },
  ];
  const rows = [
    {
      cells: [
        `Monat Kalenderjahr ${report.year}`,
        'Trainingsgruppe(n)',
        'Trainingseinheiten (90–120 Minuten) pro Monat',
      ],
      header: true,
    },
    ...report.months.map((m) => ({
      cells: [m.name, m.teams.join(', '), m.units ? String(m.units) : ''],
      height: 24,
    })),
    {
      cells: ['', 'Summe:', String(report.totalUnits)],
      bold: true,
      height: 26,
      aligns: [undefined, 'right' as const, undefined],
    },
  ];
  const tableBottom = drawTable(page, font, bold, MARGIN, y, cols, rows, 10.5);
  y = tableBottom - 18;

  if (input.includePlanned) {
    text('Hinweis: Enthält bis zum 31.12. geplante Trainingseinheiten.', { size: 9, color: GREY });
    y -= 14;
  }
  y -= 30;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + 200, y }, thickness: 0.6 });
  page.drawLine({ start: { x: MARGIN + width - 200, y }, end: { x: MARGIN + width, y }, thickness: 0.6 });
  y -= 4;
  text('Ort, Datum', { size: 9, color: GREY });
  text('Unterschrift', { size: 9, color: GREY, x: MARGIN + width - 200 });

  if (input.detailPage) addDetailPage(doc, font, bold, input);
  return doc.save();
}

function addDetailPage(doc: PDFDocument, font: PDFFont, bold: PDFFont, input: ReportPdfInput) {
  const opts = { includePlanned: input.includePlanned };
  const list = input.sessions
    .filter((s) => s.date.startsWith(`${input.report.year}-`) && countsForReport(s.status, opts))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const width = A4[0] - 2 * MARGIN;
  const cols: Column[] = [
    { width: width * 0.17 },
    { width: width * 0.15 },
    { width: width * 0.14 },
    { width: width * 0.26 },
    { width: width * 0.08, align: 'center' },
    { width: width * 0.2 },
  ];
  const header = { cells: ['Datum', 'Zeit', 'Gruppe', 'Ort', 'Einh.', 'Art / Status'], header: true };
  let page = doc.addPage(A4);
  let y = A4[1] - MARGIN;
  page.drawText(`Anhang: Trainingseinheiten ${input.report.year}`, {
    x: MARGIN,
    y: y - 14,
    size: 14,
    font: bold,
  });
  y -= 30;
  let batch: { cells: string[]; header?: boolean }[] = [header];
  const rowH = 9 + 3 + 8;
  for (const s of list) {
    if (y - (batch.length + 1) * rowH < MARGIN) {
      drawTable(page, font, bold, MARGIN, y, cols, batch, 9);
      page = doc.addPage(A4);
      y = A4[1] - MARGIN;
      batch = [header];
    }
    batch.push({
      cells: [
        `${weekdayShortDe(s.date)} ${formatDateShortDe(s.date)}`,
        `${s.startTime}–${s.endTime}`,
        s.team,
        s.location,
        String(s.units),
        s.status === 'held' ? KIND_LABELS[s.kind] : `${KIND_LABELS[s.kind]} (${STATUS_LABELS[s.status]})`,
      ],
    });
  }
  const end = drawTable(page, font, bold, MARGIN, y, cols, batch, 9);
  page.drawText(safe(`${list.length} Termine · ${list.reduce((a, s) => a + s.units, 0)} Einheiten`, font), {
    x: MARGIN,
    y: end - 16,
    size: 9,
    font,
    color: GREY,
  });
}
