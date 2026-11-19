#!/usr/bin/env bash
# Builds the store packages from extension/:
#   dist/garsync-chrome-<version>.zip   -> Chrome Web Store
#   dist/garsync-firefox-<version>.zip  -> addons.mozilla.org
#   dist/garsync-edge-<version>.zip     -> Microsoft Edge Add-ons (same content as Chrome)
#   dist/chrome/, dist/firefox/, dist/edge/ -> unpacked copies for local testing
#   dist/test/                          -> "GarSync TEST": Chrome copy with the
#                                          features from lib/flags.js switched on
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

TARGETS="chrome firefox edge"
for target in $TARGETS; do rm -rf "$DIST/$target"; mkdir -p "$DIST/$target"; done

# Copy the extension without tests and macOS junk.
# Edge is Chromium-based and uses the Chrome package unchanged.
for target in $TARGETS; do
  (cd "$EXT" && find . -type f ! -path "./test/*" ! -name ".DS_Store" -print0 | cpio -0pdm --quiet "$DIST/$target")
done
python3 "$ROOT/store/firefox-manifest.py" "$EXT/manifest.json" "$DIST/firefox/manifest.json"

for target in $TARGETS; do
  OUT="$DIST/garsync-$target-$VERSION.zip"
  rm -f "$OUT"
  # manifest.json must sit at the root of the zip.
  (cd "$DIST/$target" && zip -r -X -q "$OUT" .)
  echo "Done: $OUT"
done

# GarSync TEST: unpacked only, never uploaded. Loads next to the store version
# (different folder = different extension ID); its button reads "Garmin TEST".
rm -rf "$DIST/test"
cp -R "$DIST/chrome" "$DIST/test"
cat > "$DIST/test/lib/flags.js" <<'FLAGS'
(function (root) {
  root.GarSyncFlags = { coursePoints: true, debug: true, buttonLabel: "Garmin TEST" };
})(typeof globalThis !== "undefined" ? globalThis : this);
FLAGS
python3 - "$DIST/test/manifest.json" <<'PY'
import json, sys
path = sys.argv[1]
m = json.load(open(path))
m["name"] = "GarSync TEST"
m["short_name"] = "GarSync TEST"
m["action"]["default_title"] = "GarSync TEST"
json.dump(m, open(path, "w"), indent=2, ensure_ascii=False)
PY
echo "Done: $DIST/test (load unpacked)"
