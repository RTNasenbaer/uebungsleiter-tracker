// SPDX-License-Identifier: AGPL-3.0-or-later
/** Theme toggle (DESIGN.md §12): System / Hell / Dunkel, remembered per device. */
import { THEME_COLORS } from './styles/tokens.gen';

export type ThemeChoice = 'system' | 'light' | 'dark';
const KEY = 'ult:theme';

export const theme = $state({ choice: 'system' as ThemeChoice, dark: false });

function systemDark() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

function apply() {
  const root = document.documentElement;
  if (theme.choice === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme.choice;
  theme.dark = theme.choice === 'dark' || (theme.choice === 'system' && systemDark());
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.dark ? THEME_COLORS.dark : THEME_COLORS.light);
}

export function setTheme(choice: ThemeChoice) {
  theme.choice = choice;
  try {
    if (choice === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* private mode – still applies for this session */
  }
  apply();
}

/** Call once on startup; follows the OS setting while "System" is selected. */
export function initTheme() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  theme.choice = stored === 'light' || stored === 'dark' ? stored : 'system';
  apply();
  const mq = matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => theme.choice === 'system' && apply();
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
