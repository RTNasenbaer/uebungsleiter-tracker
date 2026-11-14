---
name: verify
description: Vollständige Prüfung vor jedem Commit oder Phasenabschluss – Lint, Typecheck, Unit-Tests (shared/api/web/android), Build, Playwright-E2E mit Screenshot-Kontrolle, Android-Build und CI-Ergebnis. Nutzen, wenn eine Änderung fertig ist oder "verify", "testen", "prüfen" gesagt wird.
---

# verify

Ziel: Nachweisen, dass alles funktioniert – ohne Zutun des Menschen.

## 1. Statisch
`pnpm lint && pnpm check` – Fehler beheben, nicht unterdrücken (kein `@ts-ignore`, kein `eslint-disable` ohne Begründung).

## 2. Unit/Integration
`pnpm test`. Pflicht-Abdeckung bei Änderungen in diesen Bereichen:
- Generator (`packages/shared`): mehrere Wochentage, 2-wöchentlich, Start in Vergangenheit, Ende, Ausnahmen, Overrides,
  „dieser und folgende“-Split, DST März/Oktober, Idempotenz (gleicher `occurrence_key`).
- Antrag-Aggregation: Einheiten pro Monat nur `held` (bzw. inkl. geplanter bei Option), Gruppen je Monat, Summe, Kalenderjahr-Grenzen.
- API (vitest-pool-workers, lokale D1): Auth-Pflicht, Allowlist, Nutzer A sieht nie Daten von B, Pairing-Code einmalig + Ablauf,
  Device-Token, idempotentes `answer`, nur ein `is_alarm_device`, Cron-Handler.
- Export: CSV mit BOM/Semikolon/Umlauten; XLSX mit exceljs zurücklesen; PDF mit pdf-lib zurücklesen und Texte (Monate, Summe) prüfen.

## 3. Build
`pnpm build` und `pnpm android:build` (Debug-APK muss entstehen).

## 4. Android (Kotlin)
`pnpm android:lint && pnpm android:test && pnpm android:screens`
- Plugin-Tests (Skill `android-alarm`), Sync/Upload gegen MockWebServer.
- Roborazzi-Screenshots der AlarmActivity (hell + dunkel, Schriftgröße 1.3×) **ansehen**.
- Die App-Oberfläche selbst ist die Web-App → wird über Playwright (`mobile-android`) mitgetestet.

## 5. Web-E2E (Playwright)
`pnpm test:e2e` mit Projekten `chromium-desktop`, `firefox-desktop`, `webkit-desktop`, `mobile-android` (Pixel 7), `mobile-safari` (iPhone 15).
Login über `/api/test/login`. Pflicht-Flows:
- Neu → Serie „U12, Di+Do 18:00–19:30, seit 1.9.“ → Offen-Liste zeigt nachgetragene Termine → Bulk „gehalten“
- Einzeltermin bearbeiten; Serientermin „nur dieser“ vs. „dieser und folgende“
- Ferien anlegen → keine Termine in dem Zeitraum
- In-App-Abfrage erscheint bei fälligem Termin (Uhr per `page.clock` / Test-Route vorstellen) → Ja
- Geräte: Erinnerungsgerät umschalten; Pairing-Code erzeugen
- Antrag-PDF herunterladen und Inhalt prüfen; CSV/XLSX-Download prüfen; Import mit Duplikat
- `@axe-core/playwright`: keine `serious`/`critical` Verstöße

## 6. Visuelle Kontrolle
Screenshots geänderter Seiten (`test-results/screens/`, Desktop 1280×800, Pixel 7, iPhone 15) erzeugen und **mit dem
Read-Tool ansehen**: nichts abgeschnitten/überlappend, Touch-Ziele groß genug, deutsche Texte, `15,00 €`, `Di, 11.11.2026`.
Antrag-PDF zusätzlich als PNG rendern (`pdftoppm`) und ansehen – muss dem Vereinsformular entsprechen (SPEC §7).

## 7. CI
Nach Push: `gh pr checks --watch` bzw. `gh run view --log-failed`. Instrumented-Android-Tests laufen nur im CI-Emulator –
deren Ergebnis gehört zur Definition of Done jeder Android-Änderung.

## 8. Bericht
Kurz: geprüft / gefixt / offen. Kann ein Schritt umgebungsbedingt nicht laufen: Ursache einmal untersuchen,
Alternative nutzen (z. B. CI statt lokalem Emulator), erst dann Skill `human-step`. Nie still überspringen.
