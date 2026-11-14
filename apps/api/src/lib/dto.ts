// SPDX-License-Identifier: AGPL-3.0-or-later
import {
  DEFAULT_REPORT_INTRO,
  type DeviceDto,
  type SeriesDto,
  type SessionDto,
  type SettingsDto,
} from '@ult/shared';
import type { devices, exceptions, series, sessions, settings } from '../db/schema';

export function seriesDto(r: typeof series.$inferSelect): SeriesDto {
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
    color: r.color,
    active: r.active,
  };
}

export function sessionDto(r: typeof sessions.$inferSelect, color: string | null = null): SessionDto {
  return {
    id: r.id,
    occurrenceKey: r.occurrenceKey,
    seriesId: r.seriesId,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    title: r.title,
    team: r.team,
    location: r.location,
    units: r.units,
    payCents: r.payCents,
    isOverride: r.isOverride,
    status: r.status,
    kind: r.kind,
    note: r.note,
    answeredAt: r.answeredAt,
    answeredVia: r.answeredVia,
    answeredDeviceId: r.answeredDeviceId,
    snoozedUntil: r.snoozedUntil,
    alarmOffsetMin: r.alarmOffsetMin,
    color,
  };
}

export function exceptionDto(r: typeof exceptions.$inferSelect) {
  return { id: r.id, fromDate: r.fromDate, toDate: r.toDate, label: r.label, seriesId: r.seriesId };
}

export function deviceDto(r: typeof devices.$inferSelect, currentDeviceId: string | null): DeviceDto {
  return {
    id: r.id,
    name: r.name,
    platform: r.platform,
    lastSeenAt: r.lastSeenAt,
    isAlarmDevice: r.isAlarmDevice,
    appVersion: r.appVersion,
    isCurrent: r.id === currentDeviceId,
  };
}

export function settingsDto(r: typeof settings.$inferSelect): SettingsDto {
  return {
    displayName: r.displayName,
    iban: r.iban,
    clubName: r.clubName,
    reportIntroTemplate: r.reportIntroTemplate ?? DEFAULT_REPORT_INTRO,
    reportRecipient: r.reportRecipient,
    reportDeadline: r.reportDeadline,
    defaultPayCents: r.defaultPayCents,
    taxFreeLimitCents: r.taxFreeLimitCents,
    autoConfirmAfterHours: r.autoConfirmAfterHours,
    alarmSound: r.alarmSound,
    alarmVibrate: r.alarmVibrate,
    alarmRingSeconds: r.alarmRingSeconds,
    snoozeMinutes: r.snoozeMinutes,
    quietStart: r.quietStart,
    quietEnd: r.quietEnd,
  };
}
