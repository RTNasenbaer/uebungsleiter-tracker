---
name: human-step
description: Benutzen, wenn eine Aufgabe zwingend den Menschen braucht (Account/Login, Secret in GitHub hinterlegen, echtes Android-Handy, Geld, Entscheidung gegen die SPEC). Beschreibt, wie der Schritt minimal, präzise und gesammelt angefragt wird.
---

# human-step

Der Nutzer ist 19, technisch interessiert, aber kein DevOps-Profi; er hat ein Android-Handy, kein iPhone.
Er will so selten wie möglich gefragt werden.

## Vorher prüfen – nur wenn alles „nein“ ist, wird es ein Human-Step
- Kann ich es selbst per CLI/Script? (Keystore mit `keytool` erzeugen, Dev-Secrets, Configs, Workflows, PRs, Tests, Builds)
- Hat die SPEC einen Default ([ANNAHME])? → nehmen.
- Kann ich mit Mock/Platzhalter weiterarbeiten? → ja: weiterarbeiten, Schritt nur notieren.

## Erwartbare Human-Steps (bündeln, in dieser Reihenfolge)
1. Cloudflare-Account (kostenlos) + API-Token als GitHub-Secret `CLOUDFLARE_API_TOKEN`, Account-ID als `CLOUDFLARE_ACCOUNT_ID`.
2. GitHub-OAuth-App anlegen (Callback-URL vorgeben) → Client-ID/Secret als GitHub-Secrets; eigene GitHub-User-ID als `ALLOWED_GITHUB_IDS`.
3. Release-Keystore: Claude erzeugt ihn plus ein Script; der Nutzer führt **ein** Script aus, das die Secrets per `gh secret set`
   setzt, und sichert die Keystore-Datei (Passwortmanager/USB-Stick). Ohne denselben Keystore sind keine App-Updates möglich.
4. PR nach `main` mergen (löst Deploy aus).
5. APK aufs Handy (GitHub Release → Download → installieren; Tipp: Obtainium für Auto-Updates), Gerät koppeln,
   Alarm-Einrichtung durchklicken, „Test-Alarm in 1 Minute“ bei gesperrtem Handy.

## Format in `docs/HUMAN_STEPS.md`
```markdown
## [ ] HS-05: Test-Alarm auf dem Handy   (⏱ ~5 min · blockiert: nichts)
**Warum:** Echtes Verhalten auf deinem Gerät (Hersteller-Akkusparen) kann ich nicht simulieren.
**Du brauchst:** Android-Handy
**Schritte:**
1. Auf dem Handy öffnen: `https://github.com/<user>/<repo>/releases/latest` → `app-release.apk` tippen → herunterladen.
2. Datei öffnen → „Installation aus dieser Quelle zulassen“ → Installieren.
3. App öffnen → „Gerät koppeln“ → am PC auf der Website: Geräte → „Gerät koppeln“ → QR-Code scannen.
4. In der App: „Alarm einrichten“ → jede Zeile antippen, bis alles grün ist.
5. „Test-Alarm in 1 Minute“ → Handy sperren → warten.
**Erwartet:** Vollbild „Training gehalten?“ mit Ton erscheint über dem Sperrbildschirm.
**Rückmeldung an Claude:** „HS-05 ok“ oder was stattdessen passiert ist (Screenshot hilft).
```
Regeln: exakte Klickpfade, Befehle zum Kopieren, erwartetes Ergebnis, Zeitbedarf, Kostenhinweis (sollte immer 0 € sein).
**Nie** Passwörter/Tokens im Chat erfragen – immer „in GitHub-Secret X eintragen“ bzw. „Script ausführen“.
Mehrere Schritte sammeln und am Phasenende gesammelt melden, außer der Schritt blockiert alles Weitere.
Nach Erledigung `[x]` setzen und Ergebnis notieren.

## Meldung im Chat
„Ich brauche N Schritte von dir (≈ X min), Details in docs/HUMAN_STEPS.md: HS-01 …“. Danach mit allem Nicht-Blockierten weitermachen.
