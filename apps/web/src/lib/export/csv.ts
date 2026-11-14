// SPDX-License-Identifier: AGPL-3.0-or-later
/** CSV export/import (Semicolon, UTF-8 with BOM – opens correctly in German Excel). */
import Papa from 'papaparse';
import { CSV_HEADER, type ExportSession, sessionToRow } from '@ult/shared';

export function buildCsv(sessions: readonly ExportSession[]): string {
  const csv = Papa.unparse(
    { fields: [...CSV_HEADER], data: sessions.map(sessionToRow) },
    { delimiter: ';', newline: '\r\n', quotes: false },
  );
  return `\ufeff${csv}`;
}

export function parseCsv(text: string): Record<string, string>[] {
  const res = Papa.parse<Record<string, string>>(text.replace(/^\ufeff/, ''), {
    header: true,
    skipEmptyLines: true,
    delimiter: '', // auto-detect ; or ,
    transformHeader: (h) => h.trim(),
  });
  return res.data;
}
