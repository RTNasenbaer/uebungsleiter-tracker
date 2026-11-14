# Fortschritt

Stand: 2026-11-14

| Phase           | Inhalt                                                                                                                      | Status                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1 Fundament     | pnpm-Monorepo, TS strict, ESLint/Prettier, Vitest, Playwright, CI, Wrangler + lokale D1, Drizzle-Schema/Migration, Seed     | ✅                                        |
| 2 Auth & Geräte | GitHub-OAuth (arctic), Sessions (Lucia-Stil, 60 Tage rolling), Allowlist, Test-Login, Geräte, Pairing (QR/Code, Rate-Limit) | ✅ (echter GitHub-Login wartet auf HS-03) |
| 3 Domäne        | Generator (Wochentage, 2-wöchentlich, Ferien, Vergangenheit, DST, Overrides, Split), CRUD, Offen-Liste, Bulk, Cron          | ✅                                        |
| 4 Web-UI        | Start, Offen, Kalender, Termine, Trainings, „+ Neu“, Ausfälle, Einstellungen, Geräte, In-App-Abfrage, Über                  | ✅                                        |
| 5 Export/Import | Antrag-PDF, CSV, XLSX, JSON-Backup, Import mit Duplikatprüfung, `.ics`-Ferien                                               | ✅                                        |
| 6 Android       | Capacitor, Kotlin-Plugin `TrainingAlarm`, Einrichtungsseite, Pairing, Sync-Worker, Antwort-Queue, Teilen-Dialog, Tests      | ✅ (Test auf echtem Handy: HS-06)         |
| 7 Betrieb       | Deploy-, Release-, Backup-Workflow, Keystore-Scripts, README, HUMAN_STEPS                                                   | ✅ (Secrets: HS-02–HS-04)                 |

## Tests (lokal)

- `packages/shared`: 42 Vitest-Tests (Zeit/DST, Geld, Generator, Split, Alarmzeit/Ruhezeit, Antrag, CSV-Mapping)
- `apps/api`: 45 Tests im workerd mit lokaler D1 (Auth, Allowlist, Isolation A/B, Pairing, Alarmgerät, Idempotenz, Cron, …)
- `apps/web`: 6 Tests (CSV mit BOM, XLSX zurücklesen, ICS, PDF-Text via pdf.js)
- E2E: 9 Flows × Chromium Desktop + Pixel 7 lokal grün (Firefox/WebKit/iPhone in der CI), axe ohne serious/critical
- Android: 34 JVM-Tests (Robolectric) + 3 Roborazzi-Screenshots; Instrumented-Test (Sperrbildschirm) läuft im CI-Emulator

## Offene Punkte / Ideen (Phase 8)

- Design-Überarbeitung, eigene Domain, Telegram-/E-Mail-Fallback
- Repo-Dateisystem: Der Devcontainer liegt auf einem Windows-Laufwerk (9p) → Tools sind langsam. Schneller:
  VS Code „Dev Containers: Clone Repository in Container Volume“.
