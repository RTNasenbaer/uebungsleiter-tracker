#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Uploads the release keystore to GitHub Actions secrets (needs `gh auth login`). Run once.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)/release-keystore"
[ -f "$DIR/release.keystore" ] || { echo "Missing $DIR/release.keystore – run scripts/create-release-keystore.sh"; exit 1; }
prop() { grep "^$1=" "$DIR/keystore.properties" | cut -d= -f2-; }
base64 -w0 "$DIR/release.keystore" | gh secret set ANDROID_KEYSTORE_BASE64
prop storePassword | gh secret set ANDROID_KEYSTORE_PASSWORD
prop keyAlias | gh secret set ANDROID_KEY_ALIAS
prop keyPassword | gh secret set ANDROID_KEY_PASSWORD
# encryption passphrase for the weekly D1 backup (also printed into the folder for you to keep)
if [ ! -f "$DIR/backup-passphrase.txt" ]; then (umask 077; openssl rand -base64 32 > "$DIR/backup-passphrase.txt"); fi
gh secret set BACKUP_PASSPHRASE < "$DIR/backup-passphrase.txt"
echo "Done: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD, BACKUP_PASSPHRASE set."
echo "Keep the folder $DIR safe (password manager / USB stick)."
