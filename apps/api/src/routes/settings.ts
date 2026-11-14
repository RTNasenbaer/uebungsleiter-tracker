// SPDX-License-Identifier: AGPL-3.0-or-later
import { settingsInput } from '@ult/shared';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { settings } from '../db/schema';
import type { AppEnv } from '../env';
import { settingsDto } from '../lib/dto';
import { requireAuth } from '../lib/middleware';
import { getSettingsRow } from '../lib/settings';
import { parseJson } from '../lib/validate';

export const settingsRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', async (c) => c.json(settingsDto(await getSettingsRow(c.get('db'), c.get('userId')))))
  .put('/', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const input = await parseJson(c, settingsInput);
    await getSettingsRow(db, userId);
    const [row] = await db
      .update(settings)
      .set({ ...input, updatedAt: c.get('clock').now().toISOString() })
      .where(eq(settings.userId, userId))
      .returning();
    return c.json(settingsDto(row!));
  });
