// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { DEFAULT_REPORT_INTRO, aggregateReport, fillReportTemplate, summarize } from '../src/report';

const s = (date: string, team: string, status: string, units = 1, payCents = 1500) => ({
  date,
  team,
  status,
  units,
  payCents,
});

describe('aggregateReport', () => {
  const sessions = [
    s('2025-12-30', 'U12', 'held'), // previous year → ignored
    s('2026-01-06', 'U12', 'held'),
    s('2026-01-08', 'U14', 'held', 2),
    s('2026-01-13', 'U12', 'not_held'),
    s('2026-01-20', 'U12', 'cancelled'),
    s('2026-03-03', 'U12', 'held'),
    s('2026-03-05', 'U12', 'held'),
    s('2026-12-01', 'U12', 'held'),
    s('2026-12-08', 'U12', 'pending'),
    s('2026-12-15', 'U12', 'planned'),
    s('2026-12-22', 'U14', 'planned'),
    s('2027-01-05', 'U12', 'held'), // next year → ignored
  ];

  it('counts only held units per calendar month with the teams of that month', () => {
    const r = aggregateReport(sessions, 2026, { includePlanned: false });
    expect(r.year).toBe(2026);
    expect(r.months).toHaveLength(12);
    expect(r.months[0]).toEqual({ month: 1, name: 'Januar', teams: ['U12', 'U14'], units: 3 });
    expect(r.months[1]).toEqual({ month: 2, name: 'Februar', teams: [], units: 0 });
    expect(r.months[2]).toEqual({ month: 3, name: 'März', teams: ['U12'], units: 2 });
    expect(r.months[11]).toEqual({ month: 12, name: 'Dezember', teams: ['U12'], units: 1 });
    expect(r.totalUnits).toBe(6);
    expect(r.teams).toEqual(['U12', 'U14']);
  });

  it('optionally includes planned and pending sessions until 31.12.', () => {
    const r = aggregateReport(sessions, 2026, { includePlanned: true });
    expect(r.months[11]).toEqual({ month: 12, name: 'Dezember', teams: ['U12', 'U14'], units: 4 });
    expect(r.totalUnits).toBe(9);
  });

  it('sorts teams naturally (U9 before U12)', () => {
    const r = aggregateReport([s('2026-05-05', 'U12', 'held'), s('2026-05-06', 'U9', 'held')], 2026, {
      includePlanned: false,
    });
    expect(r.months[4]!.teams).toEqual(['U9', 'U12']);
  });
});

describe('summarize', () => {
  it('sums held pay and units for a date range', () => {
    const r = summarize(
      [
        s('2026-11-03', 'U12', 'held'),
        s('2026-11-05', 'U12', 'held', 2, 3000),
        s('2026-11-10', 'U12', 'not_held'),
      ],
      '2026-11-01',
      '2026-11-30',
    );
    expect(r).toEqual({ heldCount: 2, units: 3, payCents: 4500, openCount: 0 });
  });
});

describe('fillReportTemplate', () => {
  it('replaces placeholders and leaves dotted lines for empty values', () => {
    const text = fillReportTemplate(DEFAULT_REPORT_INTRO, {
      jahr: 2026,
      frist: '15.12.2026',
      empfaenger: '',
    });
    expect(text).toContain('bis 15.12.2026');
    expect(text).not.toContain('{');
    expect(text).toContain('……');
  });
});
