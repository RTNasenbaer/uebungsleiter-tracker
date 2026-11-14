// SPDX-License-Identifier: AGPL-3.0-or-later
import type { MeDto } from '@ult/shared';
import { and, count, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { devices, sessions, users } from '../db/schema';
import type { AppEnv } from '../env';
import { deviceDto } from '../lib/dto';
import { markPastAsPending } from '../lib/materialize';
import { requireAuth } from '../lib/middleware';

export const meRoutes = new Hono<AppEnv>().use(requireAuth).get('/', async (c) => {
  const db = c.get('db');
  const userId = c.get('userId');
  await markPastAsPending(db, userId, c.get('clock').now());
  const deviceId = c.get('deviceId');
  const [user, device, open] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    deviceId ? db.query.devices.findFirst({ where: eq(devices.id, deviceId) }) : Promise.resolve(undefined),
    db
      .select({ n: count() })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.status, 'pending'))),
  ]);
  const body: MeDto = {
    user: { id: userId, name: user?.name ?? '', avatarUrl: user?.avatarUrl ?? null },
    device: device ? deviceDto(device, deviceId) : null,
    openCount: open[0]?.n ?? 0,
  };
  return c.json(body);
});
