// SPDX-License-Identifier: AGPL-3.0-or-later
import BellRing from 'lucide-svelte/icons/bell-ring';
import CalendarDays from 'lucide-svelte/icons/calendar-days';
import CalendarOff from 'lucide-svelte/icons/calendar-off';
import Download from 'lucide-svelte/icons/download';
import House from 'lucide-svelte/icons/house';
import Info from 'lucide-svelte/icons/info';
import List from 'lucide-svelte/icons/list';
import ListChecks from 'lucide-svelte/icons/list-checks';
import Repeat from 'lucide-svelte/icons/repeat';
import Settings from 'lucide-svelte/icons/settings';
import Smartphone from 'lucide-svelte/icons/smartphone';
import { de } from '$lib/i18n/de';

/** any Lucide icon component */
export type IconComponent = typeof House;
export interface NavItem {
  href: string;
  label: string;
  icon: IconComponent;
  badge?: boolean;
}

export const home: NavItem = { href: '/', label: de.nav.home, icon: House, badge: true };
export const calendar: NavItem = { href: '/kalender', label: de.nav.calendar, icon: CalendarDays };
export const sessions: NavItem = { href: '/termine', label: de.nav.sessions, icon: List };
export const open: NavItem = { href: '/offen', label: de.nav.open, icon: ListChecks };
export const series: NavItem = { href: '/trainings', label: de.nav.series, icon: Repeat };
export const exceptions: NavItem = { href: '/ausfaelle', label: de.nav.exceptions, icon: CalendarOff };
export const exportItem: NavItem = { href: '/export', label: de.nav.export, icon: Download };
export const devices: NavItem = { href: '/geraete', label: de.nav.devices, icon: Smartphone };
export const settings: NavItem = { href: '/einstellungen', label: de.nav.settings, icon: Settings };
export const alarmSetup: NavItem = { href: '/alarm', label: de.nav.alarmSetup, icon: BellRing };
export const about: NavItem = { href: '/ueber', label: de.nav.about, icon: Info };

/** "Mehr" on phones (DESIGN.md §6) – plus Offen and, in the app, the alarm setup. */
export function moreItems(native: boolean): NavItem[] {
  return [open, series, exceptions, exportItem, devices, settings, ...(native ? [alarmSetup] : []), about];
}

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
