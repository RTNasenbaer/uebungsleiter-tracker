# CLAUDE.md

Übungsleiter-Tracker: Android-App mit Vollbild-Alarm nach jedem Training („Gehalten? Ja/Nein“) + Web-App zum Verwalten,
Export und Erzeugen des Übungsleiternachweises (PDF). Fachliche Details: **@docs/SPEC.md** (verbindlich).

## Stack (nicht ohne Rückfrage ändern)
- pnpm-Monorepo, TypeScript strict, Node 22 LTS
  - `packages/shared` – Domänenlogik (Termin-Generator, Zeit, Geld, Antrag-Aggregation), zod-Schemas, Typen. **Keine I/O.**
  - `apps/api` – Hono auf Cloudflare Workers, Drizzle ORM + D1, Cron Trigger. Lokal: `wrangler dev` (Miniflare, lokale D1)
  - `apps/web` – SvelteKit 2 + Svelte 5 (Runes), `adapter-static` (SPA, fallback `index.html`), Tailwind CSS v4.
    Wird vom Worker als Static Assets ausgeliefert UND in die Android-App gebündelt.
  - `apps/android` – Capacitor (Android only) + eigenes **Kotlin**-Plugin `TrainingAlarm` (Skill `android-alarm`).
    Native Teile: Kotlin, JDK 21, ktlint + detekt, Tests mit JUnit + Robolectric, Roborazzi-Screenshots der AlarmActivity.
- Auth: GitHub-OAuth mit `arctic`, Sessions selbst gebaut (Lucia-Leitfaden). **Keine Passwort-Hashes im Worker** (10-ms-CPU-Limit).
- PDF (`pdf-lib`), XLSX (`exceljs`), CSV (`papaparse`), ICS (`ical.js`) **nur clientseitig**.
- Tests: Vitest (+ `@cloudflare/vitest-pool-workers` für die API), Playwright (Web), JUnit + Robolectric (Android, JVM),
  Android Instrumented Tests im GitHub-Actions-Emulator.
- Keine kostenpflichtigen Dienste, kein Firebase/FCM, keine SaaS-APIs. Jede Dependency Open Source und kostenlos.
- Vor dem Einsatz einer Bibliothek **aktuelle Doku prüfen** (Context7-MCP oder WebFetch) – APIs ändern sich.

## Befehle (in Phase 1 genau so als Root-Scripts anlegen)
```
pnpm dev               # api (wrangler dev :8787) + web (vite :5173, Proxy /api → 8787)
pnpm build             # alle Pakete
pnpm check             # svelte-check + tsc
pnpm lint              # eslint + prettier --check
pnpm test              # vitest (shared + api + web)
pnpm test:e2e          # playwright gegen wrangler dev mit gebauter Web-App
pnpm android:build     # web build → cap sync android → ./gradlew assembleDebug
pnpm android:lint      # ./gradlew ktlintCheck detekt lintDebug
pnpm android:test      # ./gradlew testDebugUnitTest (Robolectric, kein Emulator nötig)
pnpm android:screens   # ./gradlew recordRoborazziDebug → PNGs der AlarmActivity
pnpm verify            # lint + check + test + build + test:e2e + android:lint + android:test + android:screens  ← Definition of Done
pnpm db:generate       # drizzle-kit generate
pnpm db:migrate:local  # wrangler d1 migrations apply --local
pnpm db:seed           # Testnutzer + Beispielserie „U12, Di 18:00–19:30“ seit 1.9.
```

## Regeln
- Zeit: alles über `packages/shared/src/time.ts` in `Europe/Berlin`; DST-Wechsel (letzter So im März/Okt.) testen.
  Domänencode bekommt `now` als Parameter / `Clock` injiziert – kein direktes `Date.now()`.
- Geld in Cent (int); Anzeige `Intl.NumberFormat('de-DE', {style:'currency', currency:'EUR'})`.
- Jede DB-Query filtert nach `user_id`. Antworten von Geräten sind idempotent über `occurrence_key`.
- Persönliche Daten (Name, IBAN, E-Mail-Adressen aus dem Vereinsformular) **niemals** in Code, Tests, Seeds oder Commits – nur Platzhalter.
- Test-Routen (`/api/test/*`) nur wenn `ENABLE_TEST_ROUTES=true` und `ENVIRONMENT !== 'production'`.
- UI-Texte Deutsch (Web/App: `apps/web/src/lib/i18n/de.ts`, nativer Alarm: `res/values/strings.xml`), Code/Kommentare/Commits Englisch.
- Lizenz **AGPL-3.0-or-later**: `LICENSE` im Root, SPDX-Header in jeder Quelldatei, „Über“-Seite mit Quellcode-Link
  in Web und App. Neue Dependencies auf AGPL-Kompatibilität prüfen.
- Kotlin (Plugin): Coroutines, Zeit über `java.time` mit `ZoneId.of("Europe/Berlin")` und injizierter `Clock`.
- Web-App muss im normalen Browser ohne native Funktionen laufen: Plugin-Aufrufe nur über `apps/web/src/lib/native/` mit No-op-Fallback.
- Mobile-first, Touch-Ziele ≥ 48 dp, WCAG AA.

## Arbeitsweise
1. Pro Aufgabe Task-Liste, kleine Schritte. Domänenlogik **test-first**.
2. Nach jedem Schritt betroffene Tests; vor jedem Commit Skill **`verify`** (inkl. Screenshots ansehen).
3. Conventional Commits. Branch `dev`; nach jeder Phase: `git push origin dev`, PR nach `main` öffnen/aktualisieren,
   `gh pr checks` beobachten, rote CI selbst fixen. Nie selbst nach `main` mergen.
4. Entscheidungen kurz in `docs/DECISIONS.md` (ADR-Stil), Fortschritt in `docs/PROGRESS.md`.

## Nicht tun
- Keine Secrets lesen/ausgeben/committen (`.env*`, `.dev.vars`, `*.jks`, `*.keystore`, `keystore.properties`).
  Dev-Secrets erzeugst du selbst in `.dev.vars` (gitignored) ohne sie auszugeben.
- Keine Tests löschen/abschwächen/skippen, um grün zu werden. Kein `--no-verify`, kein Force-Push, keine History-Rewrites.
- Kein `wrangler deploy` / `wrangler d1 … --remote` lokal – Deployment läuft nur über GitHub Actions.
- Nicht um Erlaubnis für normale Entwicklungsarbeit fragen.

## Wann stoppen?
Nur wenn es zwingend den Menschen braucht (Accounts/Logins, Secrets in GitHub hinterlegen, echtes Handy, Geld,
Entscheidung gegen die SPEC). Dann Skill **`human-step`**: in `docs/HUMAN_STEPS.md` eintragen, mit Mocks weiterarbeiten,
am Phasenende gesammelt melden. Bei [ANNAHME]n in der SPEC: Default nehmen.
