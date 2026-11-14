// SPDX-License-Identifier: AGPL-3.0-or-later
/** Generates concrete occurrences from recurring series (pure, no I/O). */
import { type HhMm, type IsoDate, addDays, diffDays, localToInstant, mondayOf, weekdayOf } from './time';
import { hasWeekday } from './weekdays';

export interface SeriesDef {
  id: string;
  title: string;
  team: string;
  location: string;
  weekdays: number;
  startTime: HhMm;
  endTime: HhMm;
  intervalWeeks: number;
  startsOn: IsoDate;
  endsOn: IsoDate | null;
  units: number;
  payCents: number;
  alarmOffsetMin: number;
  active: boolean;
}

export interface ExceptionDef {
  fromDate: IsoDate;
  toDate: IsoDate;
  seriesId: string | null;
}

export interface Occurrence {
  occurrenceKey: string;
  seriesId: string;
  date: IsoDate;
  startTime: HhMm;
  endTime: HhMm;
  title: string;
  team: string;
  location: string;
  units: number;
  payCents: number;
  startsAt: Date;
  endsAt: Date;
}

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

export function occurrenceKey(seriesId: string, date: IsoDate): string {
  return `${seriesId}:${date}`;
}

export function singleKey(uuid: string): string {
  return `single:${uuid}`;
}

export function isExcluded(
  date: IsoDate,
  seriesId: string | null,
  exceptions: readonly ExceptionDef[],
): boolean {
  return exceptions.some(
    (e) => date >= e.fromDate && date <= e.toDate && (e.seriesId === null || e.seriesId === seriesId),
  );
}

export function matchesSeriesDate(series: SeriesDef, date: IsoDate): boolean {
  if (date < series.startsOn) return false;
  if (series.endsOn && date > series.endsOn) return false;
  if (!hasWeekday(series.weekdays, weekdayOf(date))) return false;
  const weeks = diffDays(mondayOf(series.startsOn), mondayOf(date)) / 7;
  return weeks % Math.max(1, series.intervalWeeks) === 0;
}

export function generateOccurrences(
  series: SeriesDef,
  range: DateRange,
  exceptions: readonly ExceptionDef[],
): Occurrence[] {
  if (!series.active || series.weekdays === 0) return [];
  const from = range.from > series.startsOn ? range.from : series.startsOn;
  const to = series.endsOn && series.endsOn < range.to ? series.endsOn : range.to;
  const out: Occurrence[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (!matchesSeriesDate(series, date)) continue;
    if (isExcluded(date, series.id, exceptions)) continue;
    out.push(occurrenceFromSeries(series, date));
  }
  return out;
}

export function occurrenceFromSeries(series: SeriesDef, date: IsoDate): Occurrence {
  const startsAt = localToInstant(date, series.startTime);
  let endsAt = localToInstant(date, series.endTime);
  if (endsAt <= startsAt) endsAt = localToInstant(addDays(date, 1), series.endTime);
  return {
    occurrenceKey: occurrenceKey(series.id, date),
    seriesId: series.id,
    date,
    startTime: series.startTime,
    endTime: series.endTime,
    title: series.title,
    team: series.team,
    location: series.location,
    units: series.units,
    payCents: series.payCents,
    startsAt,
    endsAt,
  };
}

/** Number of occurrences before `today` (shown as "X vergangene Termine werden zum Nachtragen angelegt"). */
export function countPastOccurrences(
  series: SeriesDef,
  today: IsoDate,
  exceptions: readonly ExceptionDef[],
): number {
  if (series.startsOn >= today) return 0;
  return generateOccurrences(series, { from: series.startsOn, to: addDays(today, -1) }, exceptions).length;
}

/** "Dieser und alle folgenden": end the series the day before and start a new one at `splitDate`. */
export function splitSeries(
  series: SeriesDef,
  splitDate: IsoDate,
  newId: string,
): { ended: SeriesDef; next: SeriesDef } {
  return {
    ended: { ...series, endsOn: addDays(splitDate, -1) },
    next: { ...series, id: newId, startsOn: splitDate },
  };
}

export interface ExistingSessionRef {
  occurrenceKey: string;
  date: IsoDate;
  status: string;
  isOverride: boolean;
}

export interface SeriesUpdatePlan {
  /** future planned sessions that no longer match → delete */
  deleteKeys: string[];
  /** future planned sessions that still match → refresh snapshot fields */
  updateKeys: string[];
  /** everything else stays untouched */
  keep: string[];
}

/**
 * Changing a series only affects future (date >= today), non-overridden, unanswered (`planned`) sessions.
 * Missing new occurrences are created later by lazy materialization.
 */
export function planSeriesUpdate(
  updated: SeriesDef,
  sessions: readonly ExistingSessionRef[],
  today: IsoDate,
  exceptions: readonly ExceptionDef[],
): SeriesUpdatePlan {
  const plan: SeriesUpdatePlan = { deleteKeys: [], updateKeys: [], keep: [] };
  for (const s of sessions) {
    const mutable = s.date >= today && !s.isOverride && s.status === 'planned';
    if (!mutable) {
      plan.keep.push(s.occurrenceKey);
      continue;
    }
    const stillValid =
      updated.active &&
      s.occurrenceKey === occurrenceKey(updated.id, s.date) &&
      matchesSeriesDate(updated, s.date) &&
      !isExcluded(s.date, updated.id, exceptions);
    (stillValid ? plan.updateKeys : plan.deleteKeys).push(s.occurrenceKey);
  }
  return plan;
}
