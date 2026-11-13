"""Turns the Chrome manifest into the Firefox one (used by store/build.sh).

Usage: python3 store/firefox-manifest.py <chrome manifest.json> <output manifest.json>
"""
import json
import sys

src, out = sys.argv[1], sys.argv[2]
m = json.load(open(src, encoding="utf-8"))

# Firefox runs the background as a script (event page), not a service worker,
# and needs the shared Garmin library listed before background.js.
m["background"] = {"scripts": ["lib/garmin-api.js", "background.js"]}
m.pop("minimum_chrome_version", None)

m["browser_specific_settings"] = {
    "gecko": {
        # Permanent add-on ID on addons.mozilla.org. Never change it after the first upload.
        "id": "garsync@jhnngrg.github.io",
        # 140+ shows the data-consent prompt below; MAIN-world content scripts need 128+.
        "strict_min_version": "140.0",
        # Required for new AMO submissions since Nov 2025. GarSync sends the route
        # (coordinates + the route read from Mapy.com) to the user's own Garmin Connect.
        "data_collection_permissions": {"required": ["locationInfo", "websiteContent"]},
    }
}

with open(out, "w", encoding="utf-8") as f:
    json.dump(m, f, ensure_ascii=False, indent=2)
    f.write("\n")
