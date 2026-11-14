// SPDX-License-Identifier: AGPL-3.0-or-later
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Timestamps are ISO-8601 UTC strings (`2026-11-10T18:40:00.000Z`) – lexicographically sortable. */
const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
};

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  avatarUrl: text('avatar_url'),
  ...timestamps,
});

export const oauthAccounts = sqliteTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    providerUserId: text('provider_user_id').notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex('oauth_provider_user').on(t.provider, t.providerUserId)],
);

export const devices = sqliteTable(
  'devices',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    platform: text('platform', { enum: ['android', 'web'] }).notNull(),
    tokenHash: text('token_hash'),
    lastSeenAt: text('last_seen_at'),
    isAlarmDevice: integer('is_alarm_device', { mode: 'boolean' }).notNull().default(false),
    appVersion: text('app_version'),
    ...timestamps,
  },
  (t) => [
    index('devices_user').on(t.userId),
    uniqueIndex('devices_token_hash').on(t.tokenHash),
    // at most one alarm device per user
    uniqueIndex('devices_one_alarm_device')
      .on(t.userId)
      .where(sql`${t.isAlarmDevice} = 1`),
  ],
);

export const authSessions = sqliteTable(
  'auth_sessions',
  {
    /** SHA-256 (hex) of the session token – the token itself is never stored */
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').references(() => devices.id, { onDelete: 'cascade' }),
    expiresAt: text('expires_at').notNull(),
    ...timestamps,
  },
  (t) => [index('auth_sessions_user').on(t.userId), index('auth_sessions_expires').on(t.expiresAt)],
);

export const pairingCodes = sqliteTable(
  'pairing_codes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    ...timestamps,
  },
  (t) => [uniqueIndex('pairing_code_hash').on(t.codeHash), index('pairing_user').on(t.userId)],
);

export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: text('window_start').notNull(),
  count: integer('count').notNull().default(0),
});

export const series = sqliteTable(
  'series',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    team: text('team').notNull().default(''),
    location: text('location').notNull().default(''),
    weekdays: integer('weekdays').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    intervalWeeks: integer('interval_weeks').notNull().default(1),
    startsOn: text('starts_on').notNull(),
    endsOn: text('ends_on'),
    units: integer('units').notNull().default(1),
    payCents: integer('pay_cents').notNull().default(1500),
    alarmOffsetMin: integer('alarm_offset_min').notNull().default(10),
    color: text('color').notNull().default('#2563eb'),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    ...timestamps,
  },
  (t) => [index('series_user').on(t.userId)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    occurrenceKey: text('occurrence_key').notNull(),
    seriesId: text('series_id').references(() => series.id, { onDelete: 'set null' }),
    date: text('date').notNull(),
    startTime: text('start_time').notNull(),
    endTime: text('end_time').notNull(),
    title: text('title').notNull(),
    team: text('team').notNull().default(''),
    location: text('location').notNull().default(''),
    units: integer('units').notNull().default(1),
    payCents: integer('pay_cents').notNull().default(1500),
    isOverride: integer('is_override', { mode: 'boolean' }).notNull().default(false),
    status: text('status', { enum: ['planned', 'pending', 'held', 'not_held', 'cancelled'] })
      .notNull()
      .default('planned'),
    kind: text('kind', { enum: ['training', 'match', 'tournament', 'other'] })
      .notNull()
      .default('training'),
    note: text('note'),
    answeredAt: text('answered_at'),
    answeredVia: text('answered_via', { enum: ['alarm', 'app', 'web', 'bulk', 'auto'] }),
    answeredDeviceId: text('answered_device_id'),
    snoozedUntil: text('snoozed_until'),
    alarmOffsetMin: integer('alarm_offset_min').notNull().default(10),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('sessions_user_occurrence').on(t.userId, t.occurrenceKey),
    index('sessions_user_date').on(t.userId, t.date),
    index('sessions_user_status').on(t.userId, t.status),
  ],
);

export const exceptions = sqliteTable(
  'exceptions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    fromDate: text('from_date').notNull(),
    toDate: text('to_date').notNull(),
    label: text('label').notNull(),
    seriesId: text('series_id').references(() => series.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (t) => [index('exceptions_user').on(t.userId)],
);

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull().default(''),
  iban: text('iban').notNull().default(''),
  clubName: text('club_name').notNull().default(''),
  reportIntroTemplate: text('report_intro_template'),
  reportRecipient: text('report_recipient').notNull().default(''),
  reportDeadline: text('report_deadline').notNull().default('12-15'),
  defaultPayCents: integer('default_pay_cents').notNull().default(1500),
  taxFreeLimitCents: integer('tax_free_limit_cents').notNull().default(330000),
  autoConfirmAfterHours: integer('auto_confirm_after_hours'),
  alarmSound: text('alarm_sound'),
  alarmVibrate: integer('alarm_vibrate', { mode: 'boolean' }).notNull().default(true),
  alarmRingSeconds: integer('alarm_ring_seconds').notNull().default(60),
  snoozeMinutes: integer('snooze_minutes').notNull().default(30),
  quietStart: text('quiet_start').default('22:00'),
  quietEnd: text('quiet_end').default('07:00'),
  ...timestamps,
});
