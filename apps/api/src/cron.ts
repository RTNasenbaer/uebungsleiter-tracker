// SPDX-License-Identifier: AGPL-3.0-or-later
/** Hourly cron (§4.6): materialize, planned→pending, auto-confirm, cleanup. */
import { type Clock, alarmTriggerAt, todayIn } from '@ult/shared';
import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm';
import type { Db } from './db';
import { authSessions, pairingCodes, rateLimits, series, sessions, settings } from './db/schema';
import { defaultWindow, markPastAsPending, materialize } from './lib/materialize';

export interface CronResult {
  users: number;
  created: number;
  autoConfirmed: number;
}

export async function runCron(db: Db, clock: Clock): Promise<CronResult> {
  const now = clock.now();
  const nowIso = now.toISOString();
  const today = todayIn(clock);
  const result: CronResult = { users: 0, created: 0, autoConfirmed: 0 };

  const userRows = await db
    .selectDistinct({ userId: series.userId })
    .from(series)
    .where(eq(series.active, true));
  for (const { userId } of userRows) {
    result.users++;
    result.created += await materialize(db, userId, defaultWindow(today), now);
  }
  await markPastAsPending(db, null, now);

  // "Nur Ausnahmen melden": confirm pending sessions automatically after N hours
  const autoUsers = await db
    .select({ userId: settings.userId, hours: settings.autoConfirmAfterHours })
    .from(settings)
    .where(isNotNull(settings.autoConfirmAfterHours));
  for (const u of autoUsers) {
    const pending = await db
      .select({ id: sessions.id, date: sessions.date, endTime: sessions.endTime })
      .from(sessions)
      .where(and(eq(sessions.userId, u.userId), eq(sessions.status, 'pending')));
    const due = pending
      .filter((p) => alarmTriggerAt(p.date, p.endTime, (u.hours ?? 0) * 60, null).getTime() <= now.getTime())
      .map((p) => p.id);
    for (let i = 0; i < due.length; i += 90) {
      await db
        .update(sessions)
        .set({ status: 'held', answeredAt: nowIso, answeredVia: 'auto', updatedAt: nowIso })
        .where(and(eq(sessions.userId, u.userId), inArray(sessions.id, due.slice(i, i + 90))));
    }
    result.autoConfirmed += due.length;
  }

  await db.batch([
    db.delete(pairingCodes).where(lt(pairingCodes.expiresAt, nowIso)),
    db.delete(authSessions).where(lt(authSessions.expiresAt, nowIso)),
    db
      .delete(rateLimits)
      .where(lt(rateLimits.windowStart, new Date(now.getTime() - 86_400_000).toISOString())),
  ]);
  return result;
}
