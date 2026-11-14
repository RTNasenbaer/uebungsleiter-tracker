// SPDX-License-Identifier: AGPL-3.0-or-later
/** DTOs returned by the API (JSON). */
import type { AnswerVia, SessionKind, SessionStatus } from './schemas';

export interface SeriesDto {
  id: string;
  title: string;
  team: string;
  location: string;
  weekdays: number;
  startTime: string;
  endTime: string;
  intervalWeeks: number;
  startsOn: string;
  endsOn: string | null;
  units: number;
  payCents: number;
  alarmOffsetMin: number;
  color: string;
  active: boolean;
}

export interface SessionDto {
  id: string;
  occurrenceKey: string;
  seriesId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  team: string;
  location: string;
  units: number;
  payCents: number;
  isOverride: boolean;
  status: SessionStatus;
  kind: SessionKind;
  note: string | null;
  answeredAt: string | null;
  answeredVia: AnswerVia | null;
  answeredDeviceId: string | null;
  snoozedUntil: string | null;
  alarmOffsetMin: number;
  color: string | null;
}

export interface ExceptionDto {
  id: string;
  fromDate: string;
  toDate: string;
  label: string;
  seriesId: string | null;
}

export interface DeviceDto {
  id: string;
  name: string;
  platform: 'android' | 'web';
  lastSeenAt: string | null;
  isAlarmDevice: boolean;
  appVersion: string | null;
  isCurrent: boolean;
}

export interface SettingsDto {
  displayName: string;
  iban: string;
  clubName: string;
  reportIntroTemplate: string;
  reportRecipient: string;
  reportDeadline: string;
  defaultPayCents: number;
  taxFreeLimitCents: number;
  autoConfirmAfterHours: number | null;
  alarmSound: string | null;
  alarmVibrate: boolean;
  alarmRingSeconds: number;
  snoozeMinutes: number;
  quietStart: string | null;
  quietEnd: string | null;
}

export interface MeDto {
  user: { id: string; name: string; avatarUrl: string | null };
  device: DeviceDto | null;
  openCount: number;
}

export interface PairingCodeDto {
  code: string;
  expiresAt: string;
}

export interface PairRedeemDto {
  token: string;
  deviceId: string;
}

export interface SessionStatusDto {
  occurrenceKey: string;
  status: SessionStatus | 'unknown';
  answered: boolean;
}

export interface ImportResultDto {
  created: number;
  updated: number;
  skipped: number;
}
