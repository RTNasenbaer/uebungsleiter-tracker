// SPDX-License-Identifier: AGPL-3.0-or-later
/** Parses holidays/closures from an .ics file (client side, ical.js). */
import ICAL from 'ical.js';
import { addDays } from '@ult/shared';

export interface IcsRange {
  fromDate: string;
  toDate: string;
  label: string;
}

const MAX_OCCURRENCES = 200;

function isoOf(t: ICAL.Time): string {
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
}

function rangeOf(start: ICAL.Time, end: ICAL.Time | null, label: string): IcsRange {
  const fromDate = isoOf(start);
  let toDate = end ? isoOf(end) : fromDate;
  // all-day DTEND is exclusive
  if (end && start.isDate && toDate > fromDate) toDate = addDays(toDate, -1);
  if (toDate < fromDate) toDate = fromDate;
  return { fromDate, toDate, label: label.trim() || 'Ausfall' };
}

export function parseIcs(text: string): IcsRange[] {
  const comp = new ICAL.Component(ICAL.parse(text));
  const out: IcsRange[] = [];
  for (const vevent of comp.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(vevent);
    if (!ev.startDate) continue;
    const label = ev.summary ?? '';
    if (ev.isRecurring()) {
      const it = ev.iterator();
      const durationDays = ev.endDate
        ? Math.max(0, ev.endDate.subtractDate(ev.startDate).toSeconds() / 86400)
        : 0;
      for (let n = 0, next = it.next(); next && n < MAX_OCCURRENCES; n++, next = it.next()) {
        const end = next.clone();
        end.addDuration(ICAL.Duration.fromSeconds(durationDays * 86400));
        out.push(rangeOf(next, durationDays ? end : null, label));
      }
    } else {
      out.push(rangeOf(ev.startDate, ev.endDate ?? null, label));
    }
  }
  return out.sort((a, b) => a.fromDate.localeCompare(b.fromDate) || a.label.localeCompare(b.label));
}
