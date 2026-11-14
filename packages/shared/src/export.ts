// SPDX-License-Identifier: AGPL-3.0-or-later
/** Table rows for CSV/XLSX export and the reverse mapping for import (pure). */
import { centsToEuroString, parseEuroToCents } from './money';
import { type ImportSession, type SessionKind, type SessionStatus, importSession } from './schemas';
import { formatDateShortDe, parseGermanDate, weekdayLongDe } from './time';

export const CSV_HEADER = [
  'Datum',
  'Wochentag',
  'Beginn',
  'Ende',
  'Training',
  'Mannschaft',
  'Ort',
  'Art',
  'Einheiten',
  'Status',
  'Vergütung (€)',
  'Notiz',
] as const;

export const STATUS_LABELS: Record<SessionStatus, string> = {
  planned: 'geplant',
  pending: 'offen',
  held: 'gehalten',
  not_held: 'nicht gehalten',
  cancelled: 'fällt aus',
};

export const KIND_LABELS: Record<SessionKind, string> = {
  training: 'Training',
  match: 'Spiel',
  tournament: 'Turnier',
  other: 'Sonstiges',
};

export interface ExportSession {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  team: string;
  location: string;
  kind: SessionKind;
  units: number;
  status: SessionStatus;
  payCents: number;
  note: string | null;
}

export function sessionToRow(s: ExportSession): string[] {
  return [
    formatDateShortDe(s.date),
    weekdayLongDe(s.date),
    s.startTime,
    s.endTime,
    s.title,
    s.team,
    s.location,
    KIND_LABELS[s.kind],
    String(s.units),
    STATUS_LABELS[s.status],
    centsToEuroString(s.payCents),
    s.note ?? '',
  ];
}

function reverse<T extends string>(map: Record<T, string>, label: string | undefined): T | undefined {
  if (!label) return undefined;
  const l = label.trim().toLowerCase();
  const hit = (Object.entries(map) as [T, string][]).find(([k, v]) => v.toLowerCase() === l || k === l);
  return hit?.[0];
}

export type RowResult = { ok: true; value: ImportSession } | { ok: false; error: string };

/** Accepts a record keyed by CSV header (CSV/XLSX import). */
export function rowToImportSession(row: Record<string, string | number | null | undefined>): RowResult {
  const get = (k: (typeof CSV_HEADER)[number]) => {
    const v = row[k];
    return v === undefined || v === null ? '' : String(v).trim();
  };
  const date = parseGermanDate(get('Datum'));
  if (!date) return { ok: false, error: `Ungültiges Datum: „${get('Datum')}“` };
  const pay = get('Vergütung (€)');
  const payCents = pay === '' ? undefined : parseEuroToCents(pay);
  if (payCents === null) return { ok: false, error: `Ungültige Vergütung: „${pay}“` };
  const units = get('Einheiten');
  const candidate = {
    date,
    startTime: get('Beginn').padStart(5, '0'),
    endTime: get('Ende').padStart(5, '0'),
    title: get('Training') || 'Training',
    team: get('Mannschaft'),
    location: get('Ort'),
    kind: reverse(KIND_LABELS, get('Art')) ?? 'training',
    units: units === '' ? 1 : Number(units.replace(',', '.')),
    status: reverse(STATUS_LABELS, get('Status')) ?? 'held',
    payCents,
    note: get('Notiz') || null,
  };
  const parsed = importSession.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
    };
  }
  return { ok: true, value: parsed.data };
}

interface DupRef {
  occurrenceKey?: string | undefined;
  date: string;
  startTime: string;
}

export function findDuplicates(incoming: readonly DupRef[], existing: readonly DupRef[]): boolean[] {
  const keys = new Set(existing.map((e) => e.occurrenceKey).filter(Boolean));
  const slots = new Set(existing.map((e) => `${e.date} ${e.startTime}`));
  return incoming.map(
    (i) =>
      (i.occurrenceKey !== undefined && keys.has(i.occurrenceKey)) || slots.has(`${i.date} ${i.startTime}`),
  );
}
