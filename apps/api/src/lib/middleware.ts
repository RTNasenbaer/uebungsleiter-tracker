// SPDX-License-Identifier: AGPL-3.0-or-later
import { fixedClock, systemClock } from '@ult/shared';
import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { createDb } from '../db';
import { devices } from '../db/schema';
import { type AppEnv, testRoutesEnabled } from '../env';
import { readSessionCookie, setSessionCookie, validateDeviceToken, validateSessionToken } from './auth';

/** Injects db + clock. In test mode the clock can be overridden via `x-test-now`. */
export const context = createMiddleware<AppEnv>(async (c, next) => {
  c.set('db', createDb(c.env.DB));
  const testNow = c.req.header('x-test-now');
  c.set('clock', testNow && testRoutesEnabled(c.env) ? fixedClock(testNow) : systemClock);
  await next();
});

const LAST_SEEN_THROTTLE_MS = 5 * 60_000;

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const db = c.get('db');
  const now = c.get('clock').now();
  const authz = c.req.header('authorization');
  if (authz?.startsWith('Bearer ')) {
    const device = await validateDeviceToken(db, authz.slice(7).trim());
    if (!device) throw new HTTPException(401, { message: 'Ungültiges Geräte-Token' });
    c.set('userId', device.userId);
    c.set('deviceId', device.id);
    c.set('authKind', 'bearer');
    const appVersion = c.req.header('x-app-version') ?? device.appVersion;
    if (
      !device.lastSeenAt ||
      now.getTime() - Date.parse(device.lastSeenAt) > LAST_SEEN_THROTTLE_MS ||
      appVersion !== device.appVersion
    ) {
      await db
        .update(devices)
        .set({ lastSeenAt: now.toISOString(), appVersion })
        .where(eq(devices.id, device.id));
    }
    return next();
  }
  const token = readSessionCookie(c);
  if (!token) throw new HTTPException(401, { message: 'Nicht angemeldet' });
  const session = await validateSessionToken(db, token, now);
  if (!session) throw new HTTPException(401, { message: 'Sitzung abgelaufen' });
  if (session.refreshedExpiresAt) setSessionCookie(c, token, session.refreshedExpiresAt);
  c.set('userId', session.userId);
  c.set('deviceId', session.deviceId);
  c.set('authKind', 'cookie');
  if (session.deviceId) {
    const d = await db.query.devices.findFirst({ where: eq(devices.id, session.deviceId) });
    if (d && (!d.lastSeenAt || now.getTime() - Date.parse(d.lastSeenAt) > LAST_SEEN_THROTTLE_MS)) {
      await db.update(devices).set({ lastSeenAt: now.toISOString() }).where(eq(devices.id, d.id));
    }
  }
  return next();
});

export const requireCookieAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (c.get('authKind') !== 'cookie') throw new HTTPException(403, { message: 'Nur im Browser möglich' });
  return next();
});
