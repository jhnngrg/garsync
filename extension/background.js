/*
 * Connects the mapy.com tab with Garmin Connect. Garmin calls must run inside
 * a connect.garmin.com page (session cookies + CSRF token), so we reuse an open
 * Garmin Connect tab or open one in the background and close it again.
 */

const SERVICES = {
  garmin: {
    label: "Garmin Connect",
    match: "https://connect.garmin.com/*",
    openUrl: "https://connect.garmin.com/modern/courses",
    loginUrl: "https://connect.garmin.com/modern/",
    isLogin: (url = "") => /^https:\/\/(sso\.garmin\.com|connect\.garmin\.com\/(signin|sso))/.test(url),
  },
};

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

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.target !== "background") return false;
  const handlers = {
    listDevices: () => callService("garmin", "listDevices"),
    getAccount: () => callService("garmin", "getAccount"),
    openLogin: async () => {
      const service = SERVICES[msg.payload?.service] ? msg.payload.service : "garmin";
      await chrome.tabs.create({ url: SERVICES[service].loginUrl, active: true });
    },
    uploadCourse: async () => {
      const result = await callService("garmin", "uploadCourse", msg.payload);
      await closeOpenedTabs();
      return result;
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

// Clicking the toolbar icon opens the Garmin dialog on a mapy.com route.
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url && /^https:\/\/([a-z0-9-]+\.)?mapy\.(com|cz)\//.test(tab.url)) {
    try {
      await chrome.tabs.sendMessage(tab.id, { target: "mapy", type: "openDialog" });
      return;
    } catch {
      /* content script not ready, fall through */
    }
  }
  await chrome.tabs.create({ url: "https://mapy.com/en/turisticka?planovani-trasy" });
});
