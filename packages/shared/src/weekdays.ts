// SPDX-License-Identifier: AGPL-3.0-or-later
/** Weekday bitmask, Monday = bit 0 … Sunday = bit 6. */
export const WEEKDAY = {
  MON: 1 << 0,
  TUE: 1 << 1,
  WED: 1 << 2,
  THU: 1 << 3,
  FRI: 1 << 4,
  SAT: 1 << 5,
  SUN: 1 << 6,
} as const;

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
export const ALL_WEEKDAYS = 0b1111111;

/** isoWeekday: 1 = Monday … 7 = Sunday */
export function hasWeekday(mask: number, isoWeekday: number): boolean {
  return (mask & (1 << (isoWeekday - 1))) !== 0;
}

export function toggleWeekday(mask: number, isoWeekday: number): number {
  return mask ^ (1 << (isoWeekday - 1));
}

export function weekdayMaskToLabel(mask: number): string {
  return WEEKDAY_LABELS.filter((_, i) => hasWeekday(mask, i + 1)).join(', ');
}
