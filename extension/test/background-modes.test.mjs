// Scenario test for background.js: direct Garmin calls vs. the tab fallback.
// Run with: node extension/test/background-modes.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ext = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function makeWorld({ directWorks, tabWorks = true, loggedIn = true, failAt = null }) {
  const log = { tabsCreated: 0, directCalls: [], tabCalls: [], dnr: null };
  let listener;
  const session = {};
  const PAGE = '<html><head><meta name="csrf-token" content="tok123"></head></html>';
  const json = (obj, status = 200) => ({ ok: status < 300, status, url: "", text: async () => JSON.stringify(obj) });

  async function fakeFetch(url, opts = {}) {
    if (url === "https://connect.garmin.com/modern/") {
      if (!loggedIn) return { ok: true, status: 200, url: "https://sso.garmin.com/portal/sso/en-US/sign-in", text: async () => "<html>login</html>" };
      return { ok: true, status: 200, url, text: async () => PAGE };
    }
    const p = url.replace("https://connect.garmin.com/gc-api", "");
    log.directCalls.push(`${opts.method || "GET"} ${p}`);
    assert.equal(opts.headers["connect-csrf-token"], "tok123");
    if (!directWorks) return json({ message: "forbidden" }, 403);
    if (failAt && p.startsWith(failAt)) return json({ message: "boom" }, 500);
    if (p.includes("socialProfile")) return json({ fullName: "Jane Smith", displayName: "jane" });
    if (p.includes("deviceregistration")) return json([{ deviceId: 7, displayName: "Edge 840" }]);
    if (p.includes("/course/import")) return json({ geoPoints: [{}, {}], coursePoints: [] });
    if (p === "/course-service/course") return json({ courseId: 99, courseName: "Test" });
    if (p.includes("devicemessage")) return json([]);
    return json({}, 404);
  }

  const chrome = {
    runtime: { id: "extid", onMessage: { addListener: (fn) => (listener = fn) } },
    storage: { session: { async get(k) { return { [k]: session[k] }; }, async set(o) { Object.assign(session, o); } } },
    declarativeNetRequest: { async updateSessionRules(r) { log.dnr = r; } },
    tabs: {
      TAB_ID_NONE: -1,
      onRemoved: { addListener() {} },
      async query() { return []; },
      async create() { log.tabsCreated++; return { id: 5 }; },
      async get() { return { id: 5, status: "complete", url: loggedIn ? "https://connect.garmin.com/modern/courses" : "https://sso.garmin.com/x" }; },
      async remove() {},
      async sendMessage(_id, msg) {
        if (msg.type === "ping") return { ok: true, data: { ready: true } };
        log.tabCalls.push(msg.type);
        if (!tabWorks) return { ok: false, error: "tab failed" };
        if (msg.type === "getAccount") return { ok: true, data: { profile: { name: "Jane Smith" }, devices: [] } };
        if (msg.type === "uploadCourse") return { ok: true, data: { courseId: 1, sentTo: [] } };
        return { ok: true, data: null };
      },
    },
  };

  const ctx = {
    chrome, fetch: fakeFetch, console: { info() {}, log() {} }, FormData, Blob, URL,
    setTimeout: (fn) => setTimeout(fn, 0), // speed up tab polling
  };
  ctx.importScripts = (...files) => files.forEach((f) => vm.runInContext(readFileSync(path.join(ext, f), "utf8"), ctx));
  vm.createContext(ctx);
  vm.runInContext(readFileSync(path.join(ext, "background.js"), "utf8"), ctx);
  const send = (type, payload) => new Promise((resolve) => listener({ target: "background", type, payload }, {}, resolve));
  return { send, log, session };
}

// 1) Direct works: no tab at all, for the account and the upload.
{
  const w = makeWorld({ directWorks: true });
  const acc = await w.send("getAccount");
  assert.equal(acc.ok, true);
  assert.equal(acc.data.profile.name, "Jane Smith");
  const up = await w.send("uploadCourse", { gpx: "<gpx/>", name: "R", deviceIds: [7] });
  assert.equal(up.ok, true);
  assert.equal(up.data.courseId, 99);
  assert.deepEqual([...up.data.sentTo], [7]);
  assert.equal(w.log.tabsCreated, 0);
  assert.equal(w.session.garminMode, "direct");
  const rule = w.log.dnr.addRules[0];
  const set = Object.fromEntries(rule.action.requestHeaders.map((h) => [h.header, h.value]));
  assert.equal(set.origin, "https://connect.garmin.com");
  assert.equal(set["sec-fetch-site"], "same-origin");
  assert.equal(rule.condition.urlFilter, "|https://connect.garmin.com/gc-api/");
  assert.deepEqual([...rule.condition.tabIds], [-1]);
  console.log("ok 1 direct mode: no tab opened");
}

// 2) Direct refused (e.g. 403): falls back to the tab and stays there.
{
  const w = makeWorld({ directWorks: false });
  const acc = await w.send("getAccount");
  assert.equal(acc.ok, true);
  assert.equal(w.log.tabsCreated, 1);
  assert.equal(w.session.garminMode, "tab");
  const before = w.log.directCalls.length;
  const up = await w.send("uploadCourse", { gpx: "<gpx/>", name: "R", deviceIds: [] });
  assert.equal(up.ok, true);
  assert.equal(w.log.directCalls.length, before, "no direct calls once in tab mode");
  console.log("ok 2 fallback to tab when direct is refused");
}

// 3) Signed out: dialog gets NOT_LOGGED_IN, mode is not stuck on "tab".
{
  const w = makeWorld({ directWorks: true, loggedIn: false });
  const acc = await w.send("getAccount");
  assert.equal(acc.ok, false);
  assert.equal(acc.code, "NOT_LOGGED_IN");
  assert.notEqual(w.session.garminMode, "tab");
  console.log("ok 3 signed out reported, direct is retried next time");
}

// 4) Upload fails after the course was saved: no retry in a tab (no duplicate course).
{
  const w = makeWorld({ directWorks: true, failAt: "/device-service/devicemessage" });
  await w.send("getAccount");
  const up = await w.send("uploadCourse", { gpx: "<gpx/>", name: "R", deviceIds: [7] });
  assert.equal(up.ok, false);
  assert.equal(w.log.tabCalls.includes("uploadCourse"), false);
  console.log("ok 4 no duplicate upload after a partial failure");
}

// 5) Upload fails at the import step (nothing saved yet): safe retry in a tab.
{
  const w = makeWorld({ directWorks: true, failAt: "/course-service/course/import" });
  await w.send("getAccount");
  const up = await w.send("uploadCourse", { gpx: "<gpx/>", name: "R", deviceIds: [] });
  assert.equal(up.ok, true);
  assert.equal(w.log.tabCalls.filter((t) => t === "uploadCourse").length, 1);
  console.log("ok 5 import failure retried in a tab");
}
console.log("background-modes: all tests passed");
