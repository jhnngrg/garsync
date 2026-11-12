/*
 * Connects the mapy.com tab with Garmin Connect.
 *
 * Direct mode (preferred, no tab): this worker calls Garmin Connect itself with
 * the user's existing session cookies and the CSRF token read from the Garmin
 * Connect page. A session rule gives these requests the headers of Garmin's own
 * web app, which Cloudflare in front of Garmin Connect requires.
 *
 * Tab mode (fallback): if direct calls do not work, the calls run inside a
 * connect.garmin.com page instead; we reuse an open Garmin Connect tab or open
 * one in the background and close it again.
 *
 * The mode is decided on the read-only account lookup, so a route is never
 * uploaded twice: an upload only falls back if its first, non-saving step fails.
 */
importScripts("lib/garmin-api.js");

const SERVICES = {
  garmin: {
    label: "Garmin Connect",
    match: "https://connect.garmin.com/*",
    openUrl: "https://connect.garmin.com/modern/courses",
    loginUrl: "https://connect.garmin.com/modern/",
    isLogin: (url = "") => /^https:\/\/(sso\.garmin\.com|connect\.garmin\.com\/(signin|sso))/.test(url),
  },
};

/* ---------- direct mode ---------- */

const GARMIN_ORIGIN = "https://connect.garmin.com";
const GARMIN_PAGE = `${GARMIN_ORIGIN}/modern/`;
const CSRF_TTL_MS = 10 * 60 * 1000;
let csrfCache = null;

// Garmin Connect sits behind Cloudflare, which rejects /gc-api requests that do
// not look like they come from its own web app (verified: 403 without these
// headers, 200 with them). So the worker's own requests get the same Origin,
// Referer and Sec-Fetch-* headers the Garmin Connect page sends. The rule only
// matches /gc-api/ requests that do not come from any tab, i.e. this worker.
async function setUpGarminHeaders() {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [1],
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: "modifyHeaders",
            requestHeaders: [
              { header: "origin", operation: "set", value: GARMIN_ORIGIN },
              { header: "referer", operation: "set", value: GARMIN_PAGE },
              { header: "sec-fetch-site", operation: "set", value: "same-origin" },
              { header: "sec-fetch-mode", operation: "set", value: "cors" },
              { header: "sec-fetch-dest", operation: "set", value: "empty" },
            ],
          },
          condition: {
            urlFilter: "|https://connect.garmin.com/gc-api/",
            tabIds: [chrome.tabs.TAB_ID_NONE],
            resourceTypes: ["xmlhttprequest", "other"],
          },
        },
      ],
    });
  } catch (err) {
    console.info("GarSync: could not set the Garmin request headers", err);
  }
}
const headersReady = setUpGarminHeaders();

async function fetchCsrf() {
  if (csrfCache && Date.now() - csrfCache.at < CSRF_TTL_MS) return csrfCache.token;
  await headersReady;
  const res = await fetch(GARMIN_PAGE, { credentials: "include", headers: { accept: "text/html" } });
  if (SERVICES.garmin.isLogin(res.url)) throw GarSyncGarmin.notLoggedIn();
  const html = await res.text();
  const match =
    html.match(/<meta[^>]+name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']csrf-token["']/i);
  if (!match) {
    throw Object.assign(new Error("No Garmin Connect session found."), { code: "UNEXPECTED_RESPONSE" });
  }
  csrfCache = { token: match[1], at: Date.now() };
  return csrfCache.token;
}

const direct = GarSyncGarmin.createGarminClient({ base: `${GARMIN_ORIGIN}/gc-api`, getCsrf: fetchCsrf });

async function getMode() {
  return (await chrome.storage.session.get("garminMode")).garminMode;
}

async function setMode(mode) {
  await chrome.storage.session.set({ garminMode: mode });
}

/** Runs a Garmin call directly, or in a Garmin Connect tab when that is needed. */
async function garminCall(type, payload) {
  if ((await getMode()) !== "tab") {
    try {
      const data = await direct[type](payload);
      await setMode("direct");
      return data;
    } catch (err) {
      const safeToRetry = type !== "uploadCourse" || err.stage === "import";
      console.info(
        "GarSync: direct Garmin Connect request failed:",
        err.code || "",
        err.message,
        safeToRetry ? "-> using a background tab" : "",
      );
      if (!safeToRetry) throw err;
      csrfCache = null;
      const data = await callService("garmin", type, payload);
      await setMode("tab"); // the tab worked where direct did not
      return data;
    }
  }
  return callService("garmin", type, payload);
}

/* ---------- tab mode (fallback) ---------- */

async function getOpenedTabs() {
  const { openedTabs = [] } = await chrome.storage.session.get("openedTabs");
  return openedTabs;
}

async function setOpenedTabs(ids) {
  await chrome.storage.session.set({ openedTabs: ids });
}

async function ping(tabId, target) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { target, type: "ping" });
    return Boolean(res?.ok && res.data?.ready);
  } catch {
    return false;
  }
}

function notLoggedIn(service) {
  return Object.assign(new Error(`You are not signed in to ${SERVICES[service].label}.`), { code: "NOT_LOGGED_IN" });
}

async function getServiceTab(service) {
  const cfg = SERVICES[service];
  const tabs = await chrome.tabs.query({ url: cfg.match });
  for (const tab of tabs) {
    if (await ping(tab.id, service)) return tab.id;
  }

  const tab = await chrome.tabs.create({ url: cfg.openUrl, active: false });
  await setOpenedTabs([...(await getOpenedTabs()), tab.id]);

  const until = Date.now() + 30000;
  while (Date.now() < until) {
    await new Promise((r) => setTimeout(r, 700));
    let current;
    try {
      current = await chrome.tabs.get(tab.id);
    } catch {
      throw new Error(`The ${cfg.label} tab was closed.`);
    }
    if (cfg.isLogin(current.url) || cfg.isLogin(current.pendingUrl)) {
      // Not signed in: drop the hidden tab; the dialog offers a sign-in button.
      await closeOpenedTabs();
      throw notLoggedIn(service);
    }
    if (current.status === "complete" && (await ping(tab.id, service))) return tab.id;
  }
  throw new Error(`${cfg.label} did not load in time. Please try again.`);
}

async function callService(service, type, payload) {
  const tabId = await getServiceTab(service);
  const res = await chrome.tabs.sendMessage(tabId, { target: service, type, payload });
  if (!res) throw new Error(`${SERVICES[service].label} did not respond. Reload its tab and try again.`);
  if (!res.ok) throw Object.assign(new Error(res.error), { code: res.code });
  return res.data;
}

async function closeOpenedTabs() {
  const ids = await getOpenedTabs();
  await setOpenedTabs([]);
  for (const id of ids) {
    try {
      await chrome.tabs.remove(id);
    } catch {
      /* already closed */
    }
  }
}

/* ---------- messages from the mapy.com dialog ---------- */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.target !== "background") return false;
  const handlers = {
    listDevices: () => garminCall("listDevices"),
    getAccount: () => garminCall("getAccount"),
    openLogin: async () => {
      csrfCache = null;
      const service = SERVICES[msg.payload?.service] ? msg.payload.service : "garmin";
      await chrome.tabs.create({ url: SERVICES[service].loginUrl, active: true });
    },
    uploadCourse: async () => {
      try {
        return await garminCall("uploadCourse", msg.payload);
      } finally {
        await closeOpenedTabs();
      }
    },
    done: closeOpenedTabs,
  };
  const run = handlers[msg.type];
  if (!run) return false;
  Promise.resolve()
    .then(run)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: String(err?.message || err), code: err?.code }));
  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const ids = await getOpenedTabs();
  if (ids.includes(tabId)) await setOpenedTabs(ids.filter((id) => id !== tabId));
});
