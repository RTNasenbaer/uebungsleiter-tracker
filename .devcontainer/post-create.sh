#!/usr/bin/env bash
# Richtet Node/pnpm, Playwright-Browser und das Android-SDK im Devcontainer ein.
set -euo pipefail

sudo apt-get update
sudo apt-get install -y --no-install-recommends jq sqlite3 unzip poppler-utils

corepack enable
corepack prepare pnpm@latest --activate

npx -y playwright install --with-deps chromium firefox webkit

# --- Android SDK (ohne Android Studio) ---
SDK=/opt/android-sdk
if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  sudo mkdir -p "$SDK" && sudo chown -R "$(id -u):$(id -g)" "$SDK"
  # Aktuelle Versionsnummer siehe https://developer.android.com/studio#command-line-tools-only
  CMDLINE_TOOLS_VERSION="${CMDLINE_TOOLS_VERSION:-13114758}"
  tmp=$(mktemp -d)
  curl -fsSL -o "$tmp/tools.zip" "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_VERSION}_latest.zip"
  unzip -q "$tmp/tools.zip" -d "$tmp"
  mkdir -p "$SDK/cmdline-tools"
  mv "$tmp/cmdline-tools" "$SDK/cmdline-tools/latest"
  rm -rf "$tmp"
fi
export PATH="$PATH:$SDK/cmdline-tools/latest/bin:$SDK/platform-tools"
yes | sdkmanager --licenses >/dev/null
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

# Emulator nur, wenn Hardware-Virtualisierung verfügbar ist (sonst laufen Instrumented-Tests im GitHub-Actions-Emulator)
if [ -e /dev/kvm ]; then
  sdkmanager "emulator" "system-images;android-35;google_apis;x86_64"
  echo no | avdmanager create avd -n test35 -k "system-images;android-35;google_apis;x86_64" --force || true
  echo "Android-Emulator eingerichtet (AVD test35)."
else
  echo "Kein /dev/kvm – lokaler Emulator übersprungen, Instrumented-Tests laufen in der CI."
fi
