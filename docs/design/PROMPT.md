# Design-Prompt für Claude Code

> Vorher: Inhalt der `design-skills-local.zip` ins Repo-Root entpacken (legt `.claude/skills/ext-*` und `docs/DESIGN.md` an),
> Claude Code neu starten, dann den Text unter der Linie einfügen.

---

Gib dem Übungsleiter-Tracker jetzt sein endgültiges Design. **Verbindlich ist `docs/DESIGN.md` (Design Sheet „Hallenlicht“).**
Ziel: ein klares, ruhiges, volleyball-inspiriertes Interface (Anzeigetafel, Feldlinien, Ball-Gelb als einziger Akzent),
das auf die bestehende Funktionalität passt. **Funktion und Datenflüsse bleiben unverändert.**

## 0. Vorbereitung
1. Lies `docs/DESIGN.md`, `CLAUDE.md`, `docs/SPEC.md` und `docs/PROGRESS.md`.
2. Lege `.claude/skills/ext-*/` in `.gitignore` an. Das sind lokal installierte Fremd-Skills, teils ohne Lizenzangabe.
   Sie werden nicht committet, nur genutzt.
3. Prüfe, ob diese Skills verfügbar sind (`/skills`), und lies jeweils die `SKILL.md`, bevor du sie einsetzt:
   - `ext-frontend-design`: ästhetische Umsetzung ohne generischen KI-Look
   - `ext-ui-ux-pro-max`: Regeln und Checklisten. Nutze das Such-Script mit
     `python3 .claude/skills/ext-ui-ux-pro-max/scripts/search.py "<query>" --domain <ux|typography|color|chart>` bzw. `--stack svelte`.
     **Nicht** dessen automatisch empfohlenes Design-System übernehmen: Farben und Schriften sind durch DESIGN.md festgelegt.
   - `ext-bencium-innovative-ux-designer`: Die Richtung ist durch DESIGN.md bereits festgelegt („explizite Entscheidung“).
     Überspringe die zehn Richtungsentwürfe und nutze nur die Hinweise zur Produktionsphase (Round 2) und die Checks gegen generische Gestaltung.
   - `ext-design-systems`: Token-Architektur und Komponenten-Specs
   - `ext-interaction-design`: Zustände, Mikrointeraktionen, Fehlervermeidung
   - `ext-ux-writing`: alle deutschen UI-Texte nach DESIGN.md §11 prüfen
   - `ext-ux-research`: **keine echten Nutzer verfügbar.** Mach daraus eine Aufgabenanalyse: Wege für die 5 Kernaufgaben
     (bestätigen, nachtragen, Serie anlegen, Termin ändern, Antrag erstellen) mit Klick- und Tap-Zahlen vorher/nachher → `docs/design/task-analysis.md`
   - `ext-design-critique` + `ext-accessibility-audit`: Review-Durchgänge (Schritt 6)
   - `ext-web-design-guidelines`: aktuelle Regeln von
     `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` holen und anwenden
4. **Bestandsaufnahme vorher:** Alle Seiten in Pixel 7, iPhone 15 und 1280×800, jeweils hell und dunkel, sowie AlarmActivity
   (Roborazzi) screenshotten → `docs/design/before/`. Liste alle vorhandenen Komponenten und Stellen mit hartcodierten Farben,
   Abständen und Schriften → `docs/design/inventory.md`. Erstelle daraus einen Umbauplan (Task-Liste).

## 1. Tokens
`packages/shared/design/tokens.json` nach DESIGN.md §2–4 und §9, Generator-Script `pnpm tokens` (CSS-Variablen, Tailwind-v4-`@theme`,
Android `colors.xml`, `values-night`, `dimens.xml`) und ein CI-Check auf Aktualität. Kontraste per Unit-Test prüfen
(alle Text/Hintergrund-Paare aus §2 ≥ 4.5:1, große Schrift ≥ 3:1).

## 2. Grundlagen
Schriften selbst hosten (`@fontsource/barlow`, `@fontsource/barlow-condensed`, nur benötigte Schnitte, `font-display: swap`),
Basis-Styles, Fokus-Ring, `color-scheme`, `theme-color`, Theme-Umschalter (System/Hell/Dunkel), `prefers-reduced-motion`.
Icons: `lucide-svelte`. Eigene SVGs: Ball-Logo und Ballnaht (selbst gezeichnet, keine Markenanleihen).

## 3. Komponenten
Komponenten nach DESIGN.md §8 in `apps/web/src/lib/components/ui/` bauen oder umbauen. Alle Zustände inkl. loading, disabled,
error und empty. Bestehende Seiten auf diese Komponenten umstellen. Keine Hex-Werte mehr in Komponenten
(Lint-Regel oder Test, der `#[0-9a-f]{3,6}` außerhalb der Token-Dateien findet).

## 4. Seiten
Navigation (§6), dann die Screens in dieser Reihenfolge: In-App-Abfrage → Start → Offen → + Neu/Bearbeiten → Kalender → Termine →
Geräte → Export → Einstellungen → Alarm-Einrichtung → Login → Über.
Nach jedem Screen: Screenshots (3 Größen × hell/dunkel) **ansehen**, mit DESIGN.md vergleichen, nachbessern, Tests grün, Commit
(`style(web): …` / `feat(design): …`).

## 5. Android nativ
AlarmActivity exakt nach dem Schema in DESIGN.md §7 (Netzmuster, Hierarchie, Button-Höhen, Ball-Bounce, Reduced Motion über
`Settings.Global.ANIMATOR_DURATION_SCALE`). App-Icon als Adaptive Icon + Themed Icon, Splash-Screen (`core-splashscreen`) und
Statusleisten-Farben. Roborazzi-Screenshots hell und dunkel, mit Schriftgröße 1.0 und 1.3 → ansehen.

## 6. Review-Schleife (mindestens 2 Runden)
1. `ext-design-critique`: heuristische Bewertung aller Screens → Befunde nach Schwere.
2. `ext-accessibility-audit` + axe in Playwright: WCAG 2.2 AA, Tastaturpfade, Screenreader-Labels, 200 % Zoom, 320px Breite.
3. `ext-web-design-guidelines`: Befunde im `file:line`-Format.
4. `ext-ux-writing`: alle Strings in `de.ts` und `strings.xml`.
Befunde in `docs/design/review.md` sammeln, beheben, erneut prüfen. Abnahme nach DESIGN.md §14.

## 7. Abschluss
`pnpm verify` grün, CI grün. Screenshots nachher → `docs/design/after/`. In `docs/design/README.md` eine Vorher/Nachher-Galerie
aller Screens anlegen. README-Screenshots aktualisieren. PR „Design: Hallenlicht“ mit Galerie im PR-Text.
Abschlussbericht: was umgesetzt ist, offene Kompromisse, Kennzahlen aus der Aufgabenanalyse.

## Regeln
- DESIGN.md hat Vorrang vor Empfehlungen der Skills. Weiche nur ab, wenn Barrierefreiheit es verlangt, und dokumentiere das in `docs/DECISIONS.md`.
- Keine Funktionsänderungen. E2E-Selektoren nur anpassen, wenn nötig, und dann auf Rollen/Labels umstellen (kein CSS-Klassen-Selektor).
- Keine neuen kostenpflichtigen oder AGPL-inkompatiblen Abhängigkeiten, keine externen CDNs.
- Arbeite selbstständig und frag nicht nach Geschmacksentscheidungen. Offene Gestaltungsfragen entscheidest du nach DESIGN.md §1 (Prinzipien)
  und dokumentierst sie. Stoppe nur nach Skill `human-step`, wenn etwas zwingend mich braucht.
