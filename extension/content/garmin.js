/*
 * Runs inside connect.garmin.com. Every Garmin call is made from here, so it is
 * a same-origin request carrying the user's own session cookies, plus the CSRF
 * token the Garmin web app puts in <meta name="csrf-token">. These are the same
 * internal /gc-api endpoints the Garmin Connect website itself uses.
 */
(() => {
  const BASE = "/gc-api";

  function csrfToken() {
    return document.querySelector("meta[name='csrf-token']")?.getAttribute("content") || null;
  }

  async function waitForCsrf(timeoutMs = 15000) {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      const token = csrfToken();
      if (token) return token;
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error("Could not load your Garmin Connect session. Are you signed in at connect.garmin.com?");
  }

  async function api(path, { method = "GET", json, form, retries = 3 } = {}) {
    const token = await waitForCsrf();
    const headers = { accept: "application/json, text/plain, */*", "connect-csrf-token": token };
    let body;
    if (json !== undefined) {
      headers["Content-Type"] = "application/json;charset=UTF-8";
      body = JSON.stringify(json);
    } else if (form) {
      body = form;
    }
    const res = await fetch(BASE + path, { method, headers, body, credentials: "include" });
    // Garmin answers 429 "not yet ready" for a few seconds after creating a course.
    if (res.status === 429 && retries > 0) {
      await new Promise((r) => setTimeout(r, 2000));
      return api(path, { method, json, form, retries: retries - 1 });
    }
    const text = await res.text();
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw Object.assign(new Error("You are not signed in to Garmin Connect."), { code: "NOT_LOGGED_IN" });
      }
      throw new Error(`Garmin Connect returned error ${res.status} (${path}). ${text.slice(0, 200)}`.trim());
    }
    return text ? JSON.parse(text) : null;
  }

  async function listDevices() {
    const devices = (await api("/device-service/deviceregistration/devices")) || [];
    return devices
      .filter((d) => d && d.deviceId != null)
      .map((d) => ({
        id: d.deviceId,
        name: d.displayName || d.productDisplayName || d.deviceTypeName || `Device ${d.deviceId}`,
        primary: Boolean(d.primary || d.primaryActivityTrackerIndicator),
      }));
  }

  /** The signed-in user's name, for the dialog header. */
  async function getProfile() {
    const p = (await api("/userprofile-service/socialProfile")) || {};
    return {
      name: p.fullName || p.displayName || p.userName || "Garmin Connect",
      profileUrl: p.displayName ? `https://connect.garmin.com/modern/profile/${encodeURIComponent(p.displayName)}` : null,
    };
  }

  async function getAccount() {
    const [profile, devices] = await Promise.all([
      getProfile().catch((err) => {
        if (err.code === "NOT_LOGGED_IN") throw err;
        return null; // a missing profile must not block sending
      }),
      listDevices(),
    ]);
    return { profile, devices };
  }

  async function uploadCourse({ gpx, filename, name, activityTypePk, deviceIds }) {
    // 1) Garmin parses the GPX (nothing is saved yet).
    const form = new FormData();
    form.append("file", new Blob([gpx], { type: "application/gpx+xml" }), filename || "route.gpx");
    const parsed = await api("/course-service/course/import", { method: "POST", form });
    if (!parsed || !Array.isArray(parsed.geoPoints) || parsed.geoPoints.length < 2) {
      throw new Error("Garmin Connect could not read the GPX from Mapy.com.");
    }

    // 2) Save it as a course, with the body Garmin's own web editor sends.
    const created = await api("/course-service/course", {
      method: "POST",
      json: {
        activityTypePk: activityTypePk || 3,
        hasTurnDetectionDisabled: false,
        geoPoints: parsed.geoPoints,
        courseLines: [],
        coursePoints: parsed.coursePoints || [],
        startPoint: parsed.geoPoints[0],
        elapsedSeconds: null,
        openStreetMap: false,
        coordinateSystem: "WGS84",
        rulePK: 2, // private
        courseName: name || parsed.courseName || "Route from Mapy.com",
        matchedToSegments: false,
        includeLaps: false,
        hasPaceBand: false,
        hasPowerGuide: false,
        favorite: false,
        speedMeterPerSecond: null,
        sourceTypeId: 3,
      },
    });
    const courseId = created?.courseId;
    if (!courseId) throw new Error("Garmin Connect did not confirm the course was saved.");

    // 3) Queue it for the chosen devices; they pick it up on their next sync.
    let sentTo = [];
    if (deviceIds && deviceIds.length) {
      const messages = deviceIds.map((deviceId) => ({
        deviceId,
        messageUrl: `course-service/course/fit/${courseId}/${deviceId}?elevation=true`,
        messageType: "courses",
        messageName: created.courseName,
        groupName: null,
        priority: 1,
        fileType: "FIT",
        metaDataId: courseId,
      }));
      await api("/device-service/devicemessage/messages", { method: "POST", json: messages });
      sentTo = deviceIds;
    }

    return {
      courseId,
      courseName: created.courseName,
      distanceMeter: created.distanceMeter,
      url: `https://connect.garmin.com/modern/course/${courseId}`,
      sentTo,
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.target !== "garmin") return false;
    const run = {
      ping: async () => ({ ready: Boolean(csrfToken()) }),
      listDevices,
      getAccount,
      uploadCourse: () => uploadCourse(msg.payload),
    }[msg.type];
    if (!run) return false;
    Promise.resolve()
      .then(run)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err), code: err?.code }));
    return true;
  });
})();
