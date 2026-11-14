# Inventory before “Hallenlicht” (as of 14 Nov 2026, commit 23dc0b3)

Screenshots: `docs/design/before/<device>-<scheme>/*.jpg` (Pixel 7, iPhone 15, 1280×800, light/dark each)
and `docs/design/before/android/alarm_*.png` (Roborazzi).

## Components (`apps/web/src/lib/components/`)

| Component              | Purpose                                | Problems relative to DESIGN.md                                                                  |
| ---------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Modal.svelte`         | `<dialog>` with title bar, close “×”   | No bottom sheet on mobile, no drag handle, × as a text glyph, `backdrop:bg-black/50`            |
| `AnswerDialog.svelte`  | In-app question (§4.4)                 | Green/red buttons instead of accent/outline, no net pattern/scoreboard hierarchy, no bounce     |
| `SessionEditor.svelte` | Edit appointment + series-scope dialog | Scope choice as plain buttons instead of radio cards with an explanation, `<select>` for status |
| `StatusBadge.svelte`   | Status pill                            | Text only, no icon/shape (§2 status: color + icon + text)                                       |
| `WeekdayChips.svelte`  | Weekday multi-select                   | No arrow-key handling, no “jersey number” look, no checkmark announcement                       |
| `Toasts.svelte`        | Messages                               | `bg-slate-800`/`bg-red-700` hard-coded, no undo action, position not tied to nav                |

Missing entirely: Button (with loading/sizes), SessionCard, ScoreTile, CourtProgress, SegmentedControl,
Switch, TextField/TimeField/DateField/Select with help/error, BottomSheet, EmptyState, Skeleton,
NavBar/NavRail/Sidebar/FAB, Spinner (ball seam), logo.

Global “utilities” in `app.css`: `card`, `btn`, `btn-primary|secondary|danger|success`, `input`, `label`, `h1`, `h2`
– used on every page.

## Hard-coded colors

- `app.css`: whole token block uses Tailwind blue/slate values (`#2563eb`, `#0f172a` …), dark mode via `@media` only
  (no manual toggle, no `[data-theme]`).
- `app.html:8`: `theme-color #1d4ed8` (fixed, not light/dark).
- `routes/neu/+page.svelte:24`: 7 series colors as hex (`#2563eb` …) – data value, but in the component.
- Tailwind palette colors directly in markup (22 places): `text-red-700` (trainings, neu, geraete, export),
  `bg-amber-100 text-amber-950` (start banner, past-dates hint), `bg-red-50 text-red-800` (login error),
  `bg-slate-800`/`bg-red-700` (toasts), `bg-black/50` (modal backdrop), `bg-white` (QR), `bg-black` (camera),
  `text-white` (6×: badges, FAB, chips, today marker).
- Android: `colors.xml`/`values-night/colors.xml` with their own Tailwind hex values, `activity_alarm.xml` with
  `android:textColor="#FFFFFF"` hard-coded (2×), launcher background `#FFFFFF`.

## Typography

- Only `system-ui` stack, no own typeface, no tabular figures, no display face for numbers.
- Sizes ad hoc via Tailwind defaults (`text-xs` … `text-3xl`, `text-[0.7rem]` in the badge), pairing code `font-mono`.
- Headings: utility `h1` (2xl bold), `h2` (lg semibold) – no field-line labels.

## Spacing, shapes, shadows

- Tailwind default spacing (`gap-1/2/3/4`, `p-2/3/4`, `py-0.5`), no explicit 4-px scale.
- Radius: `rounded-card` (.75rem), `rounded-lg`, `rounded-full`, `rounded` mixed together.
- Shadows: `shadow-sm` on every card (DESIGN: cards without shadow), `shadow-lg` on FAB/more menu/toasts, `shadow-xl` on the modal.

## Icons / glyphs

Unicode glyphs instead of icons: `⌂ ✓ ▦ ↻ ≡` (bottom bar), `✔ ✖` (alarm setup), `‹ ›` (calendar), `×` (modal),
`✓ ✗` (start buttons), emoji `🎉` in `de.ts` (empty state for open items).

## Navigation

- Bottom bar: Start · Offen · Kalender · Trainings · Mehr (DESIGN: Start · Kalender · (+) · Termine · Mehr).
- “+ Neu” as a wide pill FAB at the bottom right above the bar (DESIGN: round 56-px ball FAB in the middle).
- Desktop: 240-px sidebar from 768 px (DESIGN: rail 768–1023, sidebar ≥ 1024).
- Open-items badge on “Offen” in brown (DESIGN: yellow dot with number on “Start”).

## Text (strings that contradict §11)

- `open.none`: „Keine offenen Termine. 🎉“ → „Alles bestätigt. Stark.“
- `answer.done`: „Antwort gespeichert“, native `alarm_saved` same → „Eingetragen“
- `series.endConfirm`/`deleteConfirm`: OK in tone, but “beantwortet” vs. “bestätigt” inconsistent.
- `common.offline`: „Keine Verbindung zum Server.“ → wording from §11.
- `nav.new` „+ Neu“ contains the plus as text; with the FAB icon the label becomes „Neu“ / „Neues Training“.

## Rebuild plan (task list)

1. [ ] `.gitignore` for `.claude/skills/ext-*/`, screenshot tour (`pnpm --filter @ult/e2e screens`), before shots, this inventory
2. [ ] Tokens: `packages/shared/design/tokens.json` (W3C format), generator `pnpm tokens` → `tokens.css`, `@theme`,
       Android `colors.xml`/`values-night`/`dimens.xml`; CI check `pnpm tokens:check`; contrast unit test
3. [ ] Basics: @fontsource Barlow/Barlow Condensed, base styles, focus ring, `color-scheme`, `theme-color`,
       theme toggle (system/light/dark, localStorage), reduced motion; lucide-svelte; logo + ball seam SVG; favicon
4. [ ] UI components in `lib/components/ui/` with all states; hex lint test
5. [ ] Navigation (bar/rail/sidebar, ball FAB, badge on Start)
6. [ ] Screens in order: in-app question → Start → Offen → + Neu/Edit → Kalender → Termine
       (+ Trainings, Ausfälle) → Geräte → Export → Einstellungen → Alarm-Einrichtung → Login (+ Koppeln) → Über
7. [ ] Android: AlarmActivity per §7, adaptive/themed icon, splash, status bar; Roborazzi light/dark × 1.0/1.3
8. [ ] Review rounds (critique, a11y + axe, web guidelines, UX writing) → `review.md`
9. [ ] After shots, gallery `docs/design/README.md`, README screenshots, task analysis, verify, PR
