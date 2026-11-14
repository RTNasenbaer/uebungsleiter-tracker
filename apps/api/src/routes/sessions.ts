// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  type AnswerStatus,
  type AnswerVia,
  type ImportSession,
  addDays,
  answerInput,
  bulkAnswerInput,
  buildAlarmList,
  importInput,
  isDue,
  rangeQuery,
  sessionPatch,
  singleKey,
  singleSessionInput,
  snoozeInput,
  toAlarmEntry,
  todayIn,
} from '@ult/shared';
import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Db } from '../db';
import { devices, series, sessions } from '../db/schema';
import type { AppEnv } from '../env';
import { newId } from '../lib/crypto';
import { sessionDto } from '../lib/dto';
import { defaultWindow, markPastAsPending, materialize } from '../lib/materialize';
import { requireAuth } from '../lib/middleware';
import { getSettingsRow, quietHoursOf } from '../lib/settings';
import { parseJson, parseValue } from '../lib/validate';

const ANSWERED = ['held', 'not_held', 'cancelled'] as const;
/** in-app question only for sessions that became due recently; older ones live in the "Offen" list */
const IN_APP_MAX_AGE_HOURS = 48;

async function colorMap(db: Db, userId: string) {
  const rows = await db
    .select({ id: series.id, color: series.color })
    .from(series)
    .where(eq(series.userId, userId));
  return new Map(rows.map((r) => [r.id, r.color]));
}

async function listDtos(db: Db, userId: string, rows: (typeof sessions.$inferSelect)[]) {
  const colors = await colorMap(db, userId);
  return rows.map((r) => sessionDto(r, r.seriesId ? (colors.get(r.seriesId) ?? null) : null));
}

/** Makes sure the session for a series occurrence key exists (e.g. answer from an alarm far in the future). */
async function ensureSession(db: Db, userId: string, key: string, now: Date) {
  const found = await db.query.sessions.findFirst({
    where: and(eq(sessions.userId, userId), eq(sessions.occurrenceKey, key)),
  });
  if (found || key.startsWith('single:')) return found ?? null;
  const m = /^(.+):(\d{4}-\d{2}-\d{2})$/.exec(key);
  if (!m) return null;
  const s = await db.query.series.findFirst({ where: and(eq(series.id, m[1]!), eq(series.userId, userId)) });
  if (!s) return null;
  await materialize(db, userId, { from: m[2]!, to: m[2]! }, now, [s]);
  return (
    (await db.query.sessions.findFirst({
      where: and(eq(sessions.userId, userId), eq(sessions.occurrenceKey, key)),
    })) ?? null
  );
}

export interface AnswerArgs {
  key: string;
  status: AnswerStatus;
  answeredAt: string;
  note?: string | null | undefined;
  via: AnswerVia;
  deviceId: string | null;
}

/**
 * Idempotent answer. Repeating the same answer is a no-op; a later answer (by answered_at) wins,
 * so an old queued alarm answer never overwrites a newer edit.
 */
export async function applyAnswer(db: Db, userId: string, a: AnswerArgs, now: Date) {
  const s = await ensureSession(db, userId, a.key, now);
  if (!s) return null;
  if (s.answeredAt && s.answeredAt > a.answeredAt) return s;
  const [updated] = await db
    .update(sessions)
    .set({
      status: a.status,
      answeredAt: a.answeredAt,
      answeredVia: a.via,
      answeredDeviceId: a.deviceId,
      snoozedUntil: null,
      ...(a.note !== undefined ? { note: a.note } : {}),
      updatedAt: now.toISOString(),
    })
    .where(and(eq(sessions.id, s.id), eq(sessions.userId, userId)))
    .returning();
  return updated!;
}

function viaFor(authKind: 'cookie' | 'bearer'): AnswerVia {
  return authKind === 'bearer' ? 'app' : 'web';
}

export const sessionRoutes = new Hono<AppEnv>()
  .use(requireAuth)
  .get('/', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const range = parseValue(rangeQuery, c.req.query());
    await materialize(db, userId, range, now);
    await markPastAsPending(db, userId, now);
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gte(sessions.date, range.from), lte(sessions.date, range.to)))
      .orderBy(asc(sessions.date), asc(sessions.startTime));
    return c.json(await listDtos(db, userId, rows));
  })
  .get('/open', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    await materialize(db, userId, defaultWindow(todayIn(c.get('clock'))), now);
    await markPastAsPending(db, userId, now);
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), eq(sessions.status, 'pending')))
      .orderBy(desc(sessions.date), desc(sessions.startTime));
    return c.json(await listDtos(db, userId, rows));
  })
  /** In-app question (§4.4): unanswered sessions due now (2 min before the phone rings), not snoozed. */
  .get('/due', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const today = todayIn(c.get('clock'));
    await materialize(db, userId, { from: addDays(today, -2), to: today }, now);
    const rows = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          inArray(sessions.status, ['planned', 'pending']),
          gte(sessions.date, addDays(today, -2)),
          lte(sessions.date, today),
        ),
      )
      .orderBy(desc(sessions.date), desc(sessions.endTime));
    const minTime = now.getTime() - IN_APP_MAX_AGE_HOURS * 3_600_000;
    const due = rows.filter(
      (r) =>
        isDue(r, now) &&
        (!r.snoozedUntil || Date.parse(r.snoozedUntil) <= now.getTime()) &&
        Date.parse(`${r.date}T23:59:59Z`) >= minTime,
    );
    return c.json(await listDtos(db, userId, due));
  })
  /** Used by the alarm receiver for the ≤3 s online check. */
  .get('/status', async (c) => {
    const key = c.req.query('key');
    if (!key) throw new HTTPException(400, { message: 'key fehlt' });
    const s = await c.get('db').query.sessions.findFirst({
      where: and(eq(sessions.userId, c.get('userId')), eq(sessions.occurrenceKey, key)),
    });
    return c.json({
      occurrenceKey: key,
      status: s?.status ?? 'unknown',
      answered: !!s && (ANSWERED as readonly string[]).includes(s.status),
      snoozedUntil: s?.snoozedUntil ?? null,
    });
  })
  /** Alarm list for the native plugin: next N days, only if this device is the alarm device. */
  .get('/alarms', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const today = todayIn(c.get('clock'));
    const days = Math.min(31, Math.max(1, Number(c.req.query('days') ?? 14)));
    const deviceId = c.get('deviceId');
    const device = deviceId ? await db.query.devices.findFirst({ where: eq(devices.id, deviceId) }) : null;
    const cfg = await getSettingsRow(db, userId);
    const settings = {
      ringSeconds: cfg.alarmRingSeconds,
      vibrate: cfg.alarmVibrate,
      sound: cfg.alarmSound,
      snoozeMinutes: cfg.snoozeMinutes,
      quietStart: cfg.quietStart,
      quietEnd: cfg.quietEnd,
      reportDeadline: cfg.reportDeadline,
    };
    if (!device?.isAlarmDevice) return c.json({ isAlarmDevice: false, alarms: [], settings });
    await materialize(db, userId, { from: addDays(today, -1), to: addDays(today, days) }, now);
    const rows = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          inArray(sessions.status, ['planned', 'pending']),
          gte(sessions.date, addDays(today, -1)),
          lte(sessions.date, addDays(today, days)),
        ),
      );
    const quiet = quietHoursOf(cfg);
    const alarms = buildAlarmList(rows, now, quiet);
    // snoozed sessions ring at their snooze time instead
    for (const r of rows) {
      if (!r.snoozedUntil || Date.parse(r.snoozedUntil) <= now.getTime()) continue;
      const existing = alarms.find((a) => a.key === r.occurrenceKey);
      const triggerAt = Date.parse(r.snoozedUntil);
      if (existing) existing.triggerAt = Math.max(existing.triggerAt, triggerAt);
      else alarms.push(toAlarmEntry(r, triggerAt));
    }
    alarms.sort((a, b) => a.triggerAt - b.triggerAt);
    return c.json({ isAlarmDevice: true, alarms, settings });
  })
  .post('/', async (c) => {
    const db = c.get('db');
    const input = await parseJson(c, singleSessionInput);
    const now = c.get('clock').now();
    const id = newId();
    const ended = Date.parse(`${input.date}T00:00:00Z`) < Date.parse(`${todayIn(c.get('clock'))}T00:00:00Z`);
    const [row] = await db
      .insert(sessions)
      .values({
        ...input,
        id,
        userId: c.get('userId'),
        occurrenceKey: singleKey(id),
        status: input.status ?? (ended ? 'pending' : 'planned'),
        ...(input.status && (ANSWERED as readonly string[]).includes(input.status)
          ? {
              answeredAt: now.toISOString(),
              answeredVia: viaFor(c.get('authKind')),
              answeredDeviceId: c.get('deviceId'),
            }
          : {}),
      })
      .returning();
    await markPastAsPending(db, c.get('userId'), now);
    return c.json(sessionDto(row!), 201);
  })
  .patch('/:id', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const patch = await parseJson(c, sessionPatch);
    const s = await db.query.sessions.findFirst({
      where: and(eq(sessions.id, c.req.param('id')), eq(sessions.userId, userId)),
    });
    if (!s) throw new HTTPException(404, { message: 'Termin nicht gefunden' });
    const { status, note, ...fields } = patch;
    const fieldsChanged = Object.entries(fields).some(([k, v]) => s[k as keyof typeof s] !== v);
    const statusChanged = status !== undefined && status !== s.status;
    const answered = statusChanged && (ANSWERED as readonly string[]).includes(status);
    const [row] = await db
      .update(sessions)
      .set({
        ...fields,
        ...(note !== undefined ? { note } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(fieldsChanged && s.seriesId ? { isOverride: true } : {}),
        ...(answered
          ? {
              answeredAt: now.toISOString(),
              answeredVia: viaFor(c.get('authKind')),
              answeredDeviceId: c.get('deviceId'),
              snoozedUntil: null,
            }
          : {}),
        ...(statusChanged && !answered
          ? { answeredAt: null, answeredVia: null, answeredDeviceId: null }
          : {}),
        updatedAt: now.toISOString(),
      })
      .where(and(eq(sessions.id, s.id), eq(sessions.userId, userId)))
      .returning();
    if (statusChanged && status === 'planned') await markPastAsPending(db, userId, now);
    const fresh = await db.query.sessions.findFirst({ where: eq(sessions.id, row!.id) });
    return c.json(sessionDto(fresh!));
  })
  .delete('/:id', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const s = await db.query.sessions.findFirst({
      where: and(eq(sessions.id, c.req.param('id')), eq(sessions.userId, userId)),
    });
    if (!s) throw new HTTPException(404, { message: 'Termin nicht gefunden' });
    if (s.seriesId) {
      // a deleted series occurrence would be re-created by materialization → mark as cancelled instead
      await db
        .update(sessions)
        .set({ status: 'cancelled', isOverride: true, updatedAt: now.toISOString() })
        .where(and(eq(sessions.id, s.id), eq(sessions.userId, userId)));
    } else {
      await db.delete(sessions).where(and(eq(sessions.id, s.id), eq(sessions.userId, userId)));
    }
    return c.json({ ok: true });
  })
  .post('/answer', async (c) => {
    const db = c.get('db');
    const now = c.get('clock').now();
    const input = await parseJson(c, answerInput);
    const via: AnswerVia = input.via ?? viaFor(c.get('authKind'));
    const row = await applyAnswer(
      db,
      c.get('userId'),
      {
        key: input.occurrence_key,
        status: input.status,
        answeredAt: input.answered_at ? new Date(input.answered_at).toISOString() : now.toISOString(),
        note: input.note,
        via,
        deviceId: c.get('deviceId'),
      },
      now,
    );
    if (!row) throw new HTTPException(404, { message: 'Termin nicht gefunden' });
    return c.json(sessionDto(row));
  })
  .post('/bulk', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const input = await parseJson(c, bulkAnswerInput);
    let updated = 0;
    for (let i = 0; i < input.keys.length; i += 90) {
      const res = await db
        .update(sessions)
        .set({
          status: input.status,
          answeredAt: now.toISOString(),
          answeredVia: 'bulk',
          answeredDeviceId: c.get('deviceId'),
          snoozedUntil: null,
          updatedAt: now.toISOString(),
        })
        .where(and(eq(sessions.userId, userId), inArray(sessions.occurrenceKey, input.keys.slice(i, i + 90))))
        .returning({ id: sessions.id });
      updated += res.length;
    }
    return c.json({ updated });
  })
  .post('/snooze', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const input = await parseJson(c, snoozeInput);
    const until = new Date(now.getTime() + input.minutes * 60_000).toISOString();
    const res = await db
      .update(sessions)
      .set({ snoozedUntil: until, updatedAt: now.toISOString() })
      .where(and(eq(sessions.userId, userId), eq(sessions.occurrenceKey, input.occurrence_key)))
      .returning({ id: sessions.id });
    if (res.length === 0) throw new HTTPException(404, { message: 'Termin nicht gefunden' });
    return c.json({ snoozedUntil: until });
  })
  .post('/import', async (c) => {
    const db = c.get('db');
    const userId = c.get('userId');
    const now = c.get('clock').now();
    const input = await parseJson(c, importInput);
    const result = await importSessions(db, userId, input.sessions, input.onDuplicate, now);
    return c.json(result);
  });

export async function importSessions(
  db: Db,
  userId: string,
  items: ImportSession[],
  onDuplicate: 'skip' | 'overwrite',
  now: Date,
) {
  const result = { created: 0, updated: 0, skipped: 0 };
  if (items.length === 0) return result;
  const dates = items.map((i) => i.date).sort();
  const existing = await db
    .select({
      id: sessions.id,
      occurrenceKey: sessions.occurrenceKey,
      date: sessions.date,
      startTime: sessions.startTime,
    })
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), gte(sessions.date, dates[0]!), lte(sessions.date, dates.at(-1)!)),
    );
  const byKey = new Map(existing.map((e) => [e.occurrenceKey, e]));
  const bySlot = new Map(existing.map((e) => [`${e.date} ${e.startTime}`, e]));
  const ops = [];
  for (const item of items) {
    const hit =
      (item.occurrenceKey && byKey.get(item.occurrenceKey)) || bySlot.get(`${item.date} ${item.startTime}`);
    const { occurrenceKey: _k, ...fields } = item;
    const answered = (ANSWERED as readonly string[]).includes(item.status);
    if (hit) {
      if (onDuplicate === 'skip') {
        result.skipped++;
        continue;
      }
      ops.push(
        db
          .update(sessions)
          .set({ ...fields, isOverride: true, updatedAt: now.toISOString() })
          .where(and(eq(sessions.id, hit.id), eq(sessions.userId, userId))),
      );
      result.updated++;
    } else {
      const id = newId();
      const key = item.occurrenceKey ?? singleKey(id);
      // keep series keys only if the series still exists for this user, otherwise import as single
      const fromSeries = !key.startsWith('single:');
      ops.push(
        db.insert(sessions).values({
          ...fields,
          id,
          userId,
          occurrenceKey: key,
          seriesId: null,
          isOverride: fromSeries,
          ...(answered ? { answeredAt: now.toISOString(), answeredVia: 'web' as const } : {}),
        }),
      );
      byKey.set(key, { id, occurrenceKey: key, date: item.date, startTime: item.startTime });
      bySlot.set(`${item.date} ${item.startTime}`, {
        id,
        occurrenceKey: key,
        date: item.date,
        startTime: item.startTime,
      });
      result.created++;
    }
  }
  for (let i = 0; i < ops.length; i += 50) {
    const [first, ...rest] = ops.slice(i, i + 50);
    await db.batch([first!, ...rest]);
  }
  return result;
}
