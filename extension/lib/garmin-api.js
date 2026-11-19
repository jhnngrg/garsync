/*
 * Garmin Connect calls shared by the background worker (direct mode, no tab)
 * and the connect.garmin.com content script (tab mode, fallback). They use the
 * same internal /gc-api endpoints and CSRF header as the Garmin Connect website.
 *
 *   createGarminClient({ base, getCsrf })
 *     base     "/gc-api" in the page, "https://connect.garmin.com/gc-api" in the worker
 *     getCsrf  async () => the "connect-csrf-token" value
 */
(function (root) {
  function notLoggedIn() {
    return Object.assign(new Error("You are not signed in to Garmin Connect."), { code: "NOT_LOGGED_IN" });
  }

  function createGarminClient({ base, getCsrf }) {
    async function api(path, { method = "GET", json, form, retries = 3 } = {}) {
      const token = await getCsrf();
      const headers = { accept: "application/json, text/plain, */*", "connect-csrf-token": token };
      let body;
      if (json !== undefined) {
        headers["Content-Type"] = "application/json;charset=UTF-8";
        body = JSON.stringify(json);
      } else if (form) {
        body = form;
      }
      const res = await fetch(base + path, { method, headers, body, credentials: "include" });
      // Garmin answers 429 "not yet ready" for a few seconds after creating a course.
      if (res.status === 429 && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return api(path, { method, json, form, retries: retries - 1 });
      }
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw notLoggedIn();
        throw Object.assign(new Error(`Garmin Connect returned error ${res.status} (${path}). ${text.slice(0, 200)}`.trim()), {
          code: "HTTP_ERROR",
          params: { status: res.status },
        });
      }
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        // An HTML page (usually the sign-in page) instead of JSON.
        throw Object.assign(new Error("Garmin Connect returned an unexpected page."), { code: "UNEXPECTED_RESPONSE" });
      }
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
          if (err.code === "NOT_LOGGED_IN" || err.code === "UNEXPECTED_RESPONSE") throw err;
          return null; // a missing profile must not block sending
        }),
        listDevices(),
      ]);
      return { profile, devices };
    }

    async function uploadCourse({ gpx, filename, name, activityTypePk, deviceIds }) {
      // 1) Garmin parses the GPX (nothing is saved yet). Errors here are tagged
      //    so the caller knows it is safe to retry another way.
      const form = new FormData();
      form.append("file", new Blob([gpx], { type: "application/gpx+xml" }), filename || "route.gpx");
      let parsed;
      try {
        parsed = await api("/course-service/course/import", { method: "POST", form });
      } catch (err) {
        throw Object.assign(err, { stage: "import" });
      }
      if (!parsed || !Array.isArray(parsed.geoPoints) || parsed.geoPoints.length < 2) {
        throw Object.assign(new Error("Garmin Connect could not read the GPX from Mapy.com."), { code: "GPX_UNREADABLE", stage: "import" });
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
      if (!courseId) throw Object.assign(new Error("Garmin Connect did not confirm the course was saved."), { code: "NOT_SAVED" });

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
        // How many Course Points Garmin took over from the GPX waypoints.
        coursePoints: Array.isArray(parsed.coursePoints) ? parsed.coursePoints.length : 0,
      };
    }

    return { listDevices, getProfile, getAccount, uploadCourse };
  }

  root.GarSyncGarmin = { createGarminClient, notLoggedIn };
})(typeof globalThis !== "undefined" ? globalThis : this);
