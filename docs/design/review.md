# Design review "Hallenlicht"

Two rounds, each with: heuristic critique (`ext-design-critique`, Nielsen 0–4), accessibility audit
(`ext-accessibility-audit` + axe in Playwright, WCAG 2.2 AA), Vercel Web Interface Guidelines (`ext-web-design-guidelines`,
fetched fresh from `vercel-labs/web-interface-guidelines`), UX writing (`ext-ux-writing`, DESIGN.md §11).
Basis: screenshots of all screens in Pixel 7 / iPhone 15 / 1280×800 × light/dark (`pnpm --filter @ult/e2e screens`)
and the AlarmActivity (Roborazzi, light/dark × font scale 1.0/1.3).

Automated and permanent in the suite: `e2e/tests/design-a11y.spec.ts` (axe on all pages light+dark,
no horizontal scrolling at 320 px and 200 % zoom, visible focus on every tab stop), `apps/web/test/design-rules.test.ts`
(no hex/palette colors, emojis, CDNs), `packages/shared/test/tokens.test.ts` (contrast of all token pairs).

## Round 1

| #   | Source          | Finding                                                                                                                                | Severity                     | Status                                                                                                  |
| --- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | axe             | `/kalender`: days outside the month with `opacity-60` → contrast < 4.5:1                                                               | WCAG 1.4.3, High             | fixed (only `text-muted`)                                                                               |
| 2   | axe             | Start: `<dl>` of the scoreboard contained a wrapper `<div>` without `dt/dd`                                                            | WCAG 1.3.1, Moderate         | fixed (`ScoreTile` takes `class`)                                                                       |
| 3   | axe             | `/export`: scrollable report preview not keyboard-reachable                                                                            | WCAG 2.1.1, High             | fixed (`tabindex="0"`, labelled `figure`)                                                               |
| 4   | E2E/axe         | Termine: visually hidden radio of the chips escaped the scroll container → page scrolled horizontally (+79 px)                         | WCAG 1.4.10, High            | fixed (`relative` on the chip)                                                                          |
| 5   | Overflow test   | Start at 320 px: grid column grows with long team/place names (+285 px)                                                                | WCAG 1.4.10, High            | fixed (`min-w-0` on grid items/cards)                                                                   |
| 6   | Critique        | Two identical "Gerät koppeln" buttons on one screen (header + empty state)                                                             | H8 aesthetic/minimalist, 2   | fixed                                                                                                   |
| 7   | Critique        | Login: court graphic overflowed the viewport, card off-centre                                                                          | H8, 2                        | fixed                                                                                                   |
| 8   | Critique        | Pairing code too small (`text-5xl` no longer exists after resetting the type scale)                                                    | H1/H8, 3                     | fixed (`text-display`)                                                                                  |
| 9   | Critique        | Quiet hours: legend + "Ruhezeit von/bis" duplicated                                                                                    | H8, 1                        | fixed                                                                                                   |
| 10  | WIG             | `touch-action: manipulation` missing on `html`                                                                                         | Touch                        | fixed                                                                                                   |
| 11  | WIG/WCAG 2.4.11 | Fixed bottom bars could cover focused fields                                                                                           | Focus not obscured, Moderate | fixed (`scroll-padding-bottom`)                                                                         |
| 12  | WIG             | Non-auth fields without `autocomplete="off"`, email/code/IBAN with spellcheck                                                          | Forms                        | fixed (TextField default `off`, `spellcheck={false}`)                                                   |
| 13  | UX writing      | Hard-coded strings ("Training nicht gefunden", "auswählen", report columns, "Lädt …") outside `de.ts`                                  | §11                          | fixed                                                                                                   |
| 14  | UX writing      | "Antwort gespeichert", "Keine offenen Termine. 🎉", "Netzwerk"-style errors, "beantwortet/unbeantwortet" inconsistent with "bestätigt" | §11                          | fixed ("Eingetragen", "Alles bestätigt. Stark.", "Keine Verbindung. …", consistently "bestätigt/offen") |

## Round 2

| #   | Source                                          | Finding                                                                                                                      | Severity | Status                                       |
| --- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- |
| 15  | Critique (Pixel/iPhone)                         | Offen: FAB overlapped "Gehalten" in the fixed bulk bar                                                                       | H3/H5, 3 | fixed (bars get bottom padding as clearance) |
| 16  | Critique                                        | Offen: "offen" badge on every card is redundant and puts many yellow surfaces on screen (principle 4)                        | H8, 2    | fixed (no badge in the offen list)           |
| 17  | Critique                                        | Checkbox in the card with a dead gap next to the box                                                                         | H8, 1    | fixed                                        |
| 18  | axe (all pages, light+dark, Chromium + Pixel 7) | –                                                                                                                            | –        | ✓ no serious/critical                        |
| 19  | Overflow 320 px / 200 %                         | –                                                                                                                            | –        | ✓ no page scrolls horizontally               |
| 20  | Keyboard                                        | 25 tab stops on Start, each with a visible two-tone ring; dialogs: focus trap + Esc (native `<dialog>`), back gesture closes | –        | ✓                                            |
| 21  | Roborazzi                                       | Alarm at font scale 1.3: time with `autoSize`, nothing clipped, buttons ≥ 72/64/48 dp (unit test)                            | –        | ✓                                            |

## Deliberately not changed (justified)

| Guideline                                                                                 | Why not                                                                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| WIG "URL reflects state" (Termine filters, calendar month in the URL)                     | would be a functional change; the brief says "no functional changes". Candidate for Phase 8.                       |
| WIG "Warn before navigation with unsaved changes"                                         | new behaviour (router guard), not design → backlog.                                                                |
| WIG "Title Case for headings/buttons"                                                     | German UI: sentence case is correct (DESIGN.md §11, Duden).                                                        |
| WIG "Placeholders end with …"                                                             | the German placeholders are examples ("z. B. U12") – no ellipsis without omitted text (DIN 5008).                  |
| WIG "`Intl.DateTimeFormat` instead of hard-coded formats"                                 | dates come centrally from `packages/shared/src/time.ts` in `Europe/Berlin` (CLAUDE.md rule, tested incl. DST).     |
| WIG "Loading…" without a space                                                            | German: "Lädt …" with a space when a whole word is omitted (DIN 5008).                                             |
| Skill `ext-frontend-design`: "no caps labels / no '·' meta lines"                         | DESIGN.md §3/§7 explicitly prescribes field-line labels in caps and "U12 · TRAINING" → DESIGN.md takes precedence. |
| Skill `ext-ui-ux-pro-max` design system                                                   | not adopted on purpose; colours/fonts are fixed by DESIGN.md.                                                      |
| Initial focus on "Ja, gehalten" in the in-app question (visible ring right after opening) | intended: the main answer is directly reachable by keyboard (1 key).                                               |

## Acceptance DESIGN.md §14

- [x] WCAG 2.2 AA, axe without serious/critical, fully keyboard operable, visible focus – `design-a11y.spec.ts`
- [x] Vercel Web Interface Guidelines without open findings (or justified above)
- [x] Confirm training: from the alarm 1 tap, from app start ≤ 2 taps – `docs/design/task-analysis.md`
- [x] New series in ≤ 30 s without keyboard back-and-forth (native time fields, chips) – analytic estimate ~22 s
- [x] Light and dark, 320–1440 px, 200 %: nothing clipped, no horizontal scrolling – overflow test + screenshots
- [x] At most one yellow element per viewport (except calendar dots/status markers, see ADR-015)
- [x] No hex values in components, no emojis, no external font/CDN requests – `design-rules.test.ts`
