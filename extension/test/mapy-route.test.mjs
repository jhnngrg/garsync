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

// Via points become <wpt> before <trk>, moved onto the nearest track point,
// with names escaped; no points leaves the GPX untouched.
const gpx = `<?xml version="1.0"?>\n<gpx>\n\t<trk>\n\t\t<trkseg>\n` +
  [[50, 14], [50.001, 14.001], [50.002, 14.002], [50.001, 14.001]].map(([la, lo]) => `\t\t\t<trkpt lat="${la}" lon="${lo}"></trkpt>\n`).join("") +
  `\t\t</trkseg>\n\t</trk>\n</gpx>\n`;
assert.equal(R.addWaypoints(gpx, []), gpx);
const withWpt = R.addWaypoints(gpx, [
  { lat: 50.0011, lon: 14.0009, name: "Café <U Lípy> & spol." },
  { lat: 50.0021, lon: 14.0021, name: "Bod 2" },
]);
assert.ok(withWpt.indexOf("<wpt") < withWpt.indexOf("<trk>"), "wpt before trk");
assert.match(withWpt, /<wpt lat="50.001" lon="14.001">\s*<name>Café &lt;U Lípy&gt; &amp; spol.<\/name>\s*<type>Generic<\/type>/);
assert.match(withWpt, /<wpt lat="50.002" lon="14.002">\s*<name>Bod 2<\/name>/);
assert.equal((withWpt.match(/<wpt /g) || []).length, 2);
assert.equal((withWpt.match(/<trkpt /g) || []).length, 4, "track unchanged");

console.log("mapy-route: all tests passed");

