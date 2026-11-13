/*
 * Runs inside connect.garmin.com. Used only as a fallback when the background
 * worker cannot call Garmin Connect directly: requests made from this page are
 * same-origin, carry the user's session cookies and the CSRF token the Garmin
 * web app puts in <meta name="csrf-token">. The calls live in lib/garmin-api.js.
 */
(() => {
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
    throw Object.assign(new Error("Could not load your Garmin Connect session."), { code: "SESSION_MISSING" });
  }

  const garmin = globalThis.GarSyncGarmin.createGarminClient({ base: "/gc-api", getCsrf: waitForCsrf });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.target !== "garmin") return false;
    const run = {
      ping: async () => ({ ready: Boolean(csrfToken()) }),
      listDevices: () => garmin.listDevices(),
      getAccount: () => garmin.getAccount(),
      uploadCourse: () => garmin.uploadCourse(msg.payload),
    }[msg.type];
    if (!run) return false;
    Promise.resolve()
      .then(run)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: String(err?.message || err), code: err?.code, params: err?.params }));
    return true;
  });
})();
