# Schritte, die nur du machen kannst

Alles kostet **0 €**. Reihenfolge einhalten. Nach jedem Schritt `[x]` setzen.

## [X] HS-01: PR nach `main` mergen (⏱ ~2 min · blockiert: Deploy)

**Warum:** Ich merge nie selbst nach `main`.
**Schritte:**

1. GitHub → Repository → „Pull requests“ → PR „Übungsleiter-Tracker: Phasen 1–7“ öffnen.
2. Warten, bis die Checks grün sind → „Merge pull request“ → „Confirm merge“.

**Erwartet:** Der Workflow „Deploy“ läuft an und meldet „Deploy übersprungen“, bis HS-02 erledigt ist.

## [X] HS-02: Cloudflare-Konto + API-Token (⏱ ~10 min · blockiert: Website online)

**Warum:** Ich kann keine Konten anlegen.
**Schritte:**

1. https://dash.cloudflare.com/sign-up → kostenloses Konto anlegen (E-Mail bestätigen). Kein Zahlungsmittel nötig.
2. Rechts oben Profil → „My Profile“ → „API Tokens“ → „Create Token“ → Vorlage **„Edit Cloudflare Workers“** → „Use template“.
3. Unter „Permissions“ zusätzlich hinzufügen: **Account → D1 → Edit**. „Account Resources“: dein Konto. „Continue to summary“ → „Create Token“ → Token kopieren.
4. Dashboard → „Workers & Pages“ einmal öffnen; falls gefragt, eine `workers.dev`-Subdomain wählen (z. B. dein Name).
   Rechts „Account ID“ kopieren.
5. GitHub → Repository → Settings → Secrets and variables → Actions → „New repository secret“:
   - `CLOUDFLARE_API_TOKEN` = Token aus Schritt 3
   - `CLOUDFLARE_ACCOUNT_ID` = ID aus Schritt 4
6. GitHub → Actions → „Deploy“ → „Run workflow“.

**Erwartet:** Workflow grün; im Log steht die Adresse `https://uebungsleiter-tracker.<dein-name>.workers.dev`.
**Rückmeldung an Claude:** „HS-02 ok“ + die Adresse.

## [X] HS-03: GitHub-Login einrichten (⏱ ~5 min · blockiert: Anmelden auf der Website)

**Schritte:**

1. https://github.com/settings/developers → „OAuth Apps“ → „New OAuth App“:
   - Application name: `Übungsleiter-Tracker`
   - Homepage URL: `https://uebungsleiter-tracker.<dein-name>.workers.dev`
   - Authorization callback URL: `https://uebungsleiter-tracker.<dein-name>.workers.dev/api/auth/github/callback`
2. „Register application“ → Client ID kopieren → „Generate a new client secret“ → kopieren.
3. Deine GitHub-User-ID: im Browser `https://api.github.com/users/<dein-github-name>` öffnen → Zahl bei `"id"`.
4. Repository-Secrets anlegen (wie in HS-02):
   - `GH_OAUTH_CLIENT_ID`, `GH_OAUTH_CLIENT_SECRET`, `ALLOWED_GITHUB_IDS` (= deine ID)
5. Repository → Settings → Secrets and variables → Actions → Tab **„Variables“** → `APP_URL` = deine workers.dev-Adresse (ohne `/` am Ende).
6. Actions → „Deploy“ → „Run workflow“.

**Erwartet:** Website öffnen → „Mit GitHub anmelden“ → du landest auf „Start“.

## [X] HS-04: Release-Schlüssel hochladen (⏱ ~3 min · blockiert: APK)

**Warum:** Secrets in GitHub darf nur du setzen. Den Schlüssel habe ich schon erzeugt (Ordner `release-keystore/`, nicht im Git).
**Schritte (im VS-Code-Terminal im Container):**

```bash
bash scripts/set-release-secrets.sh
```

Danach den Ordner `release-keystore/` sichern (z. B. als ZIP in den Passwortmanager oder auf einen USB-Stick).
**Ohne diesen Schlüssel kann die App später nicht aktualisiert werden.** `backup-passphrase.txt` darin entschlüsselt die
wöchentlichen Datenbank-Backups.

## [X] HS-05: Erste App-Version veröffentlichen (⏱ ~2 min + 10 min Warten)

```bash
git switch main && git pull && git tag v0.1.0 && git push origin v0.1.0
```

**Erwartet:** Actions → „Release APK“ wird grün; unter „Releases“ liegt `app-release.apk`.

## [X] HS-06: App aufs Handy + Test-Alarm (⏱ ~10 min · braucht: Android-Handy)

**Warum:** Echtes Verhalten (Hersteller-Akkusparen, Sperrbildschirm) kann ich nicht simulieren.
**Schritte:**

1. Am Handy `https://github.com/RTNasenbaer/uebungsleiter-tracker/releases/latest` öffnen → `app-release.apk` → herunterladen.
   Tipp für automatische Updates: App **Obtainium** (F-Droid) mit dieser Repo-Adresse.
2. Datei öffnen → „Installation aus dieser Quelle zulassen“ → Installieren.
3. App öffnen → „Gerät koppeln“. Am PC auf der Website: Geräte → „Gerät koppeln“ → in der App „QR-Code scannen“.
4. In der App öffnet sich „Alarm-Einrichtung“ → jede rote Zeile antippen und erlauben, bis alles grün ist.
5. „Test-Alarm in 1 Minute“ → Handy sperren → warten.

**Erwartet:** Vollbild „Test-Alarm“ mit Ton erscheint über dem Sperrbildschirm; „JA, gehalten“ schließt ihn.
**Rückmeldung an Claude:** „HS-06 ok“ oder was stattdessen passiert ist (Screenshot hilft).

## [X] HS-07: Wöchentliches Datenbank-Backup (erledigt durch HS-04)

`scripts/set-release-secrets.sh` setzt `BACKUP_PASSPHRASE` mit (Datei `release-keystore/backup-passphrase.txt`).
Manueller Lauf von „D1 backup“ war grün. Wiederherstellen:
`openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in d1-backup.sql.enc -out backup.sql -pass file:backup-passphrase.txt`.

## [X] HS-08: Samsung-Akkusparen ausnehmen

App-Info → Akku → **Nicht eingeschränkt**. Auf dem A53 (One UI 8) tauchte die App in „Nie schlafende Apps“ nicht auf;
„Nicht eingeschränkt“ ist die stärkere Ausnahme und reicht.
**Rückmeldung an Claude:** nur falls ein echter Trainings-Alarm ausbleibt (Uhrzeit + Training nennen).
