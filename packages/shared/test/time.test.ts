// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMinutesToTime,
  diffDays,
  fixedClock,
  formatDateDe,
  formatDayMonthDe,
  formatDateLongDe,
  localToInstant,
  mondayOf,
  toLocal,
  weekdayOf,
} from '../src/time';

describe('time', () => {
  it('converts winter local time to UTC (CET, +1)', () => {
    expect(localToInstant('2026-01-15', '18:00').toISOString()).toBe('2026-01-15T17:00:00.000Z');
  });

  it('converts summer local time to UTC (CEST, +2)', () => {
    expect(localToInstant('2026-07-15', '18:00').toISOString()).toBe('2026-07-15T16:00:00.000Z');
  });

  it('handles the spring-forward gap (last Sunday of March): 02:30 does not exist → 03:30 CEST', () => {
    // 2026-03-29 is the last Sunday in March
    expect(localToInstant('2026-03-29', '02:30').toISOString()).toBe('2026-03-29T01:30:00.000Z');
    expect(localToInstant('2026-03-29', '18:00').toISOString()).toBe('2026-03-29T16:00:00.000Z');
    expect(localToInstant('2026-03-28', '18:00').toISOString()).toBe('2026-03-28T17:00:00.000Z');
  });

  it('handles the fall-back overlap (last Sunday of October): 02:30 is ambiguous → first occurrence', () => {
    // 2026-10-25 is the last Sunday in October
    expect(localToInstant('2026-10-25', '02:30').toISOString()).toBe('2026-10-25T00:30:00.000Z');
    expect(localToInstant('2026-10-25', '18:00').toISOString()).toBe('2026-10-25T17:00:00.000Z');
    expect(localToInstant('2026-10-24', '18:00').toISOString()).toBe('2026-10-24T16:00:00.000Z');
  });

  it('converts instants back to Berlin local parts', () => {
    expect(toLocal(new Date('2026-03-29T16:00:00Z'))).toEqual({
      date: '2026-03-29',
      time: '18:00',
      weekday: 7,
    });
    expect(toLocal(new Date('2026-12-31T23:30:00Z'))).toEqual({
      date: '2027-01-01',
      time: '00:30',
      weekday: 5,
    });
  });

  it('does plain date arithmetic', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(diffDays('2026-09-01', '2026-09-15')).toBe(14);
    expect(diffDays('2026-03-01', '2026-04-01')).toBe(31); // not affected by DST
    expect(weekdayOf('2026-11-10')).toBe(2); // Tuesday
    expect(weekdayOf('2026-11-15')).toBe(7); // Sunday
    expect(mondayOf('2026-11-15')).toBe('2026-11-09');
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
  });

  it('adds minutes to HH:MM', () => {
    expect(addMinutesToTime('19:30', 10)).toEqual({ time: '19:40', dayOffset: 0 });
    expect(addMinutesToTime('23:55', 10)).toEqual({ time: '00:05', dayOffset: 1 });
  });

  it('formats dates in German', () => {
    expect(formatDateDe('2026-11-11')).toBe('Mi, 11.11.2026');
    expect(formatDateLongDe('2026-11-10')).toBe('Dienstag, 10. November 2026');
    expect(formatDayMonthDe('2026-03-05')).toBe('Do, 05.03.');
  });

  it('provides a fixed clock for tests', () => {
    const clock = fixedClock('2026-11-10T17:00:00Z');
    expect(clock.now().toISOString()).toBe('2026-11-10T17:00:00.000Z');
  });
});
