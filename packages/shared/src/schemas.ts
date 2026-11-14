// SPDX-License-Identifier: AGPL-3.0-or-later
/** zod schemas = API contract shared by worker and clients. */
import { z } from 'zod';
import { isHhMm, isIsoDate } from './time';

export const isoDate = z.string().refine(isIsoDate, 'Ungültiges Datum (YYYY-MM-DD)');
export const hhmm = z.string().refine(isHhMm, 'Ungültige Uhrzeit (HH:MM)');
export const cents = z.number().int().min(0).max(10_000_000);
const text = (max: number) => z.string().trim().max(max);

export const SESSION_STATUSES = ['planned', 'pending', 'held', 'not_held', 'cancelled'] as const;
export const ANSWER_STATUSES = ['held', 'not_held', 'cancelled'] as const;
export const SESSION_KINDS = ['training', 'match', 'tournament', 'other'] as const;
export const ANSWER_VIA = ['alarm', 'app', 'web', 'bulk', 'auto'] as const;

export const sessionStatus = z.enum(SESSION_STATUSES);
export const answerStatus = z.enum(ANSWER_STATUSES);
export const sessionKind = z.enum(SESSION_KINDS);
export const answerVia = z.enum(ANSWER_VIA);

export type SessionStatus = z.infer<typeof sessionStatus>;
export type AnswerStatus = z.infer<typeof answerStatus>;
export type SessionKind = z.infer<typeof sessionKind>;
export type AnswerVia = z.infer<typeof answerVia>;

export const seriesFields = z.object({
  title: text(100).min(1),
  team: text(60).default(''),
  location: text(120).default(''),
  weekdays: z.number().int().min(1).max(127),
  startTime: hhmm,
  endTime: hhmm,
  intervalWeeks: z.number().int().min(1).max(4).default(1),
  startsOn: isoDate,
  endsOn: isoDate.nullable().default(null),
  units: z.number().int().min(0).max(20).default(1),
  payCents: cents.default(1500),
  alarmOffsetMin: z
    .number()
    .int()
    .min(0)
    .max(24 * 60)
    .default(10),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#2563eb'),
  active: z.boolean().default(true),
});
export const seriesInput = seriesFields.refine((s) => !s.endsOn || s.endsOn >= s.startsOn, {
  message: 'Ende vor Beginn',
  path: ['endsOn'],
});
export type SeriesInput = z.infer<typeof seriesInput>;

export const seriesEditScope = z.enum(['all', 'following']);
export const seriesUpdate = z.object({
  series: seriesInput,
  /** "following" = split at `fromDate` ("Dieser und alle folgenden") */
  scope: seriesEditScope.default('all'),
  fromDate: isoDate.optional(),
});

export const singleSessionInput = z.object({
  date: isoDate,
  startTime: hhmm,
  endTime: hhmm,
  title: text(100).min(1),
  team: text(60).default(''),
  location: text(120).default(''),
  units: z.number().int().min(0).max(20).default(1),
  payCents: cents.default(1500),
  kind: sessionKind.default('training'),
  note: text(500).nullable().default(null),
  status: sessionStatus.optional(),
});
export type SingleSessionInput = z.infer<typeof singleSessionInput>;

export const sessionPatch = z
  .object({
    date: isoDate,
    startTime: hhmm,
    endTime: hhmm,
    title: text(100).min(1),
    team: text(60),
    location: text(120),
    units: z.number().int().min(0).max(20),
    payCents: cents,
    kind: sessionKind,
    note: text(500).nullable(),
    status: sessionStatus,
  })
  .partial();
export type SessionPatch = z.infer<typeof sessionPatch>;

export const answerInput = z.object({
  occurrence_key: z.string().min(3).max(200),
  status: answerStatus,
  answered_at: z.iso.datetime({ offset: true }).optional(),
  note: text(500).nullable().optional(),
  via: answerVia.optional(),
});
export type AnswerInput = z.infer<typeof answerInput>;

export const bulkAnswerInput = z.object({
  keys: z.array(z.string().min(3).max(200)).min(1).max(1000),
  status: answerStatus,
});

export const snoozeInput = z.object({
  occurrence_key: z.string().min(3).max(200),
  minutes: z
    .number()
    .int()
    .min(1)
    .max(24 * 60),
});

export const exceptionFields = z.object({
  fromDate: isoDate,
  toDate: isoDate,
  label: text(120).min(1),
  seriesId: z.string().nullable().default(null),
});
export const exceptionInput = exceptionFields.refine((e) => e.toDate >= e.fromDate, {
  message: 'Ende vor Beginn',
  path: ['toDate'],
});
export type ExceptionInput = z.infer<typeof exceptionInput>;

export const exceptionBulkInput = z.object({ items: z.array(exceptionInput).min(1).max(500) });

const quietTime = hhmm.nullable();
export const settingsInput = z
  .object({
    displayName: text(120),
    iban: text(42),
    clubName: text(120),
    reportIntroTemplate: text(2000),
    reportRecipient: text(200),
    reportDeadline: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/),
    defaultPayCents: cents,
    taxFreeLimitCents: cents,
    autoConfirmAfterHours: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .nullable(),
    alarmSound: text(200).nullable(),
    alarmVibrate: z.boolean(),
    alarmRingSeconds: z.number().int().min(5).max(600),
    snoozeMinutes: z.number().int().min(1).max(240),
    quietStart: quietTime,
    quietEnd: quietTime,
  })
  .partial();
export type SettingsInput = z.infer<typeof settingsInput>;

export const deviceUpdate = z.object({
  name: text(60).min(1).optional(),
  isAlarmDevice: z.boolean().optional(),
});

export const pairRedeemInput = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{8}$/)),
  name: text(60).min(1),
  appVersion: text(40).optional(),
});

export const rangeQuery = z.object({ from: isoDate, to: isoDate });

/** JSON backup / import row (also used for CSV/XLSX import after parsing). */
export const importSession = z.object({
  occurrenceKey: z.string().min(3).max(200).optional(),
  date: isoDate,
  startTime: hhmm,
  endTime: hhmm,
  title: text(100).min(1),
  team: text(60).default(''),
  location: text(120).default(''),
  units: z.number().int().min(0).max(20).default(1),
  payCents: cents.default(1500),
  kind: sessionKind.default('training'),
  status: sessionStatus.default('held'),
  note: text(500).nullable().default(null),
});
export type ImportSession = z.infer<typeof importSession>;

export const importInput = z.object({
  sessions: z.array(importSession).max(5000),
  /** skip = keep existing on duplicate, overwrite = replace */
  onDuplicate: z.enum(['skip', 'overwrite']).default('skip'),
});

export const BACKUP_FORMAT = 'uebungsleiter-tracker-backup';
export const backupFile = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  exportedAt: z.string(),
  settings: settingsInput.optional(),
  series: z.array(seriesFields.extend({ id: z.string().min(1).max(100) })).max(500),
  exceptions: z.array(exceptionFields.extend({ id: z.string().min(1).max(100) })).max(2000),
  sessions: z.array(importSession).max(20000),
});
export type BackupFile = z.infer<typeof backupFile>;
