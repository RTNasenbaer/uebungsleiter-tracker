# DESIGN.md – Design Sheet „Hallenlicht“

> Verbindliche Gestaltungsregeln für Web-App, App-Oberfläche (Capacitor) und den nativen Alarm (Kotlin).
> Ändert **nur das Aussehen**, nicht die Funktion. Bei Konflikt mit Barrierefreiheit gewinnt immer die Barrierefreiheit.

## 1. Leitidee

**Anzeigetafel trifft leere Halle am Dienstagabend.** Die App soll sich anfühlen wie ein gut organisierter Trainer:
klar, schnell, freundlich, kein Lärm. Volleyball steckt in der _Struktur_, nicht in Clipart.

Vier Prinzipien:

1. **Eine Frage, ein Tap.** „Training gehalten?“ ist die wichtigste Interaktion. Alles andere tritt dahinter zurück.
2. **Zahlen wie auf der Anzeigetafel.** Einheiten, Euro und Daten stehen groß, schmal und in Tabellenziffern.
3. **Feldlinien statt Deko.** Gliederung über dünne, präzise Linien wie die Markierungen auf dem Hallenboden, nicht über Schatten und Verläufe.
4. **Gelb ist der Ball, und es gibt nur einen Ball pro Screen.** Ball-Gelb markiert genau das eine Element, das jetzt zählt
   (offene Abfrage, Haupt-Button der Frage, heutiger Tag). Nie als Flächenfarbe für Navigation oder Deko.

## 2. Farben

Quelle: `packages/shared/design/tokens.json` (siehe §12). Komponenten verwenden **nur semantische Tokens**, nie Hex-Werte.

### Basis-Palette

| Token        | Hex       | Herkunft                                                  |
| ------------ | --------- | --------------------------------------------------------- |
| `navy-950`   | `#0B1426` | Halle bei Nacht                                           |
| `navy-900`   | `#0E1B33` | Netzband, Text                                            |
| `navy-700`   | `#1D3461` | Primärflächen                                             |
| `navy-500`   | `#2F5596` | Links, Fokus-Begleitfarbe                                 |
| `navy-300`   | `#7FA6E8` | Links im Dark Mode                                        |
| `ball-400`   | `#FFC93C` | Ball-Gelb (Akzent)                                        |
| `ball-200`   | `#FFE7A3` | Gelb, weich (Hintergrund offener Karten, hell)            |
| `floor-50`   | `#F7F3EA` | Ahorn-Hallenboden (App-Hintergrund hell)                  |
| `floor-100`  | `#EFE8DA` | vertiefte Fläche hell                                     |
| `court-500`  | `#E46A3C` | Spielfeld-Orange, **nur dekorativ** (Linien, Logo-Detail) |
| `slate-600`  | `#5B6475` | Sekundärtext hell                                         |
| `slate-400`  | `#9AA6BC` | Sekundärtext dunkel                                       |
| `line-light` | `#D9D1C0` | Feldlinie hell                                            |
| `line-dark`  | `#24324F` | Feldlinie dunkel                                          |

### Semantische Tokens

| Token                    | Hell                                | Dunkel                              |
| ------------------------ | ----------------------------------- | ----------------------------------- |
| `bg`                     | `floor-50`                          | `navy-950`                          |
| `surface`                | `#FFFFFF`                           | `#13203A`                           |
| `surface-sunken`         | `floor-100`                         | `#0F1A30`                           |
| `text`                   | `navy-900` (15,5:1)                 | `#EEF2F8` (16,4:1)                  |
| `text-muted`             | `slate-600` (5,4:1)                 | `slate-400` (7,5:1)                 |
| `line`                   | `line-light`                        | `line-dark`                         |
| `primary` / `on-primary` | `navy-700` / `#FFFFFF` (12,2:1)     | `ball-400` / `navy-950` (12:1)      |
| `accent` / `on-accent`   | `ball-400` / `navy-900` (11,2:1)    | `ball-400` / `navy-950`             |
| `link`                   | `navy-500` (6,6:1)                  | `navy-300` (6,6:1)                  |
| `focus-ring`             | `ball-400` außen + `navy-900` innen | `ball-400` außen + `navy-950` innen |

### Status (immer Farbe + Icon + Text, nie nur Farbe)

| Status                    | Hell (Text/Icon auf `bg`)         | Dunkel                         | Icon (Lucide)    | Form                    |
| ------------------------- | --------------------------------- | ------------------------------ | ---------------- | ----------------------- |
| gehalten `held`           | `#1B7A4E` (4,8:1)                 | `#5FD39A`                      | `check-circle-2` | gefüllter Punkt         |
| nicht gehalten `not_held` | `#B8452B` (4,8:1)                 | `#FF8A6B`                      | `x-circle`       | durchgestrichener Punkt |
| offen `pending`           | Text `navy-900` auf `ball-400`    | Text `navy-950` auf `ball-400` | `circle-help`    | gelber Punkt mit Ring   |
| geplant `planned`         | `navy-500`, Outline               | `navy-300`, Outline            | `calendar-clock` | leerer Ring             |
| fällt aus `cancelled`     | `slate-600`, Text durchgestrichen | `slate-400`                    | `ban`            | grauer Strich           |

**Verboten:** Gelb als Textfarbe auf hellem Grund (1,4:1), Orange als Textfarbe, Verläufe, Glassmorphism, Neon,
mehr als ein gelbes Element pro Viewport (Ausnahme: Kalender-Statuspunkte).

## 3. Typografie

Selbst gehostet über `@fontsource` (kein Google-Fonts-CDN, wegen DSGVO und Offline-Betrieb). Lizenz OFL, AGPL-kompatibel.

| Rolle            | Schrift                                                   | Gewicht       | Einsatz                                              |
| ---------------- | --------------------------------------------------------- | ------------- | ---------------------------------------------------- |
| Display / Zahlen | **Barlow Condensed**                                      | 600, 700      | Seitentitel, Anzeigetafel-Zahlen, Uhrzeiten im Alarm |
| Text / UI        | **Barlow**                                                | 400, 500, 600 | Fließtext, Buttons, Formulare                        |
| Labels           | Barlow 600, `uppercase`, `letter-spacing: .06em`, 12–13px |               | „Feldlinien-Labels“ über Sektionen                   |

Skala (rem, Basis 16px, Mobile → Desktop):
`xs .75` · `sm .875` · `base 1` · `lg 1.125` · `xl 1.375` · `2xl 1.75` · `3xl 2.25` · `display 3–4.5` (clamp).
Zeilenhöhe Text 1.5, Display 1.05. Alle Zahlen: `font-variant-numeric: tabular-nums`. Uhrzeiten mit Gedankenstrich `18:00–19:30`.
Datumsformat: `Di, 11.11.2026`. Beträge: `15,00 €`.

## 4. Raster, Abstände, Formen

- 4-px-Basis. Abstände: `1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64`.
- Inhaltsbreite: max. 1120px (Desktop), Formulare max. 560px.
- Radius: `sm 6px` (Inputs), `md 12px` (Karten, Dialoge), `full` (Chips, Ball-FAB, Statuspunkte).
- **Feldlinie:** 1,5px `line`. Sektionen trennt eine Feldlinie mit kleiner Mittelmarke (8px Strich in `court-500`).
- Schatten nur für schwebende Ebenen (Dialog, Bottom-Sheet, FAB): `0 8px 24px rgb(14 27 51 / .14)`. Karten haben **keinen** Schatten, nur eine Linie.
- Touch-Ziele ≥ 48×48px, Abstand zwischen Zielen ≥ 8px.

## 5. Motive

- **Ballnaht:** drei geschwungene Linien (eigenes SVG, keine fremde Marke). Einsatz: Logo, App-Icon, „+ Neu“-FAB,
  Lade-Indikator (dreht sich langsam, bei `prefers-reduced-motion` statisch), leere Zustände.
- **Feldlinien:** dünne Rechteck-Konturen für Hero und leere Zustände, z. B. ein angedeutetes Spielfeld mit Mittellinie hinter der Anzeigetafel.
- **Netz:** feines Rautenmuster (4–6 % Deckkraft), **nur** im Kopf des Alarm-Screens und der In-App-Abfrage.
- Verboten: Fotos von Spielern, Clipart-Bälle, Emojis als Icons, Markenlogos (Ballhersteller, Verbände), Konfetti.

## 6. Layout & Navigation

| Breite     | Navigation                                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| < 768px    | Untere Leiste mit 5 Plätzen: **Start · Kalender · ( + ) · Termine · Mehr**. „+ Neu“ ist ein runder Ball-FAB (56px, `primary`), mittig, leicht über der Leiste. Safe-Area beachten. |
| 768–1023px | Navigation Rail links (72px) mit Icons + Kurzlabels, FAB oben in der Rail                                                                                                          |
| ≥ 1024px   | Seitenleiste 240px: Logo, Navigation, Button „+ Neues Training“, unten Gerätestatus und „Über“                                                                                     |

„Mehr“ enthält: Trainings (Serien), Ausfälle, Export, Geräte, Einstellungen, Über.
Seitentitel: Barlow Condensed 700, `2xl`, mit Feldlinien-Label darüber (z. B. `NOVEMBER 2026` / **Kalender**).
Badge mit Anzahl offener Termine an „Start“ (gelber Punkt mit Zahl).

## 7. Screens

**Start**

1. **Anzeigetafel** (Hero): Karte in `navy-900` (dunkel: `surface`), drei Werte nebeneinander in Barlow Condensed `display`:
   `EINHEITEN 2026` · `VERGÜTUNG` · `DIESER MONAT`. Darunter der Fortschritt zum Freibetrag als schmales „Spielfeld“
   (Kontur mit Mittellinie, Füllung `navy-500`/`navy-300`, Wert als Text daneben).
2. **Offene Termine:** Karten mit gelbem linkem Streifen (4px) und `ball-200`-Hintergrund (dunkel: `surface` + gelber Streifen).
   Inline-Buttons **Ja** (accent) / **Nein** (outline). Ab 3 offenen: „Alle X offenen bestätigen“ → Offen-Liste.
3. **Nächstes Training:** kompakte Karte (Wochentag groß in Barlow Condensed, Zeit, Ort, Mannschaft).
4. Antrags-Banner ab 1.12. (outline, Icon `file-text`, kein Gelb, wenn schon ein offener Termin das Gelb trägt).

**Offen-Liste:** Gruppiert nach Monat, Checkbox links, Sammelaktionen in einer festen Leiste unten (mobil) bzw. oben (Desktop).

**Kalender:** Monatsraster, Wochenbeginn Montag. Pro Tag Statuspunkte (max. 3, dann „+n“). Heute: gelber Ring um die Zahl.
Ferien/Ausfälle als schraffierter Hintergrund (Diagonallinien in `line`). Tippen auf einen Tag öffnet ein Bottom-Sheet (mobil) oder ein Seitenpanel (Desktop).
Mobil zusätzlich ein Umschalter **Monat | Liste**.

**Termine:** Desktop als Tabelle (feste Kopfzeile, Tabellenziffern, Zeilenhöhe 52px). Mobil als Karten. Filter als Chips über der Liste.

**+ Neu / Training bearbeiten** (Bottom-Sheet mobil, Dialog Desktop):

- Felder: Training, Mannschaft, Datum bzw. Start, von–bis (zwei Zeitfelder nebeneinander), Ort, Einheiten, Vergütung.
- Schalter **Wiederholen** → Wochentag-Chips **Mo Di Mi Do Fr Sa So** als runde „Trikotnummern“ (48px,
  Barlow Condensed 600). Aus: Outline. An: `primary`-Fläche mit Häkchen-Ankündigung für Screenreader.
- „Jede Woche / alle 2 Wochen“ als Segmented Control, Ende: „Nie / Am …“.
- Hinweisbox (Info-Icon, `surface-sunken`), wenn Termine nachgetragen werden: „9 vergangene Termine werden zum Bestätigen angelegt.“
- Speichern-Button unten fixiert (mobil).

**Serientermin ändern:** drei Radio-Karten („Nur dieser Termin“ / „Dieser und alle folgenden“ / „Alle Termine“) mit je einer Zeile Erklärung.

**Geräte:** Liste mit Geräte-Icon, Name, „zuletzt aktiv“. Das Erinnerungsgerät ist als Radio-Auswahl mit Glocken-Icon markiert.
„Gerät koppeln“ zeigt einen großen QR-Code auf `#FFFFFF` (auch im Dark Mode) und den 8-stelligen Code in Barlow Condensed, gruppiert 4-4.

**Export:** Jahr-Auswahl. Die Antrag-Vorschau sieht aus wie ein Blatt Papier (weiß, schmaler Rand, schlichte Tabelle).
Buttons: „PDF herunterladen“ (primary), „CSV“, „Excel“, „Backup“ (secondary).

**Einstellungen:** gruppierte Listen mit Feldlinien-Labels, Schalter rechts, Erklärungen in `text-muted`.

**Alarm-Einrichtung (App):** Checkliste. Jede Zeile hat einen Status (grünes Häkchen bzw. gelbes Ausrufezeichen), einen Satz Erklärung und den Button „Öffnen“.
Ganz unten groß: „Test-Alarm in 1 Minute“.

**Login:** Zentrierte Karte auf `bg` mit angedeuteten Feldlinien im Hintergrund, Ball-Logo, App-Name, Button „Mit GitHub anmelden“ (primary, GitHub-Icon).

**Alarm-Screen (nativ, Kotlin) & In-App-Abfrage** – das Herzstück:

```
┌──────────────────────────────┐  Hintergrund navy-950, oben Netzmuster (5 %)
│  U12 · TRAINING               │  Label: Barlow 600 caps, slate-400
│  Di, 11.11.                   │  Barlow Condensed 600, 2xl, weiß
│  18:00–19:30                  │  Barlow Condensed 700, display, weiß, tabular
│  Sporthalle Gymnasium         │  Barlow 400, slate-400
│                               │
│  Training gehalten?           │  Barlow Condensed 700, 3xl, weiß
│                               │
│ ┌──────────────────────────┐  │  JA, GEHALTEN: ball-400, Text navy-950, 72dp hoch, volle Breite
│ └──────────────────────────┘  │
│ ┌──────────────────────────┐  │  NEIN: Outline 2dp weiß, Text weiß, 64dp
│ └──────────────────────────┘  │
│        Später (30 min)        │  Textbutton slate-400, 48dp
└──────────────────────────────┘
```

Bestätigung: Häkchen in einem Kreis mit „Ball-Bounce“ (§9), Text „Eingetragen“, der Screen schließt nach 1,2 s.
Die In-App-Abfrage (Web/App) ist ein modaler Dialog mit derselben Hierarchie, kompakter (Buttons 56px).

## 8. Komponenten (Mindestumfang)

| Komponente                                                        | Varianten / Zustände                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                                                            | `primary`, `accent` (nur für die Hauptantwort „Ja“), `secondary` (Outline), `ghost`, `danger`; Größen sm 40 / md 48 / lg 56 / xl 72; Zustände hover, active (Skalierung .98), focus-visible, disabled, loading (Ball-Spinner) |
| StatusBadge                                                       | 5 Status nach §2, Größen sm/md, immer mit Icon und Text                                                                                                                                                                       |
| SessionCard                                                       | Status-Streifen links, Datum, Zeit, Mannschaft, Ort, Einheiten, Betrag, Aktionen                                                                                                                                              |
| ScoreTile                                                         | Label (caps), Wert (Display), optional Delta/Untertitel                                                                                                                                                                       |
| CourtProgress                                                     | Fortschritt im „Spielfeld“-Stil, mit `role="progressbar"`                                                                                                                                                                     |
| WeekdayChips                                                      | Mehrfachauswahl, Tastatur (Pfeile + Leertaste), `aria-pressed`                                                                                                                                                                |
| SegmentedControl, Switch, TextField, TimeField, DateField, Select | Label immer sichtbar, Hilfetext, Fehler unter dem Feld                                                                                                                                                                        |
| BottomSheet / Dialog                                              | Fokusfalle, `Esc`, Zurück-Geste, Ziehgriff mobil                                                                                                                                                                              |
| Toast                                                             | unten mittig (mobil über der Navigation), `aria-live="polite"`, Rückgängig-Aktion bei Statusänderungen                                                                                                                        |
| EmptyState                                                        | Feldlinien-Illustration + ein Satz + eine Aktion                                                                                                                                                                              |
| Skeleton                                                          | in Form des späteren Inhalts, kein Spinner für Listen                                                                                                                                                                         |
| NavBar, NavRail, Sidebar, FAB                                     | wie §6                                                                                                                                                                                                                        |

## 9. Bewegung

- Dauer: `fast 120ms` (Hover, Press) · `base 200ms` (Einblenden) · `slow 320ms` (Sheets, Dialoge).
- Easing: Standard `cubic-bezier(.2,.8,.2,1)`, Ausblenden `cubic-bezier(.4,0,1,1)`.
- **Ball-Bounce**, nur für erfolgreiche Bestätigung: scale .9 → 1.06 → 1, 320ms.
- Nur `transform` und `opacity` animieren. `prefers-reduced-motion: reduce` → keine Bewegung, nur Überblenden ≤ 120ms.
- Keine Endlos-Animationen außer dem Lade-Indikator.

## 10. Icons

Lucide (ISC-Lizenz), Strichstärke 1.75, Größen 16/20/24. Eigene SVGs nur für Ball-Logo und Ballnaht.
Icon-only-Buttons brauchen immer ein `aria-label` und einen Tooltip (Desktop).

## 11. Sprache & Ton

Du-Form, kurz, freundlich, sachlich. Volleyball-Begriffe sparsam und nur da, wo sie nicht verwirren. Funktionstexte bleiben eindeutig.

| Situation         | So                                                                      | Nicht so                      |
| ----------------- | ----------------------------------------------------------------------- | ----------------------------- |
| Abfrage           | „Training gehalten?“                                                    | „Hast du heute gebaggert? 🏐“ |
| Bestätigung       | „Eingetragen“                                                           | „Erfolgreich gespeichert!“    |
| Leerzustand Offen | „Alles bestätigt. Stark.“                                               | „Keine Daten vorhanden“       |
| Fehler            | „Keine Verbindung. Deine Antwort wird gesendet, sobald du online bist.“ | „Netzwerkfehler (500)“        |
| Löschen           | „Serie beenden? Bereits bestätigte Termine bleiben erhalten.“           | „Sind Sie sicher?“            |

## 12. Tokens-Pipeline

`packages/shared/design/tokens.json` (W3C-Design-Tokens-Format) ist die einzige Quelle. Das Script `pnpm tokens` erzeugt daraus:

- `apps/web/src/lib/styles/tokens.css` (CSS Custom Properties, `:root` + `[data-theme="dark"]` + `@media (prefers-color-scheme: dark)`)
- den Tailwind-v4-Block `@theme` (Farben, Radien, Schriften, Abstände) → Utilities wie `bg-surface`, `text-muted`
- `apps/android/app/src/main/res/values/colors.xml`, `values-night/colors.xml` und `dimens.xml` für die AlarmActivity und das App-Theme

Ein CI-Check stellt sicher, dass die erzeugten Dateien aktuell sind. Theme-Umschalter in den Einstellungen: System / Hell / Dunkel.
Außerdem `color-scheme` und `<meta name="theme-color">` passend setzen.

## 13. Logo & App-Icon

Ball mit drei Nahtlinien in `navy-900` auf `ball-400`-Kreis. Adaptive Icon: Vordergrund Ball, Hintergrund `navy-700`.
Monochromes Icon für Android-Themed-Icons. Favicon als SVG mit Dark-Mode-Variante. Splash: `navy-950` mit zentriertem Logo.

## 14. Qualitätskriterien (Abnahme)

- [ ] WCAG 2.2 AA, axe ohne `serious`/`critical`, Tastatur komplett bedienbar, sichtbarer Fokus
- [ ] Vercel Web Interface Guidelines ohne offene Befunde (oder begründet in `docs/design/review.md`)
- [ ] Training bestätigen: vom Alarm **1 Tap**, von App-Start **≤ 2 Taps**
- [ ] Neue Serie anlegen in ≤ 30 s, ohne Tastatur-Hin-und-her (Zeitfelder mit nativer Auswahl)
- [ ] Hell und Dunkel, 320px bis 1440px Breite, Schriftgröße 200 %: nichts abgeschnitten, kein horizontales Scrollen
- [ ] Höchstens ein gelbes Element pro Viewport (außer Kalenderpunkten)
- [ ] Keine Hex-Werte in Komponenten, keine Emojis, keine externen Font-/CDN-Requests
