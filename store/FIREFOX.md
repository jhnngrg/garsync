# Firefox Add-ons (AMO) – submission kit for GarSync 1.0.1

Step by step for [addons.mozilla.org](https://addons.mozilla.org/developers/) (AMO). Texts are ready to copy.

---

## 0. Build and test locally

1. Build both packages:
   ```bash
   ./store/build.sh
   ```
   You get `dist/garsync-firefox-1.0.1.zip` (for AMO) and an unpacked copy in `dist/firefox/`.
2. Test in Firefox (140 or newer):
   1. Open `about:debugging#/runtime/this-firefox`.
   2. Click **Load Temporary Add-on…** and pick `dist/firefox/manifest.json`.
   3. Sign in at [connect.garmin.com](https://connect.garmin.com) in the same Firefox.
   4. Open a route on Mapy.com, click **Garmin** in the route panel and send a route.
   5. If something fails, click **Inspect** next to GarSync on the `about:debugging` page and check the Console.
   A temporary add-on disappears when Firefox restarts; that is expected.
3. Optional: run Mozilla's linter, the same checks AMO runs after upload:
   ```bash
   npx web-ext lint --source-dir dist/firefox
   ```

---

## 1. Create a developer account

1. Go to [addons.mozilla.org/developers](https://addons.mozilla.org/developers/) and sign in with a Mozilla account (create one if needed; it is free).
2. Accept the Firefox Add-on Distribution Agreement when asked.
3. Fill in a display name for your developer profile (shown on the listing).

---

## 2. Submit the add-on

1. In the Developer Hub click **Submit a New Add-on**.
2. **How to distribute this version:** choose **On this site** (listed on addons.mozilla.org).
3. **Upload Version:** upload `dist/garsync-firefox-1.0.1.zip`.
   - Compatible platforms: **Firefox for desktop** only (leave Android unchecked).
   - AMO runs automatic validation. Warnings are fine; errors must be fixed before you can continue.
4. **Source code:** answer **No**. The code is not minified, bundled or transpiled, so reviewers can read the package as it is.
5. **Describe Add-on:** fill in the fields from section 3 below.
6. **Submit Version.** Automatic review usually takes minutes; a human review can follow later.

---

## 3. Listing texts

### Name
```
GarSync – Send Mapy.com routes to Garmin
```

### Add-on URL (slug)
```
garsync
```

### Summary (max 250 characters)
```
Send a route planned on Mapy.com to Garmin Connect and your Garmin watch or bike computer in one click. No GPX downloads, no detour through your phone. Unofficial add-on.
```

### Description
```
Planned a route on Mapy.com and want it on your watch or bike computer? GarSync sends it there in one click, with no GPX downloads and no detour through your phone.

HOW IT WORKS
1. Plan a route on Mapy.com, or open a saved or shared one.
2. Click the Garmin button in the route panel, below Save / Share / Export.
3. Check the name and sport, pick your devices and click Send.
4. The route is saved to Garmin Connect (Training → Courses) and appears on your device after the next sync.

FEATURES
• Sends the route to Garmin Connect as a private course.
• Queues it for the watches or bike computers you choose.
• Pre-selects the sport from the Mapy.com route type (hiking, walking, cycling, mountain biking, road cycling…).
• Works with new, saved and shared routes from the Mapy.com route planner.
• Shows which Garmin Connect account is connected and offers sign-in when needed.
• Remembers your devices, so next time you just click Send.
• Available in English and Czech (switch in the toolbar panel).

REQUIREMENTS
• A Garmin Connect account you are signed in to in the same browser.
• A Garmin device that supports courses and is paired with Garmin Connect.

PRIVACY
GarSync has no server of its own. The route goes straight from your browser to your own Garmin Connect account. Nothing is collected by the developer, sold or shared with anyone else. Apart from your device selection, nothing is stored.

DISCLAIMER
GarSync is an unofficial add-on, not made or endorsed by Garmin Ltd. or Seznam.cz, a.s. Garmin and Garmin Connect are trademarks of Garmin Ltd. or its subsidiaries. Mapy.com is a trademark of Seznam.cz, a.s.
```

### Categories
**Other** (Firefox lets you pick up to two; "Other" fits best).

### Support
- Support website: `https://github.com/jhnngrg/garsync/issues`
- Support email: optional, leave empty to keep your email private.

### License
**MIT License** (same as the repository).

### Privacy policy
AMO asks for the privacy policy as text. Choose **This add-on has a privacy policy** and paste:
```
GarSync has no server of its own and sends no data to its developer. It never sells or shares data with third parties and does not use it for advertising or analytics.

What it works with:
- The Mapy.com route you have open (coordinates and name). When you click Send, it is uploaded to your own Garmin Connect account as a private course.
- Your Garmin Connect display name, shown in the dialog only and never stored.
- Your list of Garmin devices, so you can choose where to send the course.
- Your device selection, stored locally in the browser and removed when you uninstall the add-on.

Sign-in: GarSync never sees or stores your password. Requests to Garmin Connect use the session you already have in your browser.

Who receives data: only Mapy.com (to download the route you have open) and Garmin Connect (to upload it to your account).

Full policy: https://jhnngrg.github.io/garsync/store/privacy-policy.html
Questions: https://github.com/jhnngrg/garsync/issues
```

### Notes to Reviewer
```
GarSync needs a Garmin Connect account to work.

1. Sign in at https://connect.garmin.com in the same Firefox profile.
2. Open https://mapy.com/fnc/v1/route?mapset=outdoor&start=14.3936,49.9733&end=14.1880,49.9395&routeType=bike_road
3. In the route panel on the right, click the "Garmin" button below Save / Share / Export.
4. The dialog shows the connected account, route name, sport and paired devices. Click "Send".
5. The route appears in Garmin Connect under Training → Courses.

Technical notes:
- Data collection (data_collection_permissions): locationInfo and websiteContent, because the route read from Mapy.com is uploaded to the user's own Garmin Connect account when the user clicks Send. Nothing is sent to the developer.
- declarativeNetRequestWithHostAccess: a session rule sets Origin, Referer and Sec-Fetch-* on the add-on's own background requests to connect.garmin.com/gc-api/ (tabId -1 only). Garmin Connect is behind Cloudflare and rejects API requests without these headers. User browsing is not affected.
- sso.garmin.com host permission: only used to recognise that a background Garmin Connect tab landed on Garmin's sign-in page, so the dialog can show "Not signed in". Nothing on that page is read or filled in.
- If direct requests fail, the add-on falls back to running the same requests inside a connect.garmin.com tab it opens in the background.
- The source is not minified: https://github.com/jhnngrg/garsync
{{Optional: sign-in details of a test Garmin Connect account with no personal data.}}
```

---

## 4. After submission: images

On the add-on's **Edit Product Page** in the Developer Hub:

| Field | File |
|---|---|
| Icon | taken from the package (`icons/icon128.png`), nothing to upload |
| Screenshots | `store/assets/screenshot-1-button.jpg`, `screenshot-2-dialog.jpg`, `screenshot-3-done.jpg` (1280×800) |

---

## 5. Updates

1. Raise `version` in `extension/manifest.json`.
2. Run `./store/build.sh`.
3. In the Developer Hub open GarSync → **Upload New Version** → upload the new `dist/garsync-firefox-<version>.zip`.

Never change the add-on ID (`garsync@jhnngrg.github.io` in `store/firefox-manifest.py`) after the first upload, or Firefox will treat it as a different add-on.
