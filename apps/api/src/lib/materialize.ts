// SPDX-License-Identifier: AGPL-3.0-or-later
/** Lazy materialization of sessions from series (idempotent via occurrence_key). */
import {
  type DateRange,
  type ExceptionDef,
  type IsoDate,
  type SeriesDef,
  addDays,
  generateOccurrences,
  toLocal,
} from '@ult/shared';
import { and, eq, gte, inArray, lt, lte, or } from 'drizzle-orm';
import type { Db } from '../db';
import { exceptions, series, sessions } from '../db/schema';
import { newId } from './crypto';

type SeriesRow = typeof series.$inferSelect;
type ExceptionRow = typeof exceptions.$inferSelect;

export const MAX_RANGE_DAYS = 400;
/** sessions has ~23 columns, D1 allows 100 bound parameters per statement */
const INSERT_CHUNK = 4;

export function toSeriesDef(r: SeriesRow): SeriesDef {
  return {
    id: r.id,
    title: r.title,
    team: r.team,
    location: r.location,
    weekdays: r.weekdays,
    startTime: r.startTime,
    endTime: r.endTime,
    intervalWeeks: r.intervalWeeks,
    startsOn: r.startsOn,
    endsOn: r.endsOn,
    units: r.units,
    payCents: r.payCents,
    alarmOffsetMin: r.alarmOffsetMin,
    active: r.active,
  };
}

export function toExceptionDef(r: ExceptionRow): ExceptionDef {
  return { fromDate: r.fromDate, toDate: r.toDate, seriesId: r.seriesId };
}

export function clampRange(range: DateRange): DateRange {
  const maxTo = addDays(range.from, MAX_RANGE_DAYS);
  return { from: range.from, to: range.to > maxTo ? maxTo : range.to };
}

export async function loadExceptionDefs(db: Db, userId: string, range: DateRange) {
  const rows = await db
    .select()
    .from(exceptions)
    .where(
      and(
        eq(exceptions.userId, userId),
        lte(exceptions.fromDate, range.to),
        gte(exceptions.toDate, range.from),
      ),
    );
  return rows.map(toExceptionDef);
}

/** Creates missing sessions for all active series of the user in the range; returns number created. */
export async function materialize(
  db: Db,
  userId: string,
  rangeIn: DateRange,
  now: Date,
  onlySeries?: SeriesRow[],
): Promise<number> {
  const range = clampRange(rangeIn);
  const seriesRows =
    onlySeries ??
    (await db
      .select()
      .from(series)
      .where(and(eq(series.userId, userId), eq(series.active, true))));
  if (seriesRows.length === 0) return 0;
  const exDefs = await loadExceptionDefs(db, userId, range);
  const occurrences = seriesRows.flatMap((s) => generateOccurrences(toSeriesDef(s), range, exDefs));
  if (occurrences.length === 0) return 0;

  const existing = await db
    .select({ key: sessions.occurrenceKey })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gte(sessions.date, range.from), lte(sessions.date, range.to)));
  const existingKeys = new Set(existing.map((e) => e.key));
  const offsetBySeries = new Map(seriesRows.map((s) => [s.id, s.alarmOffsetMin]));

  const rows = occurrences
    .filter((o) => !existingKeys.has(o.occurrenceKey))
    .map((o) => ({
      id: newId(),
      userId,
      occurrenceKey: o.occurrenceKey,
      seriesId: o.seriesId,
      date: o.date,
      startTime: o.startTime,
      endTime: o.endTime,
      title: o.title,
      team: o.team,
      location: o.location,
      units: o.units,
      payCents: o.payCents,
      status: (o.endsAt.getTime() <= now.getTime() ? 'pending' : 'planned') as 'pending' | 'planned',
      alarmOffsetMin: offsetBySeries.get(o.seriesId) ?? 10,
    }));
  if (rows.length === 0) return 0;

  const statements = [];
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    statements.push(
      db
        .insert(sessions)
        .values(rows.slice(i, i + INSERT_CHUNK))
        .onConflictDoNothing({ target: [sessions.userId, sessions.occurrenceKey] }),
    );
  }
  const [first, ...rest] = statements;
  await db.batch([first!, ...rest]);
  return rows.length;
}

/** planned → pending once the session has ended. */
export async function markPastAsPending(db: Db, userId: string | null, now: Date): Promise<void> {
  const local = toLocal(now);
  const userFilter = userId ? eq(sessions.userId, userId) : undefined;
  await db
    .update(sessions)
    .set({ status: 'pending', updatedAt: now.toISOString() })
    .where(
      and(
        userFilter,
        eq(sessions.status, 'planned'),
        or(
          lt(sessions.date, local.date),
          and(eq(sessions.date, local.date), lte(sessions.endTime, local.time)),
        ),
      ),
    );
}

/** Removes unanswered, non-overridden sessions covered by an exception (holidays added later). */
export async function applyException(db: Db, userId: string, ex: ExceptionDef) {
  const conditions = [
    eq(sessions.userId, userId),
    gte(sessions.date, ex.fromDate),
    lte(sessions.date, ex.toDate),
    inArray(sessions.status, ['planned', 'pending']),
    eq(sessions.isOverride, false),
  ];
  if (ex.seriesId) conditions.push(eq(sessions.seriesId, ex.seriesId));
  await db.delete(sessions).where(and(...conditions));
}

export function defaultWindow(today: IsoDate): DateRange {
  return { from: addDays(today, -7), to: addDays(today, 28) };
}
