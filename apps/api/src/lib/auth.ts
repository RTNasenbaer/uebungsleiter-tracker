// SPDX-License-Identifier: AGPL-3.0-or-later
/** Sessions following the Lucia guide: random token in cookie, SHA-256 in DB, 60 days rolling. */
import { and, eq, isNotNull } from 'drizzle-orm';
import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { Db } from '../db';
import { authSessions, devices } from '../db/schema';
import type { AppEnv } from '../env';
import { generateToken, newId, sha256Hex } from './crypto';

export const SESSION_COOKIE = 'ult_session';
const DAY = 86_400_000;
export const SESSION_TTL_MS = 60 * DAY;

export async function createAuthSession(db: Db, userId: string, deviceId: string | null, now: Date) {
  const token = generateToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.insert(authSessions).values({
    id: await sha256Hex(token),
    userId,
    deviceId,
    expiresAt: expiresAt.toISOString(),
  });
  return { token, expiresAt };
}

export async function validateSessionToken(db: Db, token: string, now: Date) {
  const id = await sha256Hex(token);
  const row = await db.query.authSessions.findFirst({ where: eq(authSessions.id, id) });
  if (!row) return null;
  const expires = Date.parse(row.expiresAt);
  if (expires <= now.getTime()) {
    await db.delete(authSessions).where(eq(authSessions.id, id));
    return null;
  }
  let refreshedExpiresAt: Date | null = null;
  if (expires - now.getTime() < SESSION_TTL_MS / 2) {
    refreshedExpiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db
      .update(authSessions)
      .set({ expiresAt: refreshedExpiresAt.toISOString(), updatedAt: now.toISOString() })
      .where(eq(authSessions.id, id));
  }
  return { userId: row.userId, deviceId: row.deviceId, sessionId: id, refreshedExpiresAt };
}

export async function invalidateSession(db: Db, token: string) {
  await db.delete(authSessions).where(eq(authSessions.id, await sha256Hex(token)));
}

export async function validateDeviceToken(db: Db, token: string) {
  const hash = await sha256Hex(token);
  return (
    (await db.query.devices.findFirst({
      where: and(eq(devices.tokenHash, hash), isNotNull(devices.tokenHash)),
    })) ?? null
  );
}

export function setSessionCookie(c: Context<AppEnv>, token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(c: Context<AppEnv>) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function readSessionCookie(c: Context<AppEnv>): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function deviceNameFromUserAgent(ua: string | undefined): string {
  const s = ua ?? '';
  if (/iPhone/i.test(s)) return 'iPhone Browser';
  if (/iPad/i.test(s)) return 'iPad Browser';
  if (/Android/i.test(s)) return 'Android Browser';
  if (/Macintosh/i.test(s)) return 'Mac Browser';
  return 'PC Browser';
}

export async function createWebDevice(db: Db, userId: string, ua: string | undefined, now: Date) {
  const id = newId();
  await db.insert(devices).values({
    id,
    userId,
    name: deviceNameFromUserAgent(ua),
    platform: 'web',
    lastSeenAt: now.toISOString(),
  });
  return id;
}
