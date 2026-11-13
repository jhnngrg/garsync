#!/usr/bin/env bash
# Builds the store packages from extension/:
#   dist/garsync-chrome-<version>.zip   -> Chrome Web Store
#   dist/garsync-firefox-<version>.zip  -> addons.mozilla.org
#   dist/chrome/, dist/firefox/          -> unpacked copies for local testing
# Usage: ./store/build.sh   (run from the project root or anywhere)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/extension"
DIST="$ROOT/dist"

VERSION="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$EXT/manifest.json")"

# Run the tests first so a broken build never gets packaged.
node "$EXT/test/mapy-route.test.mjs"
node "$EXT/test/background-modes.test.mjs"
node "$EXT/test/i18n.test.mjs"
for f in "$EXT"/background.js "$EXT"/content/*.js "$EXT"/lib/*.js "$EXT"/popup/*.js; do node --check "$f"; done

rm -rf "$DIST/chrome" "$DIST/firefox"
mkdir -p "$DIST/chrome" "$DIST/firefox"

# Copy the extension without tests and macOS junk.
for target in chrome firefox; do
  (cd "$EXT" && find . -type f ! -path "./test/*" ! -name ".DS_Store" -print0 | cpio -0pdm --quiet "$DIST/$target")
done
python3 "$ROOT/store/firefox-manifest.py" "$EXT/manifest.json" "$DIST/firefox/manifest.json"

for target in chrome firefox; do
  OUT="$DIST/garsync-$target-$VERSION.zip"
  rm -f "$OUT"
  # manifest.json must sit at the root of the zip.
  (cd "$DIST/$target" && zip -r -X -q "$OUT" .)
  echo "Done: $OUT"
done
