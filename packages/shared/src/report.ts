// SPDX-License-Identifier: AGPL-3.0-or-later
/** Aggregation for the "Übungsleiternachweis" (calendar year, month × groups × units). */
import { type IsoDate, MONTHS_DE } from './time';

export interface ReportSessionInput {
  date: IsoDate;
  team: string;
  status: string;
  units: number;
  payCents: number;
}

export interface ReportMonth {
  month: number;
  name: string;
  teams: string[];
  units: number;
}

export interface Report {
  year: number;
  months: ReportMonth[];
  totalUnits: number;
  teams: string[];
}

export interface ReportOptions {
  /** count planned/pending sessions until 31.12. too (submission is due before year end) */
  includePlanned: boolean;
}

const collator = new Intl.Collator('de-DE', { numeric: true, sensitivity: 'base' });

export function sortTeams(teams: Iterable<string>): string[] {
  return [...new Set([...teams].map((t) => t.trim()).filter(Boolean))].sort(collator.compare);
}

export function countsForReport(status: string, opts: ReportOptions): boolean {
  return status === 'held' || (opts.includePlanned && (status === 'planned' || status === 'pending'));
}

export function aggregateReport(
  sessions: readonly ReportSessionInput[],
  year: number,
  opts: ReportOptions,
): Report {
  const months: ReportMonth[] = MONTHS_DE.map((name, i) => ({ month: i + 1, name, teams: [], units: 0 }));
  const teamSets = months.map(() => new Set<string>());
  const prefix = `${year}-`;
  for (const s of sessions) {
    if (!s.date.startsWith(prefix) || !countsForReport(s.status, opts)) continue;
    const m = Number(s.date.slice(5, 7)) - 1;
    months[m]!.units += s.units;
    if (s.team) teamSets[m]!.add(s.team);
  }
  months.forEach((m, i) => (m.teams = sortTeams(teamSets[i]!)));
  return {
    year,
    months,
    totalUnits: months.reduce((a, m) => a + m.units, 0),
    teams: sortTeams(teamSets.flatMap((s) => [...s])),
  };
}

export interface Summary {
  heldCount: number;
  units: number;
  payCents: number;
  openCount: number;
}

export function summarize(sessions: readonly ReportSessionInput[], from: IsoDate, to: IsoDate): Summary {
  const r: Summary = { heldCount: 0, units: 0, payCents: 0, openCount: 0 };
  for (const s of sessions) {
    if (s.date < from || s.date > to) continue;
    if (s.status === 'held') {
      r.heldCount++;
      r.units += s.units;
      r.payCents += s.payCents;
    } else if (s.status === 'pending') {
      r.openCount++;
    }
  }
  return r;
}

export const DEFAULT_REPORT_INTRO =
  'Liebe Übungsleiterinnen und Übungsleiter, ich bitte Euch, nachfolgende Tabelle für das Jahr {jahr} auszufüllen ' +
  'und mir bis {frist} per Mail an {empfaenger} zuzuschicken. Vielen Dank für Euren Einsatz!';

export const DOTTED_LINE = '……………………………';

export function fillReportTemplate(
  template: string,
  values: { jahr: number | string; frist: string; empfaenger: string },
): string {
  const v: Record<string, string> = {
    jahr: String(values.jahr),
    frist: values.frist || DOTTED_LINE,
    empfaenger: values.empfaenger || DOTTED_LINE,
  };
  return template.replace(/\{(jahr|frist|empfaenger)\}/g, (_, k: string) => v[k]!);
}

/** Deadline `MM-DD` → `15.12.2026` */
export function formatDeadline(mmdd: string, year: number): string {
  const [m, d] = mmdd.split('-');
  return `${d}.${m}.${year}`;
}
