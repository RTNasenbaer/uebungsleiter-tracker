# Start-Prompt für Claude Code

> Leeres öffentliches GitHub-Repo klonen, Inhalt der ZIP hineinkopieren, in VS Code „Reopen in Container“,
> dann `claude` starten und den folgenden Text einfügen.

---

Du baust in diesem Repository den **Übungsleiter-Tracker** (Lizenz AGPL-3.0-or-later): eine Android-App (Capacitor + natives Kotlin-Alarm-Plugin), die nach jedem geplanten Volleyball-Training
auf meinem Handy einen **Vollbild-Alarm wie eine Wecker-App** zeigt („Training gehalten? Ja/Nein/Später“), plus eine
Web-App zum Verwalten der Trainings, Nachtragen, Exportieren und Erzeugen meines **Übungsleiternachweises als PDF**.
Kosten: 0 € (Cloudflare Workers + D1 Free, APK per GitHub Releases, kein Play Store, kein iOS).

**Lies zuerst vollständig `CLAUDE.md`, `docs/SPEC.md` und die Skills in `.claude/skills/`.** Die SPEC ist verbindlich;
Punkte mit [ANNAHME] übernimmst du ohne Rückfrage.

## Auftrag
Setze die Phasen 1–7 aus `docs/SPEC.md` §9 nacheinander vollständig um. Für jede Phase:
1. Task-Liste mit konkreten, prüfbaren Schritten anlegen.
2. Bei jeder Bibliothek/Plattform-API zuerst die **aktuelle** Doku lesen (Context7-MCP oder WebFetch) – besonders
   Cloudflare Workers/D1/Wrangler, Capacitor, Android Exact Alarms & Full-Screen Intents, WorkManager, Roborazzi, arctic.
3. Domänenlogik test-first.
4. Skill `verify` vollständig ausführen, Screenshots und das gerenderte Antrag-PDF selbst ansehen.
5. Conventional Commits, `git push origin dev`, PR nach `main` öffnen/aktualisieren, CI beobachten und rote Checks selbst fixen.
6. `docs/PROGRESS.md` und `docs/DECISIONS.md` aktualisieren.

## CI, die du in Phase 1/6/7 anlegst (GitHub Actions, für öffentliche Repos kostenlos)
- `ci.yml` (PR + Push): lint, check, test, build, Playwright, Android ktlint/detekt/lint, JVM-Tests, Roborazzi-Verify,
  Debug-APK als Artefakt.
- `android-emulator.yml` (PR mit Änderungen in `apps/android/**`): Instrumented-Tests auf API 34 und 35 mit
  `reactivecircus/android-emulator-runner` (KVM aktivieren laut dessen README).
- `deploy.yml` (Push auf `main`): D1-Migrationen remote + `wrangler deploy` über `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`;
  überspringen mit Hinweis, wenn Secrets fehlen.
- `release.yml` (Tag `v*`): signierte Release-APK bauen und als GitHub-Release veröffentlichen (Keystore aus Secrets).

## Autonomie
- Arbeite selbstständig durch alle Phasen. Triff normale Entwicklungsentscheidungen selbst und dokumentiere sie kurz.
- Stoppe **nur**, wenn etwas zwingend mich braucht (Accounts, GitHub-Secrets, echtes Handy, Geld, Abweichung von der SPEC).
  Dann Skill `human-step`: in `docs/HUMAN_STEPS.md` eintragen, mit Mocks weiterarbeiten, gesammelt melden.
- Alles, was du selbst kannst, machst du selbst: Dev-Secrets in `.dev.vars`, Release-Keystore + Script, das die Secrets per
  `gh secret set` setzt (ich führe es nur aus), Seeds, Workflows, README.
- Persönliche Daten aus meinem Vereinsformular (Namen, IBAN, E-Mail-Adressen) kommen nie ins Repo – nur Platzhalter.

## Besonders wichtig
- Vollbild-Alarm über dem Sperrbildschirm: `setAlarmClock` + Full-Screen-Intent + `AlarmActivity`, neustartfest,
  Online-Vorabprüfung, Antwort-Warteschlange, Einrichtungsseite mit Berechtigungs-Checks und „Test-Alarm in 1 Minute“.
- Nur das gewählte **Erinnerungsgerät** klingelt; andere Geräte zeigen die Abfrage nur in der App, wenn sie gerade offen sind.
- „+ Neu“-Formular mit Wochentag-Chips (Mo–So), Bearbeiten „nur dieser / dieser und folgende / alle“, Einzeltrainings, Ferien.
- Nachtragen der laufenden Saison (Startdatum in der Vergangenheit → offene Termine, Bulk-Bestätigung).
- Antrag-PDF nach SPEC §7 (Kalenderjahr, Monat × Trainingsgruppe(n) × Einheiten, Summe), plus CSV/XLSX/JSON.
- Cloudflare-Free-Limits beachten: keine Passwort-Hashes, Exporte clientseitig.
- `README.md` (Deutsch + kurzer englischer Teil): Features, Screenshots, Architektur, lokale Entwicklung, Deploy, APK-Installation, Lizenz.

## Abschluss
Abschlussbericht: (a) Features mit Status, (b) Testergebnisse inkl. CI-Links, (c) PR-Link, (d) alle offenen `HUMAN_STEPS`
in Reihenfolge mit Zeitaufwand – so knapp und einfach wie möglich.
