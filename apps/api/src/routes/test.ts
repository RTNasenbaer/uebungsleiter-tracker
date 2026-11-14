// SPDX-License-Identifier: AGPL-3.0-or-later
/** Test-only routes. Mounted only when ENABLE_TEST_ROUTES=true and ENVIRONMENT !== 'production'. */
import { z } from 'zod';
import { Hono } from 'hono';
import { devices } from '../db/schema';
import type { AppEnv } from '../env';
import { runCron } from '../cron';
import { createAuthSession, createWebDevice, setSessionCookie } from '../lib/auth';
import { generateToken, newId, sha256Hex } from '../lib/crypto';
import { parseJson } from '../lib/validate';
import { upsertGithubUser } from './auth';

const loginInput = z.object({
  githubId: z.string().min(1).max(40).default('1'),
  name: z.string().max(100).default('Test Trainer'),
  /** additionally create an Android device and return its bearer token */
  android: z.boolean().default(false),
  alarmDevice: z.boolean().default(false),
});

export const testRoutes = new Hono<AppEnv>()
  .post('/login', async (c) => {
    const db = c.get('db');
    const now = c.get('clock').now();
    const input = await parseJson(c, loginInput);
    const userId = await upsertGithubUser(db, { id: input.githubId, name: input.name, avatarUrl: null });
    const webDeviceId = await createWebDevice(db, userId, c.req.header('user-agent'), now);
    const { token, expiresAt } = await createAuthSession(db, userId, webDeviceId, now);
    setSessionCookie(c, token, expiresAt);
    let deviceToken: string | null = null;
    let deviceId: string | null = null;
    if (input.android) {
      deviceToken = generateToken();
      deviceId = newId();
      await db.insert(devices).values({
        id: deviceId,
        userId,
        name: 'Test-Handy',
        platform: 'android',
        tokenHash: await sha256Hex(deviceToken),
        isAlarmDevice: input.alarmDevice,
        lastSeenAt: now.toISOString(),
      });
    }
    return c.json({ userId, sessionToken: token, deviceToken, deviceId });
  })
  .post('/cron', async (c) => c.json(await runCron(c.get('db'), c.get('clock'))));
