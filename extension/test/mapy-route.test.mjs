// Run with: node extension/test/mapy-route.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = { URL, URLSearchParams };
vm.runInNewContext(readFileSync(new URL("../lib/mapy-route.js", import.meta.url), "utf8"), ctx);
const R = ctx.GarSyncRoute;

// Real values captured from mapy.com: the planner URL's `rc` and the `rg`
// values the site's own Export button sent for the same route.
const rc = "9hDQdxXtwl1S5jcO";
const pts = R.decodeCoords(rc);
assert.equal(pts.length, 2);
assert.deepEqual([...pts.map(R.encodePoint)], ["9hDQdxXtwl", "9gxiLxXx-0"]);

const start = R.toWGS84(pts[0]);
assert.ok(Math.abs(start.lon - 14.4378) < 1e-4 && Math.abs(start.lat - 50.0755) < 1e-4);

const href =
  "https://mapy.com/en/turisticka?planovani-trasy&rc=9hDQdxXtwl1S5jcO&rs=coor&rs=coor&ri=&ri=" +
  "&mrp=%7B%22c%22%3A132%2C%22dt%22%3A%22%22%2C%22d%22%3Atrue%7D&xc=%5B%5D" +
  "&rwp=1%3B9hCU6xX9XQfAKhbmfe4g5sfZqgjJfa2gTMfVuR3fAZUiew5gTBevJgTI&x=14.41&y=50.08&z=19";
const route = R.parseRouteUrl(href);
assert.equal(route.criterion, 132);
assert.equal(R.garminSportFor(route.criterion), 3);
assert.equal(
  R.buildExportUrl(route, "en"),
  "/api/tplannerexport?export=gpx&lang=en&rp_c=132&rg=9hDQdxXtwl&rs=coor&ri=&rg=9gxiLxXx-0&rs=coor&ri=" +
    "&rp_aw=1%3B9hCU6xX9XQfAKhbmfe4g5sfZqgjJfa2gTMfVuR3fAZUiew5gTBevJgTI",
);
assert.equal(R.parseRouteUrl("https://mapy.com/cs/turisticka?x=14&y=50&z=10"), null);

console.log("mapy-route: all tests passed");

