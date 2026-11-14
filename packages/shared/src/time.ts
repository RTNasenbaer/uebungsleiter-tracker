// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * All time handling of the project. Everything is interpreted in Europe/Berlin.
 * Dates are plain `YYYY-MM-DD` strings, times are `HH:MM` strings (local wall clock).
 * Pure date arithmetic is done on UTC midnight so DST never shifts a calendar day.
 */

export const TIME_ZONE = 'Europe/Berlin';

export type IsoDate = string; // YYYY-MM-DD
export type HhMm = string; // HH:MM

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };

export function fixedClock(iso: string | Date): Clock {
  const t = typeof iso === 'string' ? new Date(iso) : iso;
  return { now: () => new Date(t.getTime()) };
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isIsoDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!));
  return d.getUTCFullYear() === +m[1]! && d.getUTCMonth() === +m[2]! - 1 && d.getUTCDate() === +m[3]!;
}

export function isHhMm(s: string): boolean {
  return TIME_RE.test(s);
}

function parseDate(date: IsoDate): [number, number, number] {
  const m = DATE_RE.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  return [+m[1]!, +m[2]!, +m[3]!];
}

function parseTime(time: HhMm): [number, number] {
  const m = TIME_RE.exec(time);
  if (!m) throw new Error(`Invalid time: ${time}`);
  return [+m[1]!, +m[2]!];
}

export function timeToMinutes(time: HhMm): number {
  const [h, m] = parseTime(time);
  return h * 60 + m;
}

export function minutesToTime(min: number): HhMm {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function dateToUtcMs(date: IsoDate): number {
  const [y, m, d] = parseDate(date);
  return Date.UTC(y, m - 1, d);
}

function utcMsToDate(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return utcMsToDate(dateToUtcMs(date) + days * 86_400_000);
}

/** Number of days from `a` to `b` (b - a). */
export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((dateToUtcMs(b) - dateToUtcMs(a)) / 86_400_000);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function weekdayOf(date: IsoDate): number {
  const d = new Date(dateToUtcMs(date)).getUTCDay();
  return d === 0 ? 7 : d;
}

export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, 1 - weekdayOf(date));
}

export function addMinutesToTime(time: HhMm, minutes: number): { time: HhMm; dayOffset: number } {
  const total = timeToMinutes(time) + minutes;
  return { time: minutesToTime(total), dayOffset: Math.floor(total / 1440) };
}

export function compareDates(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function lastDayOfMonth(year: number, month: number): IsoDate {
  return utcMsToDate(Date.UTC(year, month, 0));
}

const partsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function berlinParts(instant: Date): { y: number; mo: number; d: number; h: number; mi: number; s: number } {
  const out: Record<string, number> = {};
  for (const p of partsFormatter.formatToParts(instant)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return { y: out.year!, mo: out.month!, d: out.day!, h: out.hour!, mi: out.minute!, s: out.second! };
}

/** UTC offset of Europe/Berlin at the given instant, in minutes (60 or 120). */
export function berlinOffsetMinutes(instant: Date): number {
  const p = berlinParts(instant);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

export interface LocalParts {
  date: IsoDate;
  time: HhMm;
  /** 1 = Monday … 7 = Sunday */
  weekday: number;
}

export function toLocal(instant: Date): LocalParts {
  const p = berlinParts(instant);
  const date = `${p.y}-${String(p.mo).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  return { date, time: minutesToTime(p.h * 60 + p.mi), weekday: weekdayOf(date) };
}

export function todayIn(clock: Clock): IsoDate {
  return toLocal(clock.now()).date;
}

/**
 * Converts a Berlin wall-clock time to an instant.
 * Non-existent times (spring-forward gap) are shifted forward by the gap;
 * ambiguous times (fall-back overlap) resolve to the first (earlier) occurrence.
 */
export function localToInstant(date: IsoDate, time: HhMm): Date {
  const [y, mo, d] = parseDate(date);
  const [h, mi] = parseTime(time);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const before = berlinOffsetMinutes(new Date(wall - 86_400_000));
  const after = berlinOffsetMinutes(new Date(wall + 86_400_000));
  const candidates = [...new Set([before, after])]
    .map((off) => wall - off * 60_000)
    .filter((t) => berlinOffsetMinutes(new Date(t)) * 60_000 === wall - t)
    .sort((a, b) => a - b);
  if (candidates.length > 0) return new Date(candidates[0]!);
  // Gap: interpret with the offset valid before the transition → moves forward.
  return new Date(wall - before * 60_000);
}

const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
const WEEKDAY_LONG = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const;
export const MONTHS_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const;

export function weekdayShortDe(date: IsoDate): string {
  return WEEKDAY_SHORT[weekdayOf(date) - 1]!;
}

export function weekdayLongDe(date: IsoDate): string {
  return WEEKDAY_LONG[weekdayOf(date) - 1]!;
}

/** `Mi, 11.11.2026` */
export function formatDateDe(date: IsoDate): string {
  const [y, m, d] = parseDate(date);
  return `${weekdayShortDe(date)}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

/** `Mi, 11.11.` – compact form for cards and the alarm screen */
export function formatDayMonthDe(date: IsoDate): string {
  const [, m, d] = parseDate(date);
  return `${weekdayShortDe(date)}, ${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.`;
}

/** `11.11.2026` */
export function formatDateShortDe(date: IsoDate): string {
  const [y, m, d] = parseDate(date);
  return `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`;
}

/** `Dienstag, 10. November 2026` */
export function formatDateLongDe(date: IsoDate): string {
  const [y, m, d] = parseDate(date);
  return `${weekdayLongDe(date)}, ${d}. ${MONTHS_DE[m - 1]} ${y}`;
}

/** Parses `DD.MM.YYYY` (also `D.M.YYYY`) or `YYYY-MM-DD`. */
export function parseGermanDate(s: string): IsoDate | null {
  const t = s.trim();
  if (isIsoDate(t)) return t;
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
  return isIsoDate(iso) ? iso : null;
}

export function* eachDay(from: IsoDate, to: IsoDate): Generator<IsoDate> {
  for (let d = from; d <= to; d = addDays(d, 1)) yield d;
}
