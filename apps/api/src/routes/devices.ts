// SPDX-License-Identifier: AGPL-3.0-or-later
import { deviceUpdate, pairRedeemInput } from '@ult/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Db } from '../db';
import { devices, pairingCodes, rateLimits } from '../db/schema';
import { type AppEnv, testRoutesEnabled } from '../env';
import { generatePairingCode, generateToken, newId, sha256Hex } from '../lib/crypto';
import { deviceDto } from '../lib/dto';
import { requireAuth, requireCookieAuth } from '../lib/middleware';
import { parseJson } from '../lib/validate';

export const PAIRING_TTL_MS = 5 * 60_000;
export const PAIR_RATE_LIMIT = 10;
const PAIR_RATE_WINDOW_MS = 15 * 60_000;

/** Fixed-window rate limit stored in D1. Returns false when the limit is exceeded. */
export async function hitRateLimit(db: Db, key: string, limit: number, now: Date): Promise<boolean> {
  const row = await db.query.rateLimits.findFirst({ where: eq(rateLimits.key, key) });
  if (!row || now.getTime() - Date.parse(row.windowStart) > PAIR_RATE_WINDOW_MS) {
    await db
      .insert(rateLimits)
      .values({ key, windowStart: now.toISOString(), count: 1 })
      .onConflictDoUpdate({ target: rateLimits.key, set: { windowStart: now.toISOString(), count: 1 } });
    return true;
  }
  if (row.count >= limit) return false;
  await db
    .update(rateLimits)
    .set({ count: row.count + 1 })
    .where(eq(rateLimits.key, key));
  return true;
}

/** Public: the Android app redeems a pairing code for a device token. */
export const pairRoutes = new Hono<AppEnv>().post('/', async (c) => {
  const db = c.get('db');
  const now = c.get('clock').now();
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  // e2e runs share one IP; in test mode a client id keeps their rate-limit buckets apart
  const testClient = testRoutesEnabled(c.env) ? (c.req.header('x-test-client') ?? '') : '';
  if (!(await hitRateLimit(db, `pair:${ip}:${testClient}`, PAIR_RATE_LIMIT, now))) {
    return c.json({ error: 'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.' }, 429);
  }
  const input = await parseJson(c, pairRedeemInput);
  const hash = await sha256Hex(input.code);
  const code = await db.query.pairingCodes.findFirst({
    where: and(eq(pairingCodes.codeHash, hash), isNull(pairingCodes.usedAt)),
  });
  if (!code || Date.parse(code.expiresAt) <= now.getTime()) {
    return c.json({ error: 'Code ungültig oder abgelaufen' }, 400);
  }
  // mark as used first (single use even with concurrent requests)
  const used = await db
    .update(pairingCodes)
    .set({ usedAt: now.toISOString() })
    .where(and(eq(pairingCodes.id, code.id), isNull(pairingCodes.usedAt)))
    .returning({ id: pairingCodes.id });
  if (used.length === 0) return c.json({ error: 'Code ungültig oder abgelaufen' }, 400);

  const token = generateToken();
  const deviceId = newId();
  const hasAlarmDevice = await db.query.devices.findFirst({
    where: and(eq(devices.userId, code.userId), eq(devices.isAlarmDevice, true)),
  });
  await db.insert(devices).values({
    id: deviceId,
    userId: code.userId,
    name: input.name,
    platform: 'android',
    tokenHash: await sha256Hex(token),
    lastSeenAt: now.toISOString(),
    appVersion: input.appVersion ?? null,
    // first paired phone becomes the alarm device automatically
    isAlarmDevice: !hasAlarmDevice,
  });
  return c.json({ token, deviceId });
});

export const deviceRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', async (c) => {
    const rows = await c
      .get('db')
      .select()
      .from(devices)
      .where(eq(devices.userId, c.get('userId')))
      .orderBy(devices.createdAt);
    return c.json(rows.map((r) => deviceDto(r, c.get('deviceId'))));
  })
  .post('/pairing-code', requireCookieAuth, async (c) => {
    const db = c.get('db');
    const now = c.get('clock').now();
    const code = generatePairingCode();
    const expiresAt = new Date(now.getTime() + PAIRING_TTL_MS).toISOString();
    await db.insert(pairingCodes).values({
      id: newId(),
      userId: c.get('userId'),
      codeHash: await sha256Hex(code),
      expiresAt,
    });
    return c.json({ code, expiresAt });
  })
  .patch('/:id', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const input = await parseJson(c, deviceUpdate);
    const device = await db.query.devices.findFirst({
      where: and(eq(devices.id, c.req.param('id')), eq(devices.userId, userId)),
    });
    if (!device) throw new HTTPException(404, { message: 'Gerät nicht gefunden' });
    if (input.isAlarmDevice && device.platform !== 'android') {
      throw new HTTPException(400, { message: 'Nur Android-Geräte können Erinnerungsgerät sein' });
    }
    if (input.isAlarmDevice === true) {
      await db.batch([
        db.update(devices).set({ isAlarmDevice: false }).where(eq(devices.userId, userId)),
        db
          .update(devices)
          .set({ isAlarmDevice: true, ...(input.name ? { name: input.name } : {}) })
          .where(and(eq(devices.id, device.id), eq(devices.userId, userId))),
      ]);
    } else {
      await db
        .update(devices)
        .set({
          ...(input.name ? { name: input.name } : {}),
          ...(input.isAlarmDevice === false ? { isAlarmDevice: false } : {}),
        })
        .where(and(eq(devices.id, device.id), eq(devices.userId, userId)));
    }
    const updated = await db.query.devices.findFirst({ where: eq(devices.id, device.id) });
    return c.json(deviceDto(updated!, c.get('deviceId')));
  })
  .delete('/:id', async (c) => {
    const res = await c
      .get('db')
      .delete(devices)
      .where(and(eq(devices.id, c.req.param('id')), eq(devices.userId, c.get('userId'))))
      .returning({ id: devices.id });
    if (res.length === 0) throw new HTTPException(404, { message: 'Gerät nicht gefunden' });
    return c.json({ ok: true });
  });
