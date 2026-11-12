#!/usr/bin/env bash
# Builds the Chrome Web Store package: dist/garsync-<version>.zip
# Usage: ./store/build.sh   (run from the project root or anywhere)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/extension"
DIST="$ROOT/dist"

VERSION="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["version"])' "$EXT/manifest.json")"
OUT="$DIST/garsync-$VERSION.zip"

# Run the tests first so a broken build never gets packaged.
node "$EXT/test/mapy-route.test.mjs"
node "$EXT/test/background-modes.test.mjs"
for f in "$EXT"/background.js "$EXT"/content/*.js "$EXT"/lib/*.js; do node --check "$f"; done

mkdir -p "$DIST"
rm -f "$OUT"
cd "$EXT"
# manifest.json must sit at the root of the zip; tests and macOS junk stay out.
zip -r -X -q "$OUT" . -x "test/*" -x "*.DS_Store" -x "__MACOSX/*"

echo "Done: $OUT"
unzip -l "$OUT"
