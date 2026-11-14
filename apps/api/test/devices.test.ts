// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { PAIR_RATE_LIMIT } from '../src/routes/devices';
import { call, json, login } from './helpers';

type Device = { id: string; name: string; platform: string; isAlarmDevice: boolean };

async function pair(code: string, ip = '10.0.0.1', name = 'Pixel 8') {
  return call('/api/pair', { method: 'POST', json: { code, name }, headers: { 'cf-connecting-ip': ip } });
}

describe('pairing', () => {
  it('creates a single-use code that yields a device token', async () => {
    const a = await login();
    const { code, expiresAt } = await json<{ code: string; expiresAt: string }>(
      a.req('/api/devices/pairing-code', { method: 'POST' }),
    );
    expect(code).toMatch(/^[A-Z0-9]{8}$/);
    expect(Date.parse(expiresAt)).toBeGreaterThan(Date.now());

    const res = await pair(`${code.slice(0, 4)}-${code.slice(4).toLowerCase()}`, '10.0.1.1');
    expect(res.status).toBe(200);
    const { token, deviceId } = await json<{ token: string; deviceId: string }>(res);
    expect(token.length).toBeGreaterThanOrEqual(43);

    const me = await json<{ user: { id: string }; device: Device }>(
      call('/api/me', { headers: { authorization: `Bearer ${token}` } }),
    );
    expect(me.user.id).toBe(a.userId);
    expect(me.device).toMatchObject({
      id: deviceId,
      platform: 'android',
      name: 'Pixel 8',
      isAlarmDevice: true,
    });

    // second use fails
    expect((await pair(code, '10.0.1.2')).status).toBe(400);
  });

  it('rejects expired codes', async () => {
    const a = await login();
    const { code } = await json<{ code: string }>(
      a.req('/api/devices/pairing-code', { method: 'POST', now: '2026-01-01T10:00:00Z' }),
    );
    const res = await call('/api/pair', {
      method: 'POST',
      json: { code, name: 'Pixel' },
      now: '2026-01-01T10:05:01Z',
      headers: { 'cf-connecting-ip': '10.0.2.1' },
    });
    expect(res.status).toBe(400);
  });

  it('only allows creating codes from the browser (cookie), not with a device token', async () => {
    const a = await login({ android: true });
    expect((await a.dev('/api/devices/pairing-code', { method: 'POST' })).status).toBe(403);
  });

  it('rate-limits code redemption per IP', async () => {
    const ip = '10.9.9.9';
    for (let i = 0; i < PAIR_RATE_LIMIT; i++) expect((await pair('AAAAAAAA', ip)).status).toBe(400);
    expect((await pair('AAAAAAAA', ip)).status).toBe(429);
  });

  it('validates the code format', async () => {
    expect((await pair('12', '10.0.3.1')).status).toBe(400);
  });
});

describe('devices', () => {
  it('keeps at most one alarm device per user', async () => {
    const a = await login({ android: true, alarmDevice: true });
    const { code } = await json<{ code: string }>(a.req('/api/devices/pairing-code', { method: 'POST' }));
    const second = await json<{ deviceId: string }>(pair(code, '10.0.4.1', 'Tablet'));
    let list = await json<Device[]>(a.req('/api/devices'));
    // the first phone stays alarm device, the new one does not take over automatically
    expect(list.filter((d) => d.isAlarmDevice).map((d) => d.id)).toEqual([a.deviceId]);

    const res = await a.req(`/api/devices/${second.deviceId}`, {
      method: 'PATCH',
      json: { isAlarmDevice: true },
    });
    expect(res.status).toBe(200);
    list = await json<Device[]>(a.req('/api/devices'));
    expect(list.filter((d) => d.isAlarmDevice).map((d) => d.id)).toEqual([second.deviceId]);
  });

  it('refuses browsers as alarm device', async () => {
    const a = await login();
    const [web] = await json<Device[]>(a.req('/api/devices'));
    expect(
      (await a.req(`/api/devices/${web!.id}`, { method: 'PATCH', json: { isAlarmDevice: true } })).status,
    ).toBe(400);
  });

  it('removing a device revokes its token', async () => {
    const a = await login({ android: true });
    expect((await a.dev('/api/me')).status).toBe(200);
    expect((await a.req(`/api/devices/${a.deviceId}`, { method: 'DELETE' })).status).toBe(200);
    expect((await a.dev('/api/me')).status).toBe(401);
  });

  it('marks the current device', async () => {
    const a = await login({ android: true });
    const list = await json<(Device & { isCurrent: boolean })[]>(a.dev('/api/devices'));
    expect(list.find((d) => d.isCurrent)?.id).toBe(a.deviceId);
  });
});
