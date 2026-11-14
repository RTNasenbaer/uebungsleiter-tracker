# Entscheidungen (ADR-Kurzform)

## ADR-001 Versionen (2026-11-14)

SvelteKit **2.70** (nicht 3.x – CLAUDE.md legt SvelteKit 2 fest), Svelte 5, Vite 8, TypeScript **5.9** (TS 7 wird von
svelte-check/typescript-eslint noch nicht unterstützt), Vitest **4.1** (Peer-Dependency des Cloudflare-Test-Plugins),
Tailwind 4.3, Capacitor 8.6, Kotlin 2.2.20 / AGP 8.13 / Gradle 8.14.3 (Capacitor-8-Vorgaben), JDK 21.

## ADR-002 `@cloudflare/vitest-plugin` statt `@cloudflare/vitest-pool-workers`

`@cloudflare/vitest-pool-workers` ist als _deprecated_ markiert und wurde in `@cloudflare/vitest-plugin` umbenannt
(gleiches Projekt, gleiche Lizenz MIT). Wir nutzen den Nachfolger; Funktion identisch (Tests im workerd mit lokaler D1).

## ADR-003 Zeitstempel als ISO-Text, Datum/Zeit als lokale Strings

D1/SQLite: `created_at`, `answered_at` … als ISO-8601-UTC-Text (sortierbar, lesbar). `date`/`start_time` sind
Europe/Berlin-Wandzeit (`YYYY-MM-DD`, `HH:MM`). Umrechnung nur in `packages/shared/src/time.ts` (Intl, DST-sicher:
Lücke im März → nach vorne verschoben, Doppelstunde im Oktober → erste Stunde).

## ADR-004 Lazy Materialisierung + „gelöschte“ Serientermine

Serientermine werden beim Abruf eines Zeitraums erzeugt (`INSERT … ON CONFLICT DO NOTHING`, 4 Zeilen/Statement wegen
100-Parameter-Limit von D1). Ein einzeln „gelöschter“ Serientermin wird deshalb **nicht gelöscht, sondern `cancelled` +
`is_override`**, sonst käme er bei der nächsten Materialisierung zurück.

## ADR-005 „Dieser und alle folgenden“

Alte Serie endet am Vortag, neue Serie (neue ID) beginnt am Datum. Unbeantwortete, nicht überschriebene Termine ab dem
Datum werden gelöscht und von der neuen Serie neu erzeugt; beantwortete/überschriebene werden auf die neue Serie
umgeschlüsselt (`<neue_id>:<datum>`), damit keine Duplikate entstehen.

## ADR-006 In-App-Abfrage

Fällig 2 min vor dem Handy-Alarm (SPEC §4.4: Handy klingelt 2 min nach der In-App-Abfrage). **[ANNAHME]** Der Dialog
zeigt nur Termine der letzten 48 h; ältere offene Termine stehen in „Offen“ (sonst würde ein Nachtragen mit 20 Terminen
20 Dialoge auslösen). „Später“ setzt `snoozed_until` (30 min); der Handy-Alarm respektiert das über den Online-Check.

## ADR-007 Test-Zeit für E2E

Im Testmodus (`ENABLE_TEST_ROUTES=true` und nicht Produktion) akzeptiert der Worker den Header `x-test-now`.
Playwright friert die Browser-Uhr ein (`page.clock`), die Web-App sendet dann (nur wenn `localStorage['ult:test-now']`
gesetzt ist) dieselbe Zeit mit → deterministische Tests/Screenshots (Di, 10.11.2026). In Produktion wird der Header ignoriert.

## ADR-008 Android: Antwort-Warteschlange ohne Room

Statt Room (KSP-Plugin, zusätzliche Versionskopplung) speichert `AnswerQueue` die wenigen offenen Antworten als JSON in
SharedPreferences (synchronisiert, pro `occurrence_key` nur die letzte Antwort). Upload über WorkManager
(Netz-Constraint, exponentieller Backoff); der Server ist idempotent (neuere `answered_at` gewinnt).

## ADR-009 Android: Token-Verschlüsselung selbst mit Keystore

`androidx.security:security-crypto` (EncryptedSharedPreferences) ist abgekündigt. Das Device-Token wird mit einem
nicht exportierbaren AES-256-GCM-Schlüssel im Android Keystore verschlüsselt (`KeystoreTokenCipher`).

## ADR-010 Android: Views statt Compose für die AlarmActivity

Klassische Views (MaterialButton) halten den Build schlank (kein Compose-Compiler). Roborazzi erfasst Views genauso.
minSdk 26 (Skill), Klartext-HTTP nur im Debug-Build für localhost/10.0.2.2 (MockWebServer, Dev-Server).

## ADR-011 Pairing per QR-URL

Der QR-Code enthält `https://<server>/koppeln#server=<url>&code=<CODE>`. Die App liest Server + Code daraus;
eine normale Kamera-App landet auf einer Hinweisseite. Ein Code ist 5 min gültig und einmalig; Einlösen ist
pro IP auf 10 Versuche / 15 min begrenzt. Das erste gekoppelte Handy wird automatisch Erinnerungsgerät.

## ADR-012 Backups verschlüsselt

Das Repo ist öffentlich, Actions-Artefakte sind für angemeldete GitHub-Nutzer abrufbar. Der wöchentliche D1-Export wird
deshalb mit `BACKUP_PASSPHRASE` (AES-256, PBKDF2) verschlüsselt, bevor er als Artefakt (90 Tage) gespeichert wird –
**nicht** als öffentliches Release-Asset. Zusätzlich gibt es D1 Time Travel.

## ADR-013 Lokale Browser für E2E

Im Devcontainer fehlen die Systembibliotheken für Firefox/WebKit (Installation bräuchte root). Lokal laufen
`chromium-desktop` und `mobile-android` (`E2E_BROWSERS=…`, fehlende Chromium-Libs per `apt-get download` nach
`~/.cache/pw-libs` + `LD_LIBRARY_PATH`); alle 5 Projekte laufen in der CI (`playwright install --with-deps`).
