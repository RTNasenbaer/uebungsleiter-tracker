// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from 'vitest';
import { contrast, loadTokens, outputs, themeColors, type Mode } from '../design/tokens';

const tokens = loadTokens();

/** Text/background pairs from DESIGN.md §2 (normal text ≥ 4.5:1). */
const TEXT_PAIRS: [fg: string, bg: string][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-sunken'],
  ['text', 'accent-soft'],
  ['text-muted', 'bg'],
  ['text-muted', 'surface'],
  ['text-muted', 'surface-sunken'],
  ['text-muted', 'accent-soft'],
  ['on-primary', 'primary'],
  ['on-primary', 'primary-hover'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-hover'],
  ['link', 'bg'],
  ['link', 'surface'],
  ['held', 'bg'],
  ['held', 'surface'],
  ['not-held', 'bg'],
  ['not-held', 'surface'],
  ['planned', 'bg'],
  ['planned', 'surface'],
  ['cancelled', 'bg'],
  ['cancelled', 'surface'],
  ['on-pending', 'pending'],
  ['danger', 'surface'],
  ['on-danger', 'danger'],
  ['on-scoreboard', 'scoreboard'],
  ['scoreboard-muted', 'scoreboard'],
  ['alarm-text', 'alarm-bg'],
  ['on-paper', 'paper'],
  ['alarm-muted', 'alarm-bg'],
  ['alarm-on-accent', 'alarm-accent'],
];

/** Non-text contrast (WCAG 1.4.11) and large text: ≥ 3:1. */
const UI_PAIRS: [fg: string, bg: string][] = [
  ['line-strong', 'surface'],
  ['line-strong', 'bg'],
  ['focus-outer', 'focus-inner'],
  ['progress', 'scoreboard'],
  ['primary', 'bg'],
  ['primary', 'surface'],
  ['accent', 'alarm-bg'],
];

describe.each(['light', 'dark'] as Mode[])('design tokens (%s)', (mode) => {
  const c = themeColors(tokens, mode);

  it.each(TEXT_PAIRS)('%s on %s ≥ 4.5:1', (fg, bg) => {
    expect(c[fg], fg).toBeDefined();
    expect(c[bg], bg).toBeDefined();
    expect(contrast(c[fg]!, c[bg]!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)('%s against %s ≥ 3:1', (fg, bg) => {
    expect(contrast(c[fg]!, c[bg]!)).toBeGreaterThanOrEqual(3);
  });

  it.each(['bg', 'surface', 'surface-sunken', 'accent-soft'])(
    'two-tone focus ring stays visible on %s (one ring ≥ 3:1)',
    (bg) => {
      const best = Math.max(contrast(c['focus-outer']!, c[bg]!), contrast(c['focus-inner']!, c[bg]!));
      expect(best).toBeGreaterThanOrEqual(3);
    },
  );

  it('defines the same semantic tokens as the other mode', () => {
    const other = themeColors(tokens, mode === 'light' ? 'dark' : 'light');
    expect(Object.keys(c).sort()).toEqual(Object.keys(other).sort());
  });
});

describe('design token pipeline', () => {
  it('matches the documented ratios of DESIGN.md §2', () => {
    const light = themeColors(tokens, 'light');
    expect(contrast(light.text!, light.bg!)).toBeCloseTo(15.5, 0);
    expect(contrast(light['on-accent']!, light.accent!)).toBeCloseTo(11.2, 0);
  });

  it('never uses yellow as text on a light background', () => {
    const light = themeColors(tokens, 'light');
    for (const k of ['text', 'text-muted', 'link', 'held', 'not-held', 'planned', 'cancelled'])
      expect(light[k]!.toLowerCase()).not.toBe(light.accent!.toLowerCase());
  });

  it('generates CSS for light, dark and the system preference', () => {
    const css = outputs(tokens)['apps/web/src/lib/styles/tokens.css']!;
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('@theme inline');
    expect(css).toContain('--color-muted: var(--hl-text-muted);');
  });

  it('generates Android colors with ARGB alpha', () => {
    const xml = outputs(tokens)['apps/android/android/app/src/main/res/values/colors.xml']!;
    expect(xml).toContain('<color name="hl_overlay">#990B1426</color>');
    expect(xml).toContain('<color name="hl_alarm_bg">#0B1426</color>');
  });
});
