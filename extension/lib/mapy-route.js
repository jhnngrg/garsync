/*
 * Reads a planned route out of a mapy.com URL and turns it into the URL of
 * mapy.com's own GPX export (the same request the site's "Export" button sends).
 *
 * The planner URL stores all route points in one `rc` string, delta-encoded.
 * The export endpoint wants each point as its own absolute `rg` value, so we
 * decode `rc` and re-encode every point on its own. The algorithm mirrors
 * SMap.Coords.stringToCoords / coordsToString from mapy.com's own scripts.
 */
(function (root) {
  const ALPHABET = "0ABCD2EFGH4IJKLMN6OPQRST8UVWXYZ-1abcd3efgh5ijklmn7opqrst9uvwxyz.";

  function parseNumber(chars, count) {
    let result = 0;
    while (count) {
      if (!chars.length) throw new Error("Invalid coordinate in the URL (rc).");
      const index = ALPHABET.indexOf(chars.pop());
      if (index !== -1) {
        result = result * 64 + index;
        count--;
      }
    }
    return result;
  }

  /** Decodes an `rc` string into raw integer points [[x, y], ...]. */
  function decodeCoords(str) {
    const points = [];
    const current = [0, 0];
    let axis = 0;
    const chars = str.trim().split("").reverse();
    while (chars.length) {
      let num = parseNumber(chars, 1);
      if ((num & 48) === 48) {
        num -= 48;
        current[axis] = (num & 15) * 16777216 + parseNumber(chars, 4);
      } else if ((num & 32) === 32) {
        current[axis] += (num & 15) * 4096 + parseNumber(chars, 2) - 32768;
      } else {
        current[axis] += (num & 31) * 64 + parseNumber(chars, 1) - 1024;
      }
      if (axis === 1) points.push([current[0], current[1]]);
      axis = (axis + 1) % 2;
    }
    return points;
  }

  function encodeAbsolute(value) {
    const a = 0x30000000 | (value & 0xfffffff);
    return [24, 18, 12, 6, 0].map((shift) => ALPHABET.charAt((a >> shift) & 63)).join("");
  }

  /** Encodes one raw point as a standalone (absolute) coordinate string. */
  function encodePoint([x, y]) {
    return encodeAbsolute(x) + encodeAbsolute(y);
  }

  function toWGS84([x, y]) {
    return { lon: (360 * x) / 0x10000000 - 180, lat: (180 * y) / 0x10000000 - 90 };
  }

  /** Returns route info from a mapy.com URL, or null when no route is planned. */
  function parseRouteUrl(href) {
    let url;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    const p = url.searchParams;
    const rc = p.get("rc");
    if (!rc) return null;
    const points = decodeCoords(rc);
    if (points.length < 2) return null;

    let mrp = {};
    try {
      mrp = JSON.parse(p.get("mrp") || "{}");
    } catch {
      /* keep defaults */
    }
    return {
      points,
      rs: p.getAll("rs"),
      ri: p.getAll("ri"),
      criterion: mrp.c,
      routeWaypoints: p.get("rwp"),
      useTraffic: p.has("rut"),
      rbf: p.getAll("rbf"),
    };
  }

  /** Builds the GPX export URL (relative to the mapy.com origin). */
  function buildExportUrl(route, lang = "cs") {
    const q = new URLSearchParams();
    q.append("export", "gpx");
    q.append("lang", lang);
    if (route.criterion != null) q.append("rp_c", String(route.criterion));
    route.points.forEach((pt, i) => {
      q.append("rg", encodePoint(pt));
      q.append("rs", route.rs[i] ?? "coor");
      q.append("ri", route.ri[i] ?? "");
    });
    if (route.routeWaypoints) q.append("rp_aw", route.routeWaypoints);
    if (route.useTraffic) q.append("rut", "1");
    route.rbf.forEach((v) => q.append("rbf", v));
    return "/api/tplannerexport?" + q.toString();
  }

  /** Builds the GPX export URL from parameters read out of the page state. */
  function buildExportUrlFromParams(params, lang = "cs") {
    const q = new URLSearchParams();
    q.append("export", "gpx");
    q.append("lang", lang);
    for (const [key, values] of Object.entries(params)) {
      for (const v of Array.isArray(values) ? values : [values]) q.append(key, String(v ?? ""));
    }
    return "/api/tplannerexport?" + q.toString();
  }

  /**
   * Garmin course activity type from the mapy.com route criterion.
   * Garmin ids: 1 running, 2 cycling, 3 hiking, 4 other, 5 mountain biking,
   * 9 walking, 10 road cycling.
   */
  function garminSportFor(criterion) {
    const c = Number(criterion);
    if (c === 132) return 3;
    if (c === 131) return 9;
    if (c === 121) return 5;
    if (c === 122) return 10;
    if (c >= 120 && c < 130) return 2;
    if (c >= 110 && c < 120) return 4;
    return 3;
  }

  function escapeXml(text) {
    return String(text).replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);
  }

  /**
   * Adds waypoints (<wpt>) to a GPX so Garmin Connect turns them into Course
   * Points. Each point is moved onto the nearest track point, searching forward
   * from the previous one, so it sits on the course even when it was clicked
   * next to the road. points: [{ lat, lon, name }]. Returns the new GPX text.
   */
  function addWaypoints(gpx, points) {
    if (!points || !points.length) return gpx;
    const track = [...gpx.matchAll(/<(?:trkpt|rtept)\b[^>]*>/g)].map((m) => ({
      lat: parseFloat(/\blat="([^"]+)"/.exec(m[0])?.[1]),
      lon: parseFloat(/\blon="([^"]+)"/.exec(m[0])?.[1]),
    }));
    const cos = Math.cos(((points[0].lat || 0) * Math.PI) / 180);
    const dist2 = (a, b) => ((a.lat - b.lat) ** 2 + ((a.lon - b.lon) * cos) ** 2);
    let from = 0;
    const wpts = points.map((p) => {
      let best = null;
      for (let i = from; i < track.length; i++) {
        if (!best || dist2(track[i], p) < dist2(track[best.i], p)) best = { i };
      }
      const at = best ? track[best.i] : p;
      if (best) from = best.i;
      return `\t<wpt lat="${at.lat}" lon="${at.lon}">\n\t\t<name>${escapeXml(p.name)}</name>\n\t\t<type>Generic</type>\n\t</wpt>\n`;
    });
    // GPX 1.1 wants <wpt> before <rte>/<trk>.
    const at = gpx.search(/<(?:rte|trk)\b/);
    if (at < 0) return gpx;
    return gpx.slice(0, at) + wpts.join("").trimStart() + "\t" + gpx.slice(at);
  }

  root.GarSyncRoute = { decodeCoords, encodePoint, toWGS84, parseRouteUrl, buildExportUrl, buildExportUrlFromParams, garminSportFor, addWaypoints };
})(typeof globalThis !== "undefined" ? globalThis : this);
