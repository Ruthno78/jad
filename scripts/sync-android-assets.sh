#!/usr/bin/env bash
# Senkronize dosye public/ (sit la) anndan android/app/src/main/assets/public
# App la se yon WebView 100% LOKAL: li pa janm chaje soti sou entènèt,
# li chaje auth.html, ajan.html, konpayi.html, elatriye dirèkteman nan APK a.
#
# Sèvi ak li:
#   ./scripts/sync-android-assets.sh
#
# CI (build-apk.yml) rele l otomatikman anvan gradlew.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT_DIR/public"
DEST="$ROOT_DIR/android/app/src/main/assets/public"

if [ ! -d "$SRC" ]; then
  echo "ERREUR: dosye public/ pa egziste ($SRC)"
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"
cp -r "$SRC"/. "$DEST"/

echo "OK: public/ kopye anndan $DEST"
