// SPDX-License-Identifier: AGPL-3.0-or-later
/** XLSX export (sheet "Termine" + "Monatsübersicht" like the report) and import, client side. */
import ExcelJS from 'exceljs';
import { CSV_HEADER, type ExportSession, type Report, sessionToRow } from '@ult/shared';

export async function buildXlsx(sessions: readonly ExportSession[], report: Report): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Übungsleiter-Tracker';
  const ws = wb.addWorksheet('Termine', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.addRow([...CSV_HEADER]);
  for (const s of sessions) ws.addRow(sessionToRow(s));
  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c, i) => (c.width = [12, 12, 8, 8, 18, 14, 20, 12, 10, 14, 14, 30][i] ?? 12));
  const held = sessions.filter((s) => s.status === 'held');
  ws.addRow([]);
  const sumRow = ws.addRow([
    'Summe (gehalten)',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    held.reduce((a, s) => a + s.units, 0),
    held.length,
    (held.reduce((a, s) => a + s.payCents, 0) / 100).toFixed(2).replace('.', ','),
  ]);
  sumRow.font = { bold: true };

  const ms = wb.addWorksheet('Monatsübersicht');
  ms.addRow([
    `Monat Kalenderjahr ${report.year}`,
    'Trainingsgruppe(n)',
    'Trainingseinheiten (90–120 Minuten) pro Monat',
  ]);
  ms.getRow(1).font = { bold: true };
  for (const m of report.months) ms.addRow([m.name, m.teams.join(', '), m.units]);
  const total = ms.addRow(['', 'Summe:', report.totalUnits]);
  total.font = { bold: true };
  ms.columns.forEach((c, i) => (c.width = [24, 30, 44][i] ?? 12));

  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** Reads sheet "Termine" (or the first sheet) into header-keyed string records. */
export async function parseXlsx(data: Uint8Array | ArrayBuffer): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook();
  const buf =
    data instanceof Uint8Array ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data;
  await wb.xlsx.load(buf as ArrayBuffer);
  const ws = wb.getWorksheet('Termine') ?? wb.worksheets[0];
  if (!ws) return [];
  const header: string[] = [];
  ws.getRow(1).eachCell((cell, col) => (header[col] = String(cell.text).trim()));
  const rows: Record<string, string>[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const rec: Record<string, string> = {};
    let any = false;
    row.eachCell((cell, col) => {
      const key = header[col];
      if (!key) return;
      rec[key] = String(cell.text).trim();
      if (rec[key]) any = true;
    });
    // skip the sum row and blank rows
    if (any && /^\d{1,2}\.\d{1,2}\.\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(rec.Datum ?? '')) rows.push(rec);
  });
  return rows;
}
