// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  type ExceptionDef,
  type SeriesDef,
  countPastOccurrences,
  generateOccurrences,
  occurrenceKey,
  planSeriesUpdate,
  splitSeries,
} from '../src/generator';
import { WEEKDAY } from '../src/weekdays';

const base: SeriesDef = {
  id: 's1',
  title: 'Training',
  team: 'U12',
  location: 'Halle',
  weekdays: WEEKDAY.TUE,
  startTime: '18:00',
  endTime: '19:30',
  intervalWeeks: 1,
  startsOn: '2026-09-01',
  endsOn: null,
  units: 1,
  payCents: 1500,
  alarmOffsetMin: 10,
  active: true,
};

const dates = (s: SeriesDef, from: string, to: string, ex: ExceptionDef[] = []) =>
  generateOccurrences(s, { from, to }, ex).map((o) => o.date);

describe('generateOccurrences', () => {
  it('generates weekly Tuesdays from a start date in the past', () => {
    expect(dates(base, '2026-09-01', '2026-09-30')).toEqual([
      '2026-09-01',
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
    ]);
  });

  it('supports multiple weekdays', () => {
    const s = { ...base, weekdays: WEEKDAY.TUE | WEEKDAY.THU };
    expect(dates(s, '2026-09-01', '2026-09-13')).toEqual([
      '2026-09-01',
      '2026-09-03',
      '2026-09-08',
      '2026-09-10',
    ]);
  });

  it('supports every two weeks anchored at the start week', () => {
    const s = { ...base, weekdays: WEEKDAY.TUE | WEEKDAY.FRI, intervalWeeks: 2, startsOn: '2026-09-02' };
    // start week = week of Mon 2026-08-31; Tue 09-01 is before startsOn
    expect(dates(s, '2026-08-01', '2026-10-01')).toEqual([
      '2026-09-04',
      '2026-09-15',
      '2026-09-18',
      '2026-09-29',
    ]);
  });

  it('respects range, startsOn and endsOn', () => {
    const s = { ...base, endsOn: '2026-09-15' };
    expect(dates(s, '2026-08-01', '2026-12-31')).toEqual(['2026-09-01', '2026-09-08', '2026-09-15']);
    expect(dates(s, '2026-09-09', '2026-09-14')).toEqual([]);
  });

  it('returns nothing for inactive series', () => {
    expect(dates({ ...base, active: false }, '2026-09-01', '2026-09-30')).toEqual([]);
  });

  it('skips exceptions for all series and for the specific series only', () => {
    const ex: ExceptionDef[] = [
      { fromDate: '2026-09-07', toDate: '2026-09-09', seriesId: null },
      { fromDate: '2026-09-22', toDate: '2026-09-22', seriesId: 'other' },
      { fromDate: '2026-09-29', toDate: '2026-09-29', seriesId: 's1' },
    ];
    expect(dates(base, '2026-09-01', '2026-09-30', ex)).toEqual(['2026-09-01', '2026-09-15', '2026-09-22']);
  });

  it('creates stable occurrence keys and snapshots the series fields (idempotent)', () => {
    const a = generateOccurrences(base, { from: '2026-09-01', to: '2026-09-08' }, []);
    const b = generateOccurrences(base, { from: '2026-09-01', to: '2026-09-08' }, []);
    expect(a).toEqual(b);
    expect(a[0]).toMatchObject({
      occurrenceKey: 's1:2026-09-01',
      seriesId: 's1',
      date: '2026-09-01',
      startTime: '18:00',
      endTime: '19:30',
      team: 'U12',
      units: 1,
      payCents: 1500,
    });
    expect(occurrenceKey('s1', '2026-09-01')).toBe('s1:2026-09-01');
  });

  it('is unaffected by DST changes (Sundays around both switches)', () => {
    const s = { ...base, weekdays: WEEKDAY.SUN, startsOn: '2026-03-01' };
    expect(dates(s, '2026-03-20', '2026-04-06')).toEqual(['2026-03-22', '2026-03-29', '2026-04-05']);
    expect(dates(s, '2026-10-18', '2026-11-02')).toEqual(['2026-10-18', '2026-10-25', '2026-11-01']);
    const occ = generateOccurrences(s, { from: '2026-03-29', to: '2026-03-29' }, [])[0]!;
    expect(occ.endsAt.toISOString()).toBe('2026-03-29T17:30:00.000Z');
  });

  it('counts past occurrences for the "Nachtragen" hint', () => {
    expect(countPastOccurrences(base, '2026-09-20', [])).toBe(3);
  });
});

describe('splitSeries ("dieser und alle folgenden")', () => {
  it('ends the old series the day before and starts a new one at the split date', () => {
    const { ended, next } = splitSeries({ ...base, endsOn: '2027-06-30' }, '2026-10-06', 's2');
    expect(ended.endsOn).toBe('2026-10-05');
    expect(next).toMatchObject({ id: 's2', startsOn: '2026-10-06', endsOn: '2027-06-30' });
    const all = [...dates(ended, '2026-09-01', '2026-10-31'), ...dates(next, '2026-09-01', '2026-10-31')];
    expect(all).toEqual(dates(base, '2026-09-01', '2026-10-31'));
  });

  it('keeps the two-week rhythm in the new series', () => {
    const s = { ...base, intervalWeeks: 2 };
    const { next } = splitSeries(s, '2026-09-29', 's2');
    expect(dates(next, '2026-09-29', '2026-10-31')).toEqual(['2026-09-29', '2026-10-13', '2026-10-27']);
  });
});

describe('planSeriesUpdate', () => {
  const sessions = [
    { occurrenceKey: 's1:2026-09-01', date: '2026-09-01', status: 'held', isOverride: false },
    { occurrenceKey: 's1:2026-11-10', date: '2026-11-10', status: 'pending', isOverride: false },
    { occurrenceKey: 's1:2026-11-17', date: '2026-11-17', status: 'planned', isOverride: false },
    { occurrenceKey: 's1:2026-11-24', date: '2026-11-24', status: 'planned', isOverride: true },
    { occurrenceKey: 's1:2026-12-01', date: '2026-12-01', status: 'cancelled', isOverride: false },
  ] as const;

  it('only touches future, non-overridden, unanswered sessions', () => {
    const updated = { ...base, weekdays: WEEKDAY.WED, startTime: '17:00' };
    const plan = planSeriesUpdate(updated, [...sessions], '2026-11-14', []);
    expect(plan.deleteKeys).toEqual(['s1:2026-11-17']);
    expect(plan.keep).toEqual(['s1:2026-09-01', 's1:2026-11-10', 's1:2026-11-24', 's1:2026-12-01']);
  });

  it('updates fields of surviving future planned sessions', () => {
    const updated = { ...base, startTime: '17:30', location: 'Neue Halle' };
    const plan = planSeriesUpdate(updated, [...sessions], '2026-11-14', []);
    expect(plan.deleteKeys).toEqual([]);
    expect(plan.updateKeys).toEqual(['s1:2026-11-17']);
  });
});
