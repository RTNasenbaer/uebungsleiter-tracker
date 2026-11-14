// SPDX-License-Identifier: AGPL-3.0-or-later
import type { QuietHours } from '@ult/shared';
import { eq } from 'drizzle-orm';
import type { Db } from '../db';
import { settings } from '../db/schema';
import { newId } from './crypto';

export async function getSettingsRow(db: Db, userId: string) {
  const row = await db.query.settings.findFirst({ where: eq(settings.userId, userId) });
  if (row) return row;
  await db.insert(settings).values({ id: newId(), userId }).onConflictDoNothing();
  return (await db.query.settings.findFirst({ where: eq(settings.userId, userId) }))!;
}

export function quietHoursOf(row: { quietStart: string | null; quietEnd: string | null }): QuietHours | null {
  return row.quietStart && row.quietEnd ? { start: row.quietStart, end: row.quietEnd } : null;
}
