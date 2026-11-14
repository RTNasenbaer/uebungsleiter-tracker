// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { CSV_HEADER, findDuplicates, rowToImportSession, sessionToRow } from '../src/export';

const session = {
  occurrenceKey: 's1:2026-11-10',
  date: '2026-11-10',
  startTime: '18:00',
  endTime: '19:30',
  title: 'Training',
  team: 'U12',
  location: 'Halle Süd',
  kind: 'training' as const,
  units: 1,
  status: 'held' as const,
  payCents: 1550,
  note: 'Vertretung; Müller',
};

describe('export rows', () => {
  it('has the header from the SPEC', () => {
    expect(CSV_HEADER.join(';')).toBe(
      'Datum;Wochentag;Beginn;Ende;Training;Mannschaft;Ort;Art;Einheiten;Status;Vergütung (€);Notiz',
    );
  });

  it('maps a session to German display values', () => {
    expect(sessionToRow(session)).toEqual([
      '10.11.2026',
      'Dienstag',
      '18:00',
      '19:30',
      'Training',
      'U12',
      'Halle Süd',
      'Training',
      '1',
      'gehalten',
      '15,50',
      'Vertretung; Müller',
    ]);
  });

  it('round-trips a row back to an import session', () => {
    const back = rowToImportSession(
      Object.fromEntries(CSV_HEADER.map((h, i) => [h, sessionToRow(session)[i]!])),
    );
    expect(back).toEqual({
      ok: true,
      value: {
        date: '2026-11-10',
        startTime: '18:00',
        endTime: '19:30',
        title: 'Training',
        team: 'U12',
        location: 'Halle Süd',
        kind: 'training',
        units: 1,
        status: 'held',
        payCents: 1550,
        note: 'Vertretung; Müller',
      },
    });
  });

  it('reports invalid rows', () => {
    const r = rowToImportSession({ Datum: '31.02.2026', Beginn: '18:00', Ende: '19:30', Training: 'X' });
    expect(r.ok).toBe(false);
  });

  it('detects duplicates by occurrence key or date + start time', () => {
    const existing = [
      { occurrenceKey: 's1:2026-11-10', date: '2026-11-10', startTime: '18:00' },
      { occurrenceKey: 'single:x', date: '2026-11-12', startTime: '17:00' },
    ];
    const incoming = [
      { occurrenceKey: 's1:2026-11-10', date: '2026-11-10', startTime: '18:00' },
      { date: '2026-11-12', startTime: '17:00' },
      { date: '2026-11-13', startTime: '17:00' },
    ];
    expect(findDuplicates(incoming, existing)).toEqual([true, true, false]);
  });
});
