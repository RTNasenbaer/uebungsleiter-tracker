// SPDX-License-Identifier: AGPL-3.0-or-later
import { fixedClock } from '@ult/shared';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { runCron } from '../src/cron';
import { createDb } from '../src/db';
import { testRoutesEnabled } from '../src/env';
import { json, login, U12 } from './helpers';

describe('cron', () => {
  it('materializes upcoming sessions and moves past ones to pending', async () => {
    const a = await login();
    const { series } = await json<{ series: { id: string } }>(
      a.req('/api/series', {
        method: 'POST',
        json: { ...U12, startsOn: '2026-11-01' },
        now: '2026-11-01T08:00:00Z',
      }),
    );
    const res = await runCron(createDb(env.DB), fixedClock('2026-11-10T19:00:00Z')); // 20:00 Berlin, after 19:30
    expect(res.users).toBeGreaterThanOrEqual(1);
    const status = await json<{ status: string }>(a.req(`/api/sessions/status?key=${series.id}:2026-11-10`));
    expect(status.status).toBe('pending');
    const later = await json<{ status: string }>(a.req(`/api/sessions/status?key=${series.id}:2026-12-01`));
    expect(later.status).toBe('planned'); // within today + 28 days
  });

  it('auto-confirms pending sessions after the configured hours', async () => {
    const a = await login();
    await a.req('/api/settings', { method: 'PUT', json: { autoConfirmAfterHours: 48 } });
    const { series } = await json<{ series: { id: string } }>(
      a.req('/api/series', {
        method: 'POST',
        json: { ...U12, startsOn: '2026-11-03' },
        now: '2026-11-03T08:00:00Z',
      }),
    );
    await runCron(createDb(env.DB), fixedClock('2026-11-05T18:00:00Z')); // 47.5 h after end
    expect(
      (await json<{ status: string }>(a.req(`/api/sessions/status?key=${series.id}:2026-11-03`))).status,
    ).toBe('pending');
    await runCron(createDb(env.DB), fixedClock('2026-11-05T19:00:00Z'));
    const s = await json<{ status: string }>(a.req(`/api/sessions/status?key=${series.id}:2026-11-03`));
    expect(s.status).toBe('held');
  });

  it('deletes expired pairing codes', async () => {
    const a = await login();
    await a.req('/api/devices/pairing-code', { method: 'POST', now: '2026-01-01T00:00:00Z' });
    await runCron(createDb(env.DB), fixedClock('2026-01-01T01:00:00Z'));
    const { results } = await env.DB.prepare('select count(*) as n from pairing_codes where expires_at < ?')
      .bind('2026-01-01T01:00:00Z')
      .all<{ n: number }>();
    expect(results[0]!.n).toBe(0);
  });
});

describe('test route gating', () => {
  it('is disabled in production or without the flag', () => {
    expect(testRoutesEnabled({ ENABLE_TEST_ROUTES: 'true', ENVIRONMENT: 'production' } as never)).toBe(false);
    expect(testRoutesEnabled({ ENABLE_TEST_ROUTES: 'false', ENVIRONMENT: 'development' } as never)).toBe(
      false,
    );
    expect(testRoutesEnabled({ ENABLE_TEST_ROUTES: 'true', ENVIRONMENT: 'development' } as never)).toBe(true);
  });
});
