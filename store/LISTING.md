# Chrome Web Store – submission kit for GarSync 1.0.2

Everything you fill in on the [Developer Dashboard](https://chrome.google.com/webstore/devconsole), in tab order. Texts are ready to copy.
The privacy policy is served by GitHub Pages from this repository.

## What's new in 1.0.2

Release notes, ready to copy where the store asks for them:
```
• Waypoints of the Mapy.com route can now be added to the Garmin course as Course Points (switch in the send dialog). Unnamed points keep the label Mapy.com shows, e.g. "Point 5".
• The toolbar panel fits without scrolling; the language switch moved to its header.
• Clearer text about courses saved without a device.
```

---

## 0. Before you start

- [ ] Developer account registered, USD 5 fee paid, 2-Step Verification turned on.
- [ ] Trader / non-trader declaration (EU) filled in under account settings.
- [ ] Privacy policy is live at https://jhnngrg.github.io/garsync/store/privacy-policy.html (GitHub Pages).
- [ ] Package built with `./store/build.sh` (creates `dist/garsync-chrome-1.0.2.zip`).

---

## 1. Package

Upload `dist/garsync-chrome-1.0.2.zip`.

---

## 2. "Store listing" tab

### Name (from the manifest, max 75 characters)
```
GarSync – Send Mapy.com routes to Garmin
```

### Summary (from the manifest, max 132 characters)
```
Send a route from Mapy.com to Garmin Connect and your Garmin watch or bike computer in one click. Unofficial add-on.
```

### Description
```
Planned a route on Mapy.com and want it on your watch or bike computer? GarSync sends it there in one click, with no GPX downloads and no detour through your phone.

HOW IT WORKS
1. Plan a route on Mapy.com, or open a saved or shared one.
2. Click the Garmin button in the route panel.
3. Check the name and sport, pick your devices and click Send.
4. The route is saved to Garmin Connect (Training → Courses) and appears on your device after the next sync.

FEATURES
• Sends the route to Garmin Connect as a private course.
• Queues it for the watches or bike computers you choose.
• Pre-selects the sport from the Mapy.com route type (hiking, walking, cycling, mountain biking, road cycling…).
• Works with new, saved and shared routes from the Mapy.com route planner.
• Shows which Garmin Connect account is connected and offers sign-in when needed.
• Adds the waypoints of your Mapy.com route as Course Points, so your device announces them on the way (can be switched off).
• Remembers your devices, so next time you just click Send.
• Available in English and Czech (switch in the toolbar panel).
• The toolbar icon opens a small panel with a quick how-to and a link to Mapy.com.

REQUIREMENTS
• A Garmin Connect account you are signed in to in the same browser.
• A Garmin device that supports courses and is paired with Garmin Connect.

PRIVACY
GarSync has no server of its own. The route goes straight from your browser to your own Garmin Connect account. Nothing is collected, sold or shared with third parties. Apart from your settings, nothing is stored.

DISCLAIMER
GarSync is an unofficial add-on, not made or endorsed by Garmin Ltd. or Seznam.cz, a.s. Garmin and Garmin Connect are trademarks of Garmin Ltd. or its subsidiaries. Mapy.com is a trademark of Seznam.cz, a.s. The extension relies on the Garmin Connect and Mapy.com websites, which may change without notice.
```

### Category
**Lifestyle → Travel** (alternative: Productivity → Tools)

### Language
English

### Graphics ([assets](assets) folder)

| Field | File | Size |
|---|---|---|
| Store icon | `store-icon-128.png` | 128×128 PNG |
| Screenshot 1 – Garmin button in the route panel | `screenshot-1-button.jpg` | 1280×800 |
| Screenshot 2 – send dialog | `screenshot-2-dialog.jpg` | 1280×800 |
| Screenshot 3 – confirmation | `screenshot-3-done.jpg` | 1280×800 |
| Small promo tile | `promo-tile-440x280.jpg` | 440×280 |

The screenshots show the real Mapy.com site running the extension's real code. The user name (Jane Smith) and the devices are sample data, not real account data.

### Contact
- Website: `https://github.com/jhnngrg/garsync`
- Support: `https://github.com/jhnngrg/garsync/issues`

---

## 3. "Privacy" tab

### Single purpose
```
Sends a route planned on Mapy.com to the user's own Garmin Connect account and queues it for the user's Garmin devices.
```

### Permission justification

**storage**
```
Remembers which Garmin devices the user selected last time, whether waypoints are added as Course Points, and the UI language, so the send dialog can pre-select them. Stored locally in the browser only.
```

**declarativeNetRequestWithHostAccess**
```
Sets the Origin, Referer and Sec-Fetch-* headers of the extension's background requests to the Garmin Connect API (connect.garmin.com/gc-api/) to the values the Garmin Connect website itself sends, so Garmin Connect accepts them. This lets the extension work without opening a Garmin Connect tab. The rule only matches /gc-api/ requests that do not come from any browser tab; the user's normal browsing is not touched.
```

**Host permission: https://mapy.com/\*, https://\*.mapy.com/\***
```
Adds the "Garmin" button to the Mapy.com route panel and reads the route the user is viewing, then downloads its GPX through Mapy.com's own export (the same request as the site's Export button).
```

**Host permission: https://mapy.cz/\*, https://\*.mapy.cz/\***
```
Mapy.cz is the former domain of Mapy.com and still serves the same route planner; the extension needs the same access there.
```

**Host permission: https://connect.garmin.com/\***
```
Uploads the route to the user's own Garmin Connect account as a course, reads the user's display name and paired devices for the send dialog, and queues the course for the devices the user selects. Requests use the user's existing Garmin Connect session (directly from the background worker, or inside a connect.garmin.com tab as a fallback); the extension never sees or stores the password.
```

**Host permission: https://sso.garmin.com/\***
```
Garmin's sign-in page. The extension only checks whether a Garmin Connect tab it opened in the background ended up on this page, so it can tell the user they are signed out and offer a "Sign in" button instead of waiting. It never reads or fills in anything on the sign-in page.
```

### Are you using remote code?
**No, I am not using remote code.** All code ships in the package; nothing is downloaded or executed from elsewhere.

### Data usage

Tick:
- **Personally identifiable information.** The display name from the Garmin Connect profile, shown in the dialog only.
- **Location.** The coordinates of the route the user sends to their own Garmin Connect account.
- **Website content.** The route read from the Mapy.com page.

Do not tick: health, financial, authentication information (the extension never sees the password), personal communications, web history, user activity.

Confirm all three statements:
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

### Privacy policy URL
```
https://jhnngrg.github.io/garsync/store/privacy-policy.html
```

---

## 4. "Distribution" tab

- **Visibility:** start with **Unlisted** (only people with the link can install it). Switch to **Public** later.
- **Regions:** all regions.
- **Pricing:** free.

---

## 5. Test instructions for the reviewer

```
GarSync needs a Garmin Connect account to work.

1. Sign in at https://connect.garmin.com in the same browser.
2. Open https://mapy.com/en/turisticka?planovani-trasy and plan any route (click two points on the map), or open:
   https://mapy.com/fnc/v1/route?mapset=outdoor&start=14.3936,49.9733&end=14.1880,49.9395&routeType=bike_road
3. In the route panel (right side), click the "Garmin" button below Save / Share / Export.
4. The dialog shows the connected account, the route name, the sport and the paired devices. Click "Send".
5. The route appears in Garmin Connect under Training → Courses.

Without a paired device the route is only saved to Garmin Connect, which is enough to verify the extension.
{{Optional: sign-in details of a test Garmin Connect account with no personal data.}}
```

Tip: create a separate test Garmin Connect account for the review instead of sharing your personal one.

---

## 6. Risks to keep in mind

- **Trademarks.** The name and texts use Garmin and Mapy.com descriptively only, with no logos and with a clear "unofficial" disclaimer. If either company complains, Google will take the extension down.
- **Unofficial endpoints.** The extension relies on internal endpoints of Garmin Connect and Mapy.com. When they change, an update is needed.
- **Review time.** Because the extension accesses other websites, expect a manual review, usually a few days.
- **Updates.** Every new release needs a higher `version` in `extension/manifest.json`. Then run `./store/build.sh` again and upload the new ZIP.
