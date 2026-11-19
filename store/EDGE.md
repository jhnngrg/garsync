# Microsoft Edge Add-ons – submission kit for GarSync 1.0.2

Step by step for [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons) via Partner Center. Edge is Chromium-based, so it uses the Chrome package unchanged. Texts are ready to copy.

## What's new in 1.0.2

Release notes, ready to copy where the store asks for them:
```
• Waypoints of the Mapy.com route can now be added to the Garmin course as Course Points (switch in the send dialog). Unnamed points keep the label Mapy.com shows, e.g. "Point 5".
• The toolbar panel fits without scrolling; the language switch moved to its header.
• Clearer text about courses saved without a device.
```

---

## 0. Build and test locally

1. Build the packages:
   ```bash
   ./store/build.sh
   ```
   You get `dist/garsync-edge-1.0.2.zip` (for Edge Add-ons, same content as the Chrome package) and an unpacked copy in `dist/edge/`.
2. Test in Edge:
   1. Open `edge://extensions`.
   2. Turn on **Developer mode** (left sidebar).
   3. Click **Load unpacked** and pick the `dist/edge` folder.
   4. Sign in at [connect.garmin.com](https://connect.garmin.com) in the same Edge profile.
   5. Open a route on Mapy.com, click **Garmin** in the route panel and send a route.

---

## 1. Create a developer account (free)

1. Go to [Partner Center → Microsoft Edge](https://partner.microsoft.com/dashboard/microsoftedge/overview) and sign in with a Microsoft account.
2. Choose **Enroll in the Microsoft Edge program**. Registration is free.
3. Account type: **Individual**.
4. Fill in your contact details and the **publisher display name** shown on the listing (e.g. `jhnngrg`).

---

## 2. Submit the extension

1. In Partner Center open **Microsoft Edge → Extensions → Create new extension**.
2. **Packages:** upload `dist/garsync-edge-1.0.2.zip`. Partner Center reads the name, version and permissions from it.
3. Fill in **Availability**, **Properties** and **Store listings** (sections 3–5 below).
4. **Publish** → add the notes from section 6 → **Submit**. Certification usually takes up to 7 business days.

---

## 3. Availability

- **Visibility:** Public (or **Hidden** to share it only by link at first).
- **Markets:** all markets.

---

## 4. Properties

### Category
**Productivity**

### Privacy policy
- Does the extension access, collect or transmit personal information? **Yes** (the route is sent to the user's own Garmin Connect account).
- Privacy policy URL:
  ```
  https://jhnngrg.github.io/garsync/store/privacy-policy.html
  ```

### Website URL
```
https://github.com/jhnngrg/garsync
```

### Support contact
```
https://github.com/jhnngrg/garsync/issues
```

### Mature content
**No**

---

## 5. Store listing (English)

### Description (min 250 characters)
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
• Adds the waypoints of your Mapy.com route as Course Points, so your device announces them on the way (can be switched off).
• Remembers your devices, so next time you just click Send.
• Available in English and Czech (switch in the toolbar panel).

REQUIREMENTS
• A Garmin Connect account you are signed in to in the same browser.
• A Garmin device that supports courses and is paired with Garmin Connect.

PRIVACY
GarSync has no server of its own. The route goes straight from your browser to your own Garmin Connect account. Nothing is collected by the developer, sold or shared with anyone else. Apart from your settings, nothing is stored.

DISCLAIMER
GarSync is an unofficial add-on, not made or endorsed by Garmin Ltd. or Seznam.cz, a.s. Garmin and Garmin Connect are trademarks of Garmin Ltd. or its subsidiaries. Mapy.com is a trademark of Seznam.cz, a.s.
```

### Short description
```
Send a route from Mapy.com to Garmin Connect and your Garmin watch or bike computer in one click. Unofficial add-on.
```

### Search terms (up to 7)
```
Garmin
Mapy.com
GPX
route planner
bike computer
cycling
hiking
```

### Images ([assets](assets) folder)

| Field | File | Size |
|---|---|---|
| Extension store logo (required) | `store-logo-300.png` | 300×300 PNG |
| Small promotional tile (optional) | `promo-tile-440x280.png` | 440×280 PNG |
| Large promotional tile (optional) | `promo-tile-large-1400x560.png` | 1400×560 PNG |
| Screenshots | `screenshot-1-button.png`, `screenshot-2-dialog.png`, `screenshot-3-done.png` | 1280×800 PNG |

Partner Center accepts PNG only, so use the `.png` files here (the `.jpg` versions are for the Chrome Web Store).

The screenshots show the real Mapy.com site running the extension's real code. The user name (Jane Smith) and the devices are sample data.

---

## 6. Notes for certification

```
GarSync needs a Garmin Connect account to work.

1. Sign in at https://connect.garmin.com in the same Edge profile.
2. Open https://mapy.com/fnc/v1/route?mapset=outdoor&start=14.3936,49.9733&end=14.1880,49.9395&routeType=bike_road
3. In the route panel on the right, click the "Garmin" button below Save / Share / Export.
4. The dialog shows the connected account, route name, sport and paired devices. Click "Send".
5. The route appears in Garmin Connect under Training → Courses.

Without a paired device the route is only saved to Garmin Connect, which is enough to verify the extension.

Permissions:
- storage: remembers the selected devices, the Course Points switch and the UI language, locally.
- declarativeNetRequestWithHostAccess: a session rule sets Origin, Referer and Sec-Fetch-* on the extension's own background requests to connect.garmin.com/gc-api/ (tabId -1 only). Garmin Connect is behind Cloudflare and rejects API requests without these headers. User browsing is not affected.
- mapy.com / mapy.cz: adds the Garmin button to the route panel and reads the open route via Mapy.com's own GPX export.
- connect.garmin.com: uploads the course to the user's own account, reads the display name and paired devices.
- sso.garmin.com: only used to recognise Garmin's sign-in page, so the dialog can show "Not signed in". Nothing on that page is read or filled in.

The source is not minified: https://github.com/jhnngrg/garsync
{{Optional: sign-in details of a test Garmin Connect account with no personal data.}}
```

Tip: create a separate test Garmin Connect account for the review instead of sharing your personal one.

---

## 7. Updates

1. Raise `version` in `extension/manifest.json`.
2. Run `./store/build.sh`.
3. In Partner Center open GarSync → **Update** → upload the new `dist/garsync-edge-<version>.zip` → **Publish**.
