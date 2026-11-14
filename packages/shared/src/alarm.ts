// SPDX-License-Identifier: AGPL-3.0-or-later
/** Computes when the alarm for a session rings (local Berlin time, quiet hours respected). */
import {
  type HhMm,
  type IsoDate,
  addDays,
  formatDayMonthDe,
  localToInstant,
  timeToMinutes,
  toLocal,
} from './time';

export interface QuietHours {
  start: HhMm;
  end: HhMm;
}

function inQuiet(minutes: number, q: QuietHours): boolean {
  const s = timeToMinutes(q.start);
  const e = timeToMinutes(q.end);
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

export function shiftOutOfQuietHours(instant: Date, quiet: QuietHours | null): Date {
  if (!quiet) return instant;
  const local = toLocal(instant);
  const minutes = timeToMinutes(local.time);
  if (!inQuiet(minutes, quiet)) return instant;
  const s = timeToMinutes(quiet.start);
  const e = timeToMinutes(quiet.end);
  // crossing midnight and we're in the evening part → end is tomorrow
  const endDate = s > e && minutes >= s ? addDays(local.date, 1) : local.date;
  return localToInstant(endDate, quiet.end);
}

export function alarmTriggerAt(
  date: IsoDate,
  endTime: HhMm,
  offsetMin: number,
  quiet: QuietHours | null,
): Date {
  const end = localToInstant(date, endTime);
  return shiftOutOfQuietHours(new Date(end.getTime() + offsetMin * 60_000), quiet);
}

export interface AlarmSessionInput {
  occurrenceKey: string;
  date: IsoDate;
  /** optional for older callers; shown on the alarm screen as `18:00–19:30` */
  startTime?: HhMm | undefined;
  endTime: HhMm;
  location?: string | undefined;
  title: string;
  team: string;
  status: string;
  alarmOffsetMin: number;
}

/** `Di, 10.11. · 18:00–19:30 · Halle` – the native alarm screen splits this at ` · ` (DESIGN.md §7). */
export function alarmSubtitle(s: Pick<AlarmSessionInput, 'date' | 'startTime' | 'endTime' | 'location'>): string {
  const time = s.startTime ? `${s.startTime}–${s.endTime}` : `bis ${s.endTime}`;
  return [formatDayMonthDe(s.date), time, s.location ?? ''].filter(Boolean).join(' · ');
}

export interface AlarmEntry {
  key: string;
  /** epoch milliseconds */
  triggerAt: number;
  title: string;
  subtitle: string;
}

export const UNANSWERED_STATUSES = ['planned', 'pending'] as const;

export function alarmTitle(team: string, title: string): string {
  return `${[team, title].filter(Boolean).join(' ')} gehalten?`;
}

export function toAlarmEntry(
  s: Omit<AlarmSessionInput, 'status' | 'alarmOffsetMin'>,
  triggerAt: number,
): AlarmEntry {
  return {
    key: s.occurrenceKey,
    triggerAt,
    title: alarmTitle(s.team, s.title),
    subtitle: alarmSubtitle(s),
  };
}

/** The list handed to the native plugin: only future, unanswered, non-cancelled sessions. */
export function buildAlarmList(
  sessions: readonly AlarmSessionInput[],
  now: Date,
  quiet: QuietHours | null,
): AlarmEntry[] {
  return sessions
    .filter((s) => (UNANSWERED_STATUSES as readonly string[]).includes(s.status))
    .map((s) => toAlarmEntry(s, alarmTriggerAt(s.date, s.endTime, s.alarmOffsetMin, quiet).getTime()))
    .filter((a) => a.triggerAt > now.getTime())
    .sort((a, b) => a.triggerAt - b.triggerAt);
}

/** The alarm device rings this many minutes after the in-app question (§4.4). */
export const IN_APP_LEAD_MINUTES = 2;

/** In-app question (§4.4): due 2 min before the phone alarm (quiet hours do not apply in the foreground). */
export function isDue(
  s: { date: IsoDate; endTime: HhMm; status: string; alarmOffsetMin: number },
  now: Date,
): boolean {
  if (!(UNANSWERED_STATUSES as readonly string[]).includes(s.status)) return false;
  const at =
    alarmTriggerAt(s.date, s.endTime, s.alarmOffsetMin, null).getTime() - IN_APP_LEAD_MINUTES * 60_000;
  return at <= now.getTime();
}
