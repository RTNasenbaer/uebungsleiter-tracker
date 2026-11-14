# SPEC – Übungsleiter-Tracker (Arbeitstitel)

> Fachliche Spezifikation, Quelle der Wahrheit für Claude Code.
> **[ANNAHME]** = Default, den der Nutzer noch ändern kann. Claude Code übernimmt Defaults ohne Rückfrage.

## 1. Ziel & Rahmen

Nach jedem geplanten Training öffnet sich auf **einem ausgewählten Android-Gerät** ein **Vollbild-Alarm wie bei einer
Wecker-App** (auch über dem Sperrbildschirm): „U12 Training gehalten? JA / NEIN / Später“. Die Antwort wird als
Nachweis gespeichert. Alle Daten sind über eine **Web-App** (PC, Tablet, iPhone-Browser) und die **Android-App**
einsehbar und bearbeitbar. Am Jahresende erzeugt die App den **Übungsleiternachweis als PDF** im Format des Vereins.

- Plattformen: **Android-App (Sideload-APK, kein Play Store)** + **Web-App**. Kein iOS-App-Build (iPhone nutzt die Website).
- Ein Nutzer zu Beginn, mehrere Nutzer technisch möglich (alle Daten mit `user_id`).
- Keine laufenden Kosten: Cloudflare Workers + D1 im Free-Plan, `*.workers.dev`-Subdomain (eigene Domain optional).
- Open Source, öffentliches GitHub-Repo, **Lizenz: AGPL-3.0-or-later** (entschieden). Folge: Web-App und Android-App
  zeigen unter „Über“ einen Link zum Quellcode (AGPL §13); jede Quelldatei bekommt einen SPDX-Header
  `SPDX-License-Identifier: AGPL-3.0-or-later`; alle Dependencies müssen AGPL-kompatibel sein (MIT/BSD/Apache-2.0/LGPL ok).
- UI Deutsch, Zeitzone `Europe/Berlin` (Sommer-/Winterzeit!), Geld in Cent.
- Funktion vor Design; Design-Tokens trotzdem sauber anlegen.

## 2. Architektur

```
┌─────────────── Cloudflare (Free) ───────────────┐
│ 1 Worker:  Hono-API  /api/*                     │
│            + Static Assets (Web-App, SPA)       │
│            + Cron Trigger (stündlich)           │
│ D1 (SQLite) ← Drizzle ORM                       │
└─────────────────────────────────────────────────┘
      ▲ HTTPS (Cookie-Session)      ▲ HTTPS (Bearer-Device-Token)
 Browser (PC/Tablet/iPhone)     Android-App = Capacitor-Hülle um dieselbe Web-App (eine Oberfläche für alles)
                                 + natives Kotlin-Plugin „TrainingAlarm“
                                   (AlarmManager.setAlarmClock + Full-Screen-AlarmActivity, WorkManager)
```

Sprachen: Web, App-Oberfläche und Backend in **TypeScript** (eine Codebasis, gemeinsame Typen). Nur das Alarm-System
ist nativ in **Kotlin**, weil Vollbild-Alarme über dem Sperrbildschirm nicht aus einer WebView heraus möglich sind.

Kernidee: **Alarme werden lokal auf dem Android-Gerät geplant**, nicht per Server-Push. Vorteile: funktioniert offline
und bei Server-Ausfall, kein Firebase/FCM nötig, kein Server-Scheduler für Benachrichtigungen. Der Server speichert nur Daten.

Wichtige Free-Plan-Grenzen (Cloudflare Workers): 100.000 Requests/Tag, **10 ms CPU pro Request**. Konsequenzen:
- **Keine Passwort-Hashes auf dem Server** (scrypt/argon2 sprengen 10 ms) → Login per GitHub-OAuth + Geräte-Kopplung (§6).
- PDF/XLSX/CSV-Erzeugung und Import-Parsing **im Client** (Browser bzw. WebView der App), nicht im Worker.
  In der App werden Dateien über den Android-Teilen-Dialog / Downloads gespeichert (`@capacitor/filesystem` + `@capacitor/share`).
- Session-/Device-Tokens: 256 Bit Zufall, in DB nur als SHA-256 gespeichert (billig und bei hoher Entropie sicher).

## 3. Datenmodell (D1/SQLite, Drizzle)

Alle Tabellen: `id` (text uuid), `user_id`, `created_at`, `updated_at`. Datum `YYYY-MM-DD`, Uhrzeit `HH:MM` lokal.

### `series` – wiederkehrende Trainings („Dauer-Trainings“)
| Feld | Beschreibung |
|---|---|
| title | Training, z. B. „Training“ / „Techniktraining“ |
| team | Mannschaft / Trainingsgruppe, z. B. „U12“ (erscheint im Antrag) |
| location | Ort |
| weekdays | Bitmaske Mo–So (mehrere Tage möglich) |
| start_time, end_time | |
| interval_weeks | 1 = jede Woche, 2 = alle zwei Wochen |
| starts_on, ends_on? | Gültigkeit; `starts_on` darf in der Vergangenheit liegen (Nachtragen) |
| units | Einheiten pro Termin, Default 1 (Antrag zählt „Trainingseinheiten 90–120 min“) |
| pay_cents | Default 1500 |
| alarm_offset_min | Default 10 → Alarm 10 min nach Ende |
| color, active | |

### `sessions` – konkrete Termine (Nachweis)
| Feld | Beschreibung |
|---|---|
| occurrence_key | `"<series_id>:<date>"` bei Serien, sonst `"single:<uuid>"`; **unique pro user** → idempotente Upserts von allen Geräten |
| series_id? | null bei Einzeltraining |
| date, start_time, end_time, title, team, location, units, pay_cents | Snapshot; einzeln überschreibbar |
| is_override | true, wenn dieser Serientermin individuell geändert wurde |
| status | `planned` → `pending` → `held` \| `not_held` \| `cancelled` (Termin fällt aus, vorab markiert) |
| kind | `training` \| `match` \| `tournament` \| `other` |
| note? | z. B. „Vertretung“ |
| answered_at, answered_via, answered_device_id | via: `alarm` \| `app` \| `web` \| `bulk` \| `auto` |
| snoozed_until? | |

Termine werden **lazy materialisiert**: Ein API-Aufruf für einen Zeitraum erzeugt fehlende Sessions aus den Serien
(Ausnahmen beachten). Der Cron-Trigger materialisiert stündlich bis heute + 28 Tage und setzt vergangene `planned` auf `pending`.
Änderungen an einer Serie ändern nur zukünftige, nicht überschriebene, unbeantwortete Termine.

### `exceptions` – Ferien / Ausfälle / Hallensperrung
`from_date, to_date, label, series_id?` (null = alle). Keine Termine, kein Alarm. Import aus `.ics` (clientseitig geparst).

### `devices`
`name` („Pixel 8“, „PC Browser“), `platform` (`android`\|`web`), `token_hash` (nur Android), `last_seen_at`,
`is_alarm_device` (**höchstens eines pro Nutzer**), `app_version`.

### `profile` / `settings` (1 Zeile pro Nutzer)
| Feld | Default |
|---|---|
| display_name („Name, Vorname“ für Antrag) | leer |
| iban (optional, nur für Antrag-PDF) | leer → im PDF Linie zum Handausfüllen |
| club_name | leer |
| report_intro_template | Text mit Platzhaltern `{jahr}`, `{frist}`, `{empfaenger}` (Default siehe §7) |
| report_recipient, report_deadline (MM-DD) | leer, `12-15` |
| default_pay_cents | 1500 |
| tax_free_limit_cents | 330000 (Übungsleiterpauschale 2026, editierbar) |
| auto_confirm_after_hours | null = aus („Nur Ausnahmen melden“-Modus, wenn gesetzt z. B. 48) |
| alarm_sound, alarm_vibrate, alarm_ring_seconds, snooze_minutes | system default, true, 60, 30 |
| quiet_hours | 22:00–07:00 (Alarm wird auf Ende der Ruhezeit verschoben) |

### `auth_sessions`, `oauth_accounts`, `pairing_codes`
Siehe §6.

## 4. Abläufe

### 4.1 Neues Training (Button „+ Neu“, überall erreichbar)
Formular: Training · Mannschaft · Datum (bzw. Startdatum) · von–bis · Ort · Einheiten · Vergütung ·
**Wiederholen** (Schalter) → Wochentag-Chips **Mo Di Mi Do Fr Sa So**, „jede / alle 2 Wochen“, Ende (nie / am Datum).
Liegt das Startdatum in der Vergangenheit: Hinweis „X vergangene Termine werden zum Nachtragen angelegt“.

### 4.2 Bearbeiten
- Einzeltermin antippen → bearbeiten (Zeit, Ort, Status, Notiz, Vergütung, Einheiten).
- Bei Serienterminen fragt der Dialog: **„Nur dieser Termin“ / „Dieser und alle folgenden“ / „Alle Termine der Serie“**
  (wie Google Kalender). „Dieser und folgende“ = Serie am Vortag beenden + neue Serie ab diesem Datum.
- Serie löschen: beantwortete Termine bleiben erhalten (Nachweis!), nur künftige werden entfernt.
- Termin vorab als „fällt aus“ markieren → kein Alarm.

### 4.3 Alarm auf dem Erinnerungsgerät (Android, nativ)
1. Die App holt beim Start, nach jeder Änderung und per WorkManager alle 6 h die Termine der nächsten 14 Tage
   und übergibt sie dem Plugin: `TrainingAlarm.setAlarms([{key, triggerAt, title, subtitle}])`.
   Nur wenn dieses Gerät `is_alarm_device` ist; sonst `clearAll()`.
2. Das Plugin plant **`AlarmManager.setAlarmClock()`** (zuverlässig auch im Doze-Modus) und speichert die Liste lokal
   (für Neustart: `BOOT_COMPLETED`, `TIME_SET`, `TIMEZONE_CHANGED`, `MY_PACKAGE_REPLACED` → neu planen).
3. Beim Auslösen: kurzer Online-Check (max. 3 s), ob der Termin schon beantwortet/abgesagt ist → dann still verwerfen.
   Offline → trotzdem klingeln.
4. Notification mit **Full-Screen-Intent** → `AlarmActivity` (`showWhenLocked`, `turnScreenOn`), Ton + Vibration,
   große Buttons **JA, gehalten** / **NEIN** / **Später (30 min)**, optional Notiz.
5. Klingeln endet nach `alarm_ring_seconds` → es bleibt eine dauerhafte Benachrichtigung mit Ja/Nein-Aktionen;
   Erinnerungs-Alarm nach 12 h (max. 2×, nicht in Ruhezeiten).
6. Antwort → lokale Warteschlange → WorkManager (Netz-Constraint, Retry) → `POST /api/sessions/answer`
   `{occurrence_key, status, answered_at, note}` mit Device-Token. Idempotent.

### 4.4 In-App-Abfrage auf anderen Geräten
Ist die App/Website auf irgendeinem Gerät gerade **im Vordergrund**, wenn ein Termin fällig wird (oder es offene Termine
gibt), erscheint dort ein Dialog „Training gehalten?“. Kein System-Push auf Nicht-Erinnerungsgeräten.
(Polling jede Minute, solange sichtbar; nach Antwort synchronisieren die anderen Geräte beim nächsten Abruf.)
Das Erinnerungsgerät klingelt 2 min nach der In-App-Abfrage und prüft vorher online (4.3 Schritt 3) –
wer am PC schon geantwortet hat, wird am Handy nicht mehr geweckt.

### 4.5 Nachtragen & Offen-Liste
Seite „Offen“: alle `pending` (inkl. nachgetragener Vergangenheit), Mehrfachauswahl, „Alle markierten: gehalten / nicht gehalten“.
Badge mit Anzahl offener Termine in der Navigation.

### 4.6 Auto-Bestätigung (optional) & Cron
Stündlicher Cron: Materialisieren, `planned`→`pending`, ggf. Auto-Bestätigen (`answered_via='auto'`), abgelaufene Pairing-Codes/Sessions löschen.

### 4.7 Antrags-Erinnerung
Ab 1.12. (bzw. 14 Tage vor `report_deadline`) Banner „Übungsleiternachweis bis 15.12. abgeben“ + ein Alarm/Benachrichtigung
am Erinnerungsgerät (einfache Notification, kein Vollbild).

## 5. Seiten

| Route | Inhalt |
|---|---|
| Start | Offene Termine (prominent), nächstes Training, Summen Monat/Jahr, Fortschritt Freibetrag, Button „Antrag erstellen“ |
| Kalender | Monatsansicht farbig nach Status; Listenansicht auf dem Handy; Tag antippen → Termine |
| Termine | Tabelle mit Filtern (Zeitraum, Status, Mannschaft), Bearbeiten, Mehrfachauswahl |
| Trainings | Serien verwalten (+ Neu, bearbeiten, beenden) |
| Ausfälle | Ferien/Ausfälle, `.ics`-Import |
| Export | Antrag-PDF (Jahr wählen, Vorschau), CSV, XLSX, JSON-Backup, Import (CSV/XLSX/JSON mit Vorschau und Duplikatprüfung über `occurrence_key`/Datum+Zeit) |
| Geräte | Geräteliste, **Erinnerungsgerät festlegen** (Radio), Gerät koppeln (QR + Code), Gerät entfernen |
| Einstellungen | Profil (Name, IBAN, Verein, Antrag-Text, Frist), Vergütung, Freibetrag, Auto-Bestätigen, Ruhezeiten |
| (nur Android) Alarm-Einrichtung | Checkliste mit Status + Buttons, die direkt in die jeweilige Systemeinstellung springen: Benachrichtigungen, Vollbild-Benachrichtigungen, Exakte Alarme, Akku-Optimierung aus, **„Test-Alarm in 1 Minute“** |

## 6. Login & Geräte

- **Web:** „Mit GitHub anmelden“ (OAuth, kostenlos; Bibliothek `arctic`). Sessions selbst implementiert nach dem
  Lucia-Leitfaden (zufälliges Token, SHA-256 in `auth_sessions`, Cookie `HttpOnly; Secure; SameSite=Lax`, 60 Tage rolling).
- **Zugriff beschränkt:** Env `ALLOWED_GITHUB_IDS` (kommagetrennt). Andere GitHub-Nutzer werden abgewiesen.
  Für weitere Nutzer später einfach IDs ergänzen.
- **Android-Gerät koppeln:** Web → Geräte → „Gerät koppeln“ zeigt QR-Code + 8-stelligen Code (5 min gültig, einmalig).
  App scannt/tippt ein → erhält Device-Token (Bearer), sicher gespeichert (Android Keystore / EncryptedSharedPreferences).
  Der Token ist auch dem nativen Plugin bekannt (für Antworten direkt aus dem Alarm).
  QR-Scan in der WebView mit `@zxing/browser` (Kamera über getUserMedia) – kein Google ML Kit, damit alles quelloffen bleibt;
  alternativ Code eintippen.
- Dev/Test: Route `/api/test/login` nur wenn `ENABLE_TEST_ROUTES=true` und **nicht** in Produktion (Build-Flag + Env).
- Security-Header, CORS nur für Web-Origin + Capacitor-Origin (`https://localhost`), zod-Validierung aller Eingaben,
  jede Query mit `user_id`, Rate-Limit auf Pairing-Code-Eingabe.
- **Keine Daten über Kinder** speichern.

## 7. Übungsleiternachweis (PDF, clientseitig mit `pdf-lib`)

Nachbau des Vereinsformulars (A4, eine Seite):

```
Übungsleiternachweis {jahr}
für
Name, Vorname: {display_name oder Punktlinie}
Kontoverbindung IBAN: {iban oder Punktlinie}

{report_intro_template}    Default: "Liebe Übungsleiterinnen und Übungsleiter, ich bitte Euch, nachfolgende
                            Tabelle auszufüllen und mir bis {frist} per Mail an {empfaenger} zuzuschicken. …"
┌───────────────────────┬──────────────────────┬──────────────────────────────┐
│ Monat Kalenderjahr {j}│ Trainingsgruppe(n)   │ Trainingseinheiten (90–120   │
│                       │                      │ Minuten) pro Monat           │
├───────────────────────┼──────────────────────┼──────────────────────────────┤
│ Januar … Dezember     │ Teams (kommagetrennt)│ Summe units (status = held)  │
│                       │               Summe: │ Gesamtsumme                  │
└───────────────────────┴──────────────────────┴──────────────────────────────┘
```

- Abrechnung nach **Kalenderjahr** (nicht Saison).
- Option „Geplante Termine bis 31.12. mitzählen“ (weil Abgabe am 15.12.) – standardmäßig aus, dann Hinweis im UI.
- Persönliche Daten (Name, IBAN, Empfänger-E-Mail) **nie im Repo**, nur in den Nutzereinstellungen.
- Zusätzlich: Detail-Anhang als zweite Seite optional (alle Termine mit Datum, Zeit, Gruppe, Ort).

CSV (Semikolon, UTF-8 mit BOM): `Datum;Wochentag;Beginn;Ende;Training;Mannschaft;Ort;Art;Einheiten;Status;Vergütung (€);Notiz`.
XLSX (exceljs, clientseitig): Blatt „Termine“ + Blatt „Monatsübersicht“ (wie Antrag) + Summen.

## 8. Nicht-Ziele (vorerst)
iOS-App, Play Store, Server-Push/FCM, Zahlungen, Anwesenheitslisten, mehrere Vereine/Admin-Rollen.

## 9. Phasen

1. **Fundament:** pnpm-Monorepo (`apps/web`, `apps/api`, `apps/android` via Capacitor, `packages/shared` für Domänenlogik/Typen),
   Lint/Format/Typecheck, Vitest, Playwright, GitHub Actions CI, Wrangler + lokale D1, Drizzle-Schema + Migrationen, Seed.
2. **Auth & Geräte:** GitHub-OAuth, Sessions, Allowlist, Test-Login, Geräte, Pairing.
3. **Domäne:** Serien/Termine/Ausnahmen, Generator in `packages/shared` (Tests: Wochentage, 2-wöchentlich, Ferien,
   Vergangenheit, DST, Overrides, „dieser und folgende“), API-CRUD, Offen-Liste, Bulk.
4. **Web-UI:** Start, Kalender, Termine, Trainings (+ Neu-Formular mit Wochentag-Chips), Ausfälle, Einstellungen, Geräte, In-App-Abfrage.
5. **Export/Import:** Antrag-PDF, CSV, XLSX, JSON-Backup, Import, `.ics`-Ferienimport.
6. **Android:** Capacitor-Projekt (nur Android), Kotlin-Plugin `TrainingAlarm` (Skill `android-alarm`), Alarm-Einrichtungs-Seite,
   Pairing per QR/Code, Sync-Worker, Antwort-Warteschlange, Datei-Export über Teilen-Dialog; JVM-Unit-Tests (Robolectric) + Instrumented-Tests im CI-Emulator;
   signierte Release-APK als GitHub-Release.
7. **Betrieb:** Deploy-Workflow (GitHub Actions → `wrangler deploy` + D1-Migrationen bei Push auf `main`),
   Cron, wöchentliches D1-Backup (Export als Release-Artefakt / Time Travel nutzen), README, `docs/HUMAN_STEPS.md`.
8. **Später:** Design-Überarbeitung, Telegram-/E-Mail-Fallback, eigene Domain, optional Node/Docker-Selfhost-Variante.

Jede Phase endet mit grünem `pnpm verify` (+ grüner CI) und Commit(s).
