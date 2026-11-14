// SPDX-License-Identifier: AGPL-3.0-or-later
import { exports } from 'cloudflare:workers';

export const BASE = 'http://localhost';

export interface Client {
  cookie: string;
  deviceToken: string | null;
  deviceId: string | null;
  userId: string;
  /** cookie-authenticated request */
  req(path: string, init?: RequestInit & { json?: unknown; now?: string }): Promise<Response>;
  /** bearer (device token) request */
  dev(path: string, init?: RequestInit & { json?: unknown; now?: string }): Promise<Response>;
}

let counter = 0;

export function call(path: string, init: RequestInit & { json?: unknown; now?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  if (init.now) headers.set('x-test-now', init.now);
  return exports.default.fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
}

export async function login(opts: { githubId?: string; android?: boolean; alarmDevice?: boolean } = {}) {
  const githubId = opts.githubId ?? `t${Date.now()}-${++counter}`;
  const res = await call('/api/test/login', {
    method: 'POST',
    json: { githubId, android: opts.android ?? false, alarmDevice: opts.alarmDevice ?? false },
  });
  if (res.status !== 200) throw new Error(`login failed ${res.status}`);
  const body = (await res.json()) as {
    userId: string;
    sessionToken: string;
    deviceToken: string | null;
    deviceId: string | null;
  };
  const cookie = `ult_session=${body.sessionToken}`;
  const client: Client = {
    cookie,
    deviceToken: body.deviceToken,
    deviceId: body.deviceId,
    userId: body.userId,
    req: (path, init = {}) => call(path, { ...init, headers: { ...(init.headers as object), cookie } }),
    dev: (path, init = {}) =>
      call(path, {
        ...init,
        headers: { ...(init.headers as object), authorization: `Bearer ${body.deviceToken}` },
      }),
  };
  return client;
}

export async function json<T = unknown>(res: Response | Promise<Response>): Promise<T> {
  return (await (await res).json()) as T;
}

export const U12 = {
  title: 'Training',
  team: 'U12',
  location: 'Sporthalle',
  weekdays: 2, // Tue
  startTime: '18:00',
  endTime: '19:30',
  startsOn: '2026-09-01',
};
