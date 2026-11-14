# Einrichtung (einmalig, ca. 30–45 min, davon ~20 min Warten)

## 1. Programme installieren (Windows)
- Git: https://git-scm.com/download/win (Standardoptionen)
- VS Code: https://code.visualstudio.com
- Docker Desktop: https://www.docker.com/products/docker-desktop (bei der Installation „WSL 2“ verwenden, danach neu starten, Docker Desktop einmal öffnen)
- In VS Code die Erweiterung **„Dev Containers“** (Microsoft) installieren

## 2. Leeres Repo auf GitHub
github.com → „New repository“ → Name `uebungsleiter-tracker` → **Public** → **nichts** ankreuzen (kein README, keine .gitignore, keine Lizenz) → „Create repository“.

## 3. Klonen und ZIP hineinkopieren
```bash
git clone https://github.com/<DEIN-NAME>/uebungsleiter-tracker.git
```
ZIP in diesen Ordner entpacken (die Dateien müssen direkt drinliegen, inkl. versteckter Ordner `.claude`, `.devcontainer`).
```bash
cd uebungsleiter-tracker
git add .
git commit -m "chore: project setup for Claude Code"
git push -u origin main
```

## 4. Im Container öffnen
VS Code → Datei → Ordner öffnen → `uebungsleiter-tracker` → unten rechts „Reopen in Container“
(oder F1 → „Dev Containers: Reopen in Container“). Erster Start dauert 10–20 min (Android-SDK, Browser).

## 5. Anmelden (im VS-Code-Terminal, das jetzt im Container läuft)
```bash
gh auth login        # GitHub.com → HTTPS → Login with a web browser → Code im Browser eingeben
git config --global user.name  "Dein Name"
git config --global user.email "deine-github-noreply-adresse@users.noreply.github.com"
claude               # beim ersten Mal: mit deinem Claude-Konto anmelden, Ordner vertrauen, MCP-Server (playwright, context7) erlauben
```

## 6. Loslegen
Im Claude-Code-Fenster den Text aus `PROMPT.md` (alles unter der Linie `---`) einfügen und Enter.
- Claude arbeitet allein; ab und zu kann eine Freigabe-Frage kommen → lesen, mit „Yes“ bestätigen, wenn es plausibel ist.
- Erreichst du dein Nutzungslimit, pausiert Claude. Danach einfach „weiter“ schreiben.
- Was du selbst tun musst, steht am Ende in `docs/HUMAN_STEPS.md`.
