// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { alarmTriggerAt, buildAlarmList, isDue } from '../src/alarm';

const quiet = { start: '22:00', end: '07:00' };

describe('alarmTriggerAt', () => {
  it('rings offset minutes after the end (local Berlin time)', () => {
    expect(alarmTriggerAt('2026-11-10', '19:30', 10, quiet).toISOString()).toBe('2026-11-10T18:40:00.000Z');
    expect(alarmTriggerAt('2026-07-07', '19:30', 10, quiet).toISOString()).toBe('2026-07-07T17:40:00.000Z');
  });

  it('moves alarms inside quiet hours to the end of the quiet period (next morning)', () => {
    expect(alarmTriggerAt('2026-11-10', '21:55', 10, quiet).toISOString()).toBe('2026-11-11T06:00:00.000Z');
  });

  it('moves early-morning alarms to the end of the quiet period the same day', () => {
    expect(alarmTriggerAt('2026-11-10', '06:00', 10, quiet).toISOString()).toBe('2026-11-10T06:00:00.000Z');
  });

  it('handles quiet hours that do not cross midnight and disabled quiet hours', () => {
    expect(alarmTriggerAt('2026-11-10', '13:00', 0, { start: '12:00', end: '14:00' }).toISOString()).toBe(
      '2026-11-10T13:00:00.000Z',
    );
    expect(alarmTriggerAt('2026-11-10', '23:00', 0, null).toISOString()).toBe('2026-11-10T22:00:00.000Z');
  });

  it('works across the DST switch', () => {
    // 2026-10-25 (fall back) – 18:00 is CET (+1)
    expect(alarmTriggerAt('2026-10-25', '18:00', 10, quiet).toISOString()).toBe('2026-10-25T17:10:00.000Z');
  });
});

describe('buildAlarmList', () => {
  const sessions = [
    {
      occurrenceKey: 'a',
      date: '2026-11-10',
      endTime: '19:30',
      title: 'Training',
      team: 'U12',
      status: 'planned',
      alarmOffsetMin: 10,
    },
    {
      occurrenceKey: 'b',
      date: '2026-11-11',
      endTime: '19:30',
      title: 'Training',
      team: 'U14',
      status: 'cancelled',
      alarmOffsetMin: 10,
    },
    {
      occurrenceKey: 'c',
      date: '2026-11-09',
      endTime: '19:30',
      title: 'Training',
      team: 'U12',
      status: 'held',
      alarmOffsetMin: 10,
    },
    {
      occurrenceKey: 'd',
      date: '2026-11-08',
      endTime: '19:30',
      title: 'Training',
      team: 'U12',
      status: 'pending',
      alarmOffsetMin: 10,
    },
  ];

  it('only contains future, unanswered, non-cancelled sessions', () => {
    const list = buildAlarmList(sessions, new Date('2026-11-10T12:00:00Z'), quiet);
    expect(list).toEqual([
      {
        key: 'a',
        triggerAt: Date.parse('2026-11-10T18:40:00Z'),
        title: 'U12 Training gehalten?',
        subtitle: 'Di, 10.11.2026 · bis 19:30',
      },
    ]);
  });
});

describe('isDue', () => {
  it('is due 2 minutes before the phone alarm (§4.4) and only while unanswered', () => {
    const s = { date: '2026-11-10', endTime: '19:30', status: 'planned', alarmOffsetMin: 10 };
    expect(isDue(s, new Date('2026-11-10T18:37:59Z'))).toBe(false);
    expect(isDue(s, new Date('2026-11-10T18:38:00Z'))).toBe(true);
    expect(isDue(s, new Date('2026-11-10T18:41:00Z'))).toBe(true);
    expect(isDue({ ...s, status: 'held' }, new Date('2026-11-10T18:41:00Z'))).toBe(false);
  });
});
