// SPDX-License-Identifier: AGPL-3.0-or-later
/** Reads a CSV / XLSX / JSON-backup file in the browser and validates it before upload. */
import { type BackupFile, type ImportSession, backupFile, rowToImportSession } from '@ult/shared';
import { parseCsv } from './csv';
import { parseXlsx } from './xlsx';

export type ImportPreview =
  | { kind: 'sessions'; valid: ImportSession[]; errors: { row: number; error: string }[] }
  | { kind: 'backup'; backup: BackupFile };

export function rowsToSessions(rows: Record<string, string>[]): Extract<ImportPreview, { kind: 'sessions' }> {
  const valid: ImportSession[] = [];
  const errors: { row: number; error: string }[] = [];
  rows.forEach((r, i) => {
    const res = rowToImportSession(r);
    if (res.ok) valid.push(res.value);
    else errors.push({ row: i + 2, error: res.error });
  });
  return { kind: 'sessions', valid, errors };
}

export async function readImportFile(file: File): Promise<ImportPreview> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) {
    const parsed = backupFile.safeParse(JSON.parse(await file.text()));
    if (!parsed.success) throw new Error('Keine gültige Backup-Datei');
    return { kind: 'backup', backup: parsed.data };
  }
  if (name.endsWith('.xlsx'))
    return rowsToSessions(await parseXlsx(new Uint8Array(await file.arrayBuffer())));
  return rowsToSessions(parseCsv(await file.text()));
}
