// SPDX-License-Identifier: AGPL-3.0-or-later
import type { SessionDto } from '@ult/shared';
import { describe, expect, it } from 'vitest';
import { call, json, login, U12 } from './helpers';

const NOW = '2026-09-20T10:00:00Z'; // Sunday

async function setup(opts: { android?: boolean; alarmDevice?: boolean } = {}) {
  const a = await login(opts);
  const created = await json<{ series: { id: string }; createdSessions: number }>(
    a.req('/api/series', { method: 'POST', json: { ...U12, weekdays: 2 | 8 }, now: NOW }),
  );
  return { a, seriesId: created.series.id, created: created.createdSessions };
}

describe('series & materialization', () => {
  it('creates past sessions as pending for "Nachtragen" and future ones as planned', async () => {
    const { a, created } = await setup();
    expect(created).toBeGreaterThan(6);
    const open = await json<SessionDto[]>(a.req('/api/sessions/open', { now: NOW }));
    // Tue+Thu from 1.9. until 17.9. = 6 past sessions
    expect(open.map((s) => s.date)).toEqual([
      '2026-09-17',
      '2026-09-15',
      '2026-09-10',
      '2026-09-08',
      '2026-09-03',
      '2026-09-01',
    ]);
    const future = await json<SessionDto[]>(
      a.req('/api/sessions?from=2026-09-21&to=2026-09-30', { now: NOW }),
    );
    expect(future.map((s) => [s.date, s.status])).toEqual([
      ['2026-09-22', 'planned'],
      ['2026-09-24', 'planned'],
      ['2026-09-29', 'planned'],
    ]);
  });

  it('is idempotent – listing twice creates no duplicates', async () => {
    const { a } = await setup();
    const one = await json<SessionDto[]>(a.req('/api/sessions?from=2026-09-01&to=2026-12-31', { now: NOW }));
    const two = await json<SessionDto[]>(a.req('/api/sessions?from=2026-09-01&to=2026-12-31', { now: NOW }));
    expect(two.map((s) => s.occurrenceKey)).toEqual(one.map((s) => s.occurrenceKey));
    expect(new Set(one.map((s) => s.occurrenceKey)).size).toBe(one.length);
  });

  it('bulk-confirms open sessions', async () => {
    const { a } = await setup();
    const open = await json<SessionDto[]>(a.req('/api/sessions/open', { now: NOW }));
    const res = await json<{ updated: number }>(
      a.req('/api/sessions/bulk', {
        method: 'POST',
        json: { keys: open.map((s) => s.occurrenceKey), status: 'held' },
        now: NOW,
      }),
    );
    expect(res.updated).toBe(6);
    expect(await json<SessionDto[]>(a.req('/api/sessions/open', { now: NOW }))).toEqual([]);
    const me = await json<{ openCount: number }>(a.req('/api/me', { now: NOW }));
    expect(me.openCount).toBe(0);
  });

  it('series edit "all" only changes future, unanswered, non-overridden sessions', async () => {
    const { a, seriesId } = await setup();
    const all = await json<SessionDto[]>(a.req('/api/sessions?from=2026-09-01&to=2026-10-31', { now: NOW }));
    const override = all.find((s) => s.date === '2026-09-29')!;
    await a.req(`/api/sessions/${override.id}`, {
      method: 'PATCH',
      json: { location: 'Ausweichhalle' },
      now: NOW,
    });
    await a.req(`/api/series/${seriesId}`, {
      method: 'PUT',
      json: { series: { ...U12, weekdays: 2 | 8, location: 'Neue Halle', startTime: '17:30' }, scope: 'all' },
      now: NOW,
    });
    const after = await json<SessionDto[]>(
      a.req('/api/sessions?from=2026-09-01&to=2026-10-31', { now: NOW }),
    );
    const byDate = new Map(after.map((s) => [s.date, s]));
    expect(byDate.get('2026-09-01')!.location).toBe('Sporthalle'); // past: unchanged
    expect(byDate.get('2026-09-22')!).toMatchObject({ location: 'Neue Halle', startTime: '17:30' });
    expect(byDate.get('2026-09-29')!).toMatchObject({ location: 'Ausweichhalle', isOverride: true });
    expect(byDate.get('2026-10-27')!.location).toBe('Neue Halle');
  });

  it('series edit "following" splits the series', async () => {
    const { a, seriesId } = await setup();
    const res = await json<{ series: { id: string; startsOn: string }; previous: { endsOn: string } }>(
      a.req(`/api/series/${seriesId}`, {
        method: 'PUT',
        json: {
          series: { ...U12, weekdays: 4, startTime: '17:00' },
          scope: 'following',
          fromDate: '2026-10-01',
        },
        now: NOW,
      }),
    );
    expect(res.previous.endsOn).toBe('2026-09-30');
    expect(res.series.startsOn).toBe('2026-10-01');
    const sessions = await json<SessionDto[]>(
      a.req('/api/sessions?from=2026-09-21&to=2026-10-14', { now: NOW }),
    );
    expect(sessions.map((s) => [s.date, s.startTime])).toEqual([
      ['2026-09-22', '18:00'],
      ['2026-09-24', '18:00'],
      ['2026-09-29', '18:00'],
      ['2026-10-07', '17:00'],
      ['2026-10-14', '17:00'],
    ]);
    const list = await json<{ id: string }[]>(a.req('/api/series'));
    expect(list).toHaveLength(2);
  });

  it('deleting a series keeps answered sessions', async () => {
    const { a, seriesId } = await setup();
    await a.req('/api/sessions/answer', {
      method: 'POST',
      json: { occurrence_key: `${seriesId}:2026-09-01`, status: 'held' },
      now: NOW,
    });
    expect((await a.req(`/api/series/${seriesId}`, { method: 'DELETE', now: NOW })).status).toBe(200);
    const left = await json<SessionDto[]>(a.req('/api/sessions?from=2026-09-01&to=2026-12-31', { now: NOW }));
    expect(left.find((s) => s.date === '2026-09-01')?.status).toBe('held');
    expect(left.some((s) => s.date > '2026-09-20')).toBe(false);
  });
});

describe('answers', () => {
  it('is idempotent via occurrence_key and the newest answer wins', async () => {
    const { a, seriesId } = await setup({ android: true, alarmDevice: true });
    const key = `${seriesId}:2026-09-15`;
    const body = { occurrence_key: key, status: 'held', answered_at: '2026-09-15T17:45:00Z', via: 'alarm' };
    const r1 = await json<SessionDto>(
      a.dev('/api/sessions/answer', { method: 'POST', json: body, now: NOW }),
    );
    const r2 = await json<SessionDto>(
      a.dev('/api/sessions/answer', { method: 'POST', json: body, now: NOW }),
    );
    expect(r1).toEqual(r2);
    expect(r1).toMatchObject({ status: 'held', answeredVia: 'alarm', answeredDeviceId: a.deviceId });

    // newer web edit
    await a.req('/api/sessions/answer', {
      method: 'POST',
      json: { occurrence_key: key, status: 'not_held', answered_at: '2026-09-16T08:00:00Z' },
      now: NOW,
    });
    // an old queued alarm answer arrives late → ignored
    const late = await json<SessionDto>(
      a.dev('/api/sessions/answer', { method: 'POST', json: body, now: NOW }),
    );
    expect(late.status).toBe('not_held');
  });

  it('answers future occurrences that were not materialized yet', async () => {
    const { a, seriesId } = await setup();
    const res = await a.req('/api/sessions/answer', {
      method: 'POST',
      json: { occurrence_key: `${seriesId}:2026-12-01`, status: 'cancelled' },
      now: NOW,
    });
    expect(res.status).toBe(200);
    expect((await json<SessionDto>(res)).status).toBe('cancelled');
  });

  it('reports status for the alarm online check', async () => {
    const { a, seriesId } = await setup({ android: true });
    const key = `${seriesId}:2026-09-22`;
    expect(await json(a.dev(`/api/sessions/status?key=${key}`, { now: NOW }))).toMatchObject({
      status: 'planned',
      answered: false,
    });
    await a.req('/api/sessions/answer', {
      method: 'POST',
      json: { occurrence_key: key, status: 'cancelled' },
      now: NOW,
    });
    expect(await json(a.dev(`/api/sessions/status?key=${key}`, { now: NOW }))).toMatchObject({
      status: 'cancelled',
      answered: true,
    });
  });

  it('validates input', async () => {
    const a = await login();
    const res = await a.req('/api/sessions/answer', {
      method: 'POST',
      json: { occurrence_key: 'x', status: 'maybe' },
    });
    expect(res.status).toBe(400);
  });
});

describe('alarm list', () => {
  it('is empty for devices that are not the alarm device', async () => {
    const { a } = await setup({ android: true, alarmDevice: false });
    const r = await json<{ isAlarmDevice: boolean; alarms: unknown[] }>(
      a.dev('/api/sessions/alarms', { now: NOW }),
    );
    expect(r).toMatchObject({ isAlarmDevice: false, alarms: [] });
  });

  it('lists the next 14 days for the alarm device (Berlin time, offset 10 min)', async () => {
    const { a, seriesId } = await setup({ android: true, alarmDevice: true });
    await a.req('/api/sessions/answer', {
      method: 'POST',
      json: { occurrence_key: `${seriesId}:2026-09-24`, status: 'cancelled' },
      now: NOW,
    });
    const r = await json<{
      alarms: { key: string; triggerAt: number; title: string }[];
      settings: { ringSeconds: number };
    }>(a.dev('/api/sessions/alarms', { now: NOW }));
    expect(r.alarms.map((x) => x.key)).toEqual([
      `${seriesId}:2026-09-22`,
      `${seriesId}:2026-09-29`,
      `${seriesId}:2026-10-01`,
    ]);
    expect(new Date(r.alarms[0]!.triggerAt).toISOString()).toBe('2026-09-22T17:40:00.000Z');
    expect(r.alarms[0]!.title).toBe('U12 Training gehalten?');
    expect(r.settings.ringSeconds).toBe(60);
  });
});

describe('in-app due list', () => {
  it('shows a session 2 minutes before the phone alarm until answered or snoozed', async () => {
    const { a, seriesId } = await setup();
    const key = `${seriesId}:2026-09-22`;
    expect(await json<SessionDto[]>(a.req('/api/sessions/due', { now: '2026-09-22T17:37:00Z' }))).toEqual([]);
    const due = await json<SessionDto[]>(a.req('/api/sessions/due', { now: '2026-09-22T17:38:00Z' }));
    expect(due.map((s) => s.occurrenceKey)).toEqual([key]);
    await a.req('/api/sessions/snooze', {
      method: 'POST',
      json: { occurrence_key: key, minutes: 30 },
      now: '2026-09-22T17:38:00Z',
    });
    expect(await json<SessionDto[]>(a.req('/api/sessions/due', { now: '2026-09-22T18:00:00Z' }))).toEqual([]);
    expect(
      (await json<SessionDto[]>(a.req('/api/sessions/due', { now: '2026-09-22T18:09:00Z' }))).length,
    ).toBe(1);
    await a.req('/api/sessions/answer', {
      method: 'POST',
      json: { occurrence_key: key, status: 'held' },
      now: '2026-09-22T18:09:00Z',
    });
    expect(await json<SessionDto[]>(a.req('/api/sessions/due', { now: '2026-09-22T18:10:00Z' }))).toEqual([]);
  });
});

describe('single sessions & edits', () => {
  it('creates, edits and deletes a single session', async () => {
    const a = await login();
    const created = await json<SessionDto>(
      a.req('/api/sessions', {
        method: 'POST',
        json: {
          date: '2026-09-26',
          startTime: '10:00',
          endTime: '16:00',
          title: 'Turnier',
          team: 'U12',
          kind: 'tournament',
          units: 2,
        },
        now: NOW,
      }),
    );
    expect(created.occurrenceKey).toMatch(/^single:/);
    expect(created.status).toBe('planned');
    const edited = await json<SessionDto>(
      a.req(`/api/sessions/${created.id}`, {
        method: 'PATCH',
        json: { status: 'held', note: 'Vertretung' },
        now: NOW,
      }),
    );
    expect(edited).toMatchObject({
      status: 'held',
      note: 'Vertretung',
      answeredVia: 'web',
      isOverride: false,
    });
    expect((await a.req(`/api/sessions/${created.id}`, { method: 'DELETE' })).status).toBe(200);
    expect(
      await json<SessionDto[]>(a.req('/api/sessions?from=2026-09-26&to=2026-09-26', { now: NOW })),
    ).toEqual([]);
  });

  it('marks edited series sessions as override and "deleting" cancels them', async () => {
    const { a } = await setup();
    const [s] = await json<SessionDto[]>(a.req('/api/sessions?from=2026-09-22&to=2026-09-22', { now: NOW }));
    const edited = await json<SessionDto>(
      a.req(`/api/sessions/${s!.id}`, { method: 'PATCH', json: { startTime: '18:30' }, now: NOW }),
    );
    expect(edited.isOverride).toBe(true);
    await a.req(`/api/sessions/${s!.id}`, { method: 'DELETE', now: NOW });
    const [after] = await json<SessionDto[]>(
      a.req('/api/sessions?from=2026-09-22&to=2026-09-22', { now: NOW }),
    );
    expect(after!.status).toBe('cancelled');
  });
});

describe('exceptions', () => {
  it('removes sessions in holidays and restores them when the exception is deleted', async () => {
    const { a } = await setup();
    const ex = await json<{ id: string }>(
      a.req('/api/exceptions', {
        method: 'POST',
        json: { fromDate: '2026-10-12', toDate: '2026-10-24', label: 'Herbstferien' },
        now: NOW,
      }),
    );
    let s = await json<SessionDto[]>(a.req('/api/sessions?from=2026-10-01&to=2026-10-31', { now: NOW }));
    expect(s.map((x) => x.date)).toEqual([
      '2026-10-01',
      '2026-10-06',
      '2026-10-08',
      '2026-10-27',
      '2026-10-29',
    ]);
    await a.req(`/api/exceptions/${ex.id}`, { method: 'DELETE' });
    s = await json<SessionDto[]>(a.req('/api/sessions?from=2026-10-01&to=2026-10-31', { now: NOW }));
    expect(s).toHaveLength(9);
  });

  it('imports .ics-parsed exceptions in bulk without duplicates', async () => {
    const a = await login();
    const items = [
      { fromDate: '2026-12-21', toDate: '2027-01-02', label: 'Weihnachtsferien' },
      { fromDate: '2027-02-15', toDate: '2027-02-19', label: 'Winterferien' },
    ];
    expect(await json(a.req('/api/exceptions/bulk', { method: 'POST', json: { items } }))).toEqual({
      created: 2,
      skipped: 0,
    });
    expect(await json(a.req('/api/exceptions/bulk', { method: 'POST', json: { items } }))).toEqual({
      created: 0,
      skipped: 2,
    });
  });
});

describe('import & backup', () => {
  it('imports sessions with duplicate check', async () => {
    const a = await login();
    const sessions = [
      {
        date: '2026-03-03',
        startTime: '18:00',
        endTime: '19:30',
        title: 'Training',
        team: 'U12',
        status: 'held',
      },
      {
        date: '2026-03-05',
        startTime: '18:00',
        endTime: '19:30',
        title: 'Training',
        team: 'U12',
        status: 'held',
      },
    ];
    expect(await json(a.req('/api/sessions/import', { method: 'POST', json: { sessions } }))).toEqual({
      created: 2,
      updated: 0,
      skipped: 0,
    });
    expect(await json(a.req('/api/sessions/import', { method: 'POST', json: { sessions } }))).toEqual({
      created: 0,
      updated: 0,
      skipped: 2,
    });
    expect(
      await json(
        a.req('/api/sessions/import', {
          method: 'POST',
          json: { sessions: [{ ...sessions[0], units: 2 }], onDuplicate: 'overwrite' },
        }),
      ),
    ).toEqual({ created: 0, updated: 1, skipped: 0 });
  });

  it('round-trips a JSON backup into another account', async () => {
    const { a } = await setup();
    await a.req('/api/settings', {
      method: 'PUT',
      json: { clubName: 'TV Beispiel', displayName: 'Muster, Max' },
    });
    const backup = await json<{ sessions: unknown[]; series: unknown[] }>(a.req('/api/backup', { now: NOW }));
    expect(backup.series).toHaveLength(1);
    const b = await login();
    const res = await json<{ created: number }>(
      b.req('/api/backup/restore', { method: 'POST', json: backup, now: NOW }),
    );
    expect(res.created).toBe(backup.sessions.length);
    const settings = await json<{ clubName: string }>(b.req('/api/settings'));
    expect(settings.clubName).toBe('TV Beispiel');
  });
});

describe('settings', () => {
  it('has SPEC defaults and validates updates', async () => {
    const a = await login();
    const s = await json<Record<string, unknown>>(a.req('/api/settings'));
    expect(s).toMatchObject({
      reportDeadline: '12-15',
      defaultPayCents: 1500,
      taxFreeLimitCents: 330000,
      autoConfirmAfterHours: null,
      alarmVibrate: true,
      alarmRingSeconds: 60,
      snoozeMinutes: 30,
      quietStart: '22:00',
      quietEnd: '07:00',
    });
    expect((await a.req('/api/settings', { method: 'PUT', json: { reportDeadline: '13-40' } })).status).toBe(
      400,
    );
  });
});

describe('test routes', () => {
  it('are reachable in test mode', async () => {
    expect((await call('/api/test/cron', { method: 'POST' })).status).toBe(200);
  });
});
