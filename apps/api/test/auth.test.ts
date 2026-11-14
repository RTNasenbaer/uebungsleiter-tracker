// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { isAllowedGithubId } from '../src/routes/auth';
import { call, json, login, U12 } from './helpers';

describe('auth', () => {
  it('rejects unauthenticated requests', async () => {
    for (const path of ['/api/me', '/api/series', '/api/sessions/open', '/api/devices', '/api/settings']) {
      expect((await call(path)).status, path).toBe(401);
    }
  });

  it('rejects invalid cookies and invalid device tokens', async () => {
    expect((await call('/api/me', { headers: { cookie: 'ult_session=nope' } })).status).toBe(401);
    expect((await call('/api/me', { headers: { authorization: 'Bearer nope' } })).status).toBe(401);
  });

  it('accepts a valid session and reports the user', async () => {
    const a = await login();
    const me = await json<{ user: { id: string }; device: { platform: string } }>(a.req('/api/me'));
    expect(me.user.id).toBe(a.userId);
    expect(me.device.platform).toBe('web');
  });

  it('enforces the GitHub allowlist', () => {
    const env = { ALLOWED_GITHUB_IDS: '1001, 1002' };
    expect(isAllowedGithubId(env, '1001')).toBe(true);
    expect(isAllowedGithubId(env, '1002')).toBe(true);
    expect(isAllowedGithubId(env, '9999')).toBe(false);
    expect(isAllowedGithubId({ ALLOWED_GITHUB_IDS: '' }, '1001')).toBe(false);
  });

  it('redirects to GitHub with a state cookie', async () => {
    const res = await call('/api/auth/github', { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    expect(res.headers.get('set-cookie')).toMatch(/ult_oauth_state=.*HttpOnly/i);
  });

  it('rejects a callback with a wrong state', async () => {
    const res = await call('/api/auth/github/callback?code=x&state=y', {
      redirect: 'manual',
      headers: { cookie: 'ult_oauth_state=z' },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('/login?error=state');
  });

  it('sets an HttpOnly SameSite=Lax session cookie on test login', async () => {
    const res = await call('/api/test/login', { method: 'POST', json: { githubId: 'cookie-test' } });
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/ult_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('logout invalidates the session and removes the browser device', async () => {
    const a = await login();
    expect((await a.req('/api/auth/logout', { method: 'POST' })).status).toBe(200);
    expect((await a.req('/api/me')).status).toBe(401);
  });

  it('sets security headers', async () => {
    const res = await call('/api/health');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBeTruthy();
  });

  it('allows CORS only for known origins', async () => {
    const ok = await call('/api/health', { headers: { origin: 'https://localhost' } });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://localhost');
    const bad = await call('/api/health', { headers: { origin: 'https://evil.example' } });
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('user isolation', () => {
  it('user A never sees or modifies data of user B', async () => {
    const a = await login();
    const b = await login();
    const created = await json<{ series: { id: string } }>(
      a.req('/api/series', { method: 'POST', json: U12, now: '2026-09-20T10:00:00Z' }),
    );
    const seriesId = created.series.id;
    expect(await json<unknown[]>(b.req('/api/series'))).toEqual([]);
    expect(await json<unknown[]>(b.req('/api/sessions?from=2026-09-01&to=2026-09-30'))).toEqual([]);
    expect(await json<unknown[]>(b.req('/api/sessions/open', { now: '2026-09-20T10:00:00Z' }))).toEqual([]);
    expect(
      (await b.req(`/api/series/${seriesId}`, { method: 'PUT', json: { series: U12, scope: 'all' } })).status,
    ).toBe(404);
    expect((await b.req(`/api/series/${seriesId}`, { method: 'DELETE' })).status).toBe(404);

    const aSessions = await json<{ id: string; occurrenceKey: string }[]>(
      a.req('/api/sessions?from=2026-09-01&to=2026-09-30', { now: '2026-09-20T10:00:00Z' }),
    );
    expect(aSessions.length).toBe(5);
    const target = aSessions[0]!;
    expect((await b.req(`/api/sessions/${target.id}`, { method: 'PATCH', json: { note: 'x' } })).status).toBe(
      404,
    );
    expect((await b.req(`/api/sessions/${target.id}`, { method: 'DELETE' })).status).toBe(404);
    expect(
      (
        await b.req('/api/sessions/answer', {
          method: 'POST',
          json: { occurrence_key: target.occurrenceKey, status: 'held' },
        })
      ).status,
    ).toBe(404);
    const bulk = await json<{ updated: number }>(
      b.req('/api/sessions/bulk', { method: 'POST', json: { keys: [target.occurrenceKey], status: 'held' } }),
    );
    expect(bulk.updated).toBe(0);
    const status = await json<{ status: string }>(b.req(`/api/sessions/status?key=${target.occurrenceKey}`));
    expect(status.status).toBe('unknown');
    const devicesA = await json<{ id: string }[]>(a.req('/api/devices'));
    expect((await b.req(`/api/devices/${devicesA[0]!.id}`, { method: 'DELETE' })).status).toBe(404);
    const backupB = await json<{ sessions: unknown[]; series: unknown[] }>(b.req('/api/backup'));
    expect(backupB.series).toEqual([]);
    expect(backupB.sessions).toEqual([]);
  });
});
