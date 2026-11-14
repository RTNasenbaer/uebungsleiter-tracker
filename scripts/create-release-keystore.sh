#!/usr/bin/env bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Creates the release signing key in ./release-keystore (gitignored). Run once.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)/release-keystore"
mkdir -p "$DIR"
if [ -f "$DIR/release.keystore" ]; then echo "Keystore exists already: $DIR/release.keystore"; exit 0; fi
PASS="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-28)"
keytool -genkeypair -v -keystore "$DIR/release.keystore" -alias uebungsleiter -keyalg RSA -keysize 4096 \
  -validity 10950 -storepass "$PASS" -keypass "$PASS" -dname "CN=Uebungsleiter-Tracker" >/dev/null 2>&1
umask 077
cat > "$DIR/keystore.properties" <<PROPS
storeFile=../../../release-keystore/release.keystore
storePassword=$PASS
keyAlias=uebungsleiter
keyPassword=$PASS
PROPS
echo "Created $DIR/release.keystore (+ keystore.properties). Back up this folder – without it no app updates are possible."
