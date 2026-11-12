/*
 * Runs in the mapy.com page itself (MAIN world) so it can read the route the
 * planner currently shows, whether it was clicked together, opened from
 * "Moje Mapy" or from a share link (/s/...). It builds the same GPX export
 * parameters as mapy.com's own Export button (function w() in userweb.js) and
 * hands them to the extension's content script via window.postMessage.
 */
(() => {
  function currentRoute() {
    const t = window.Mapy?.CML?.state?.route;
    const rd = t?.responseData?.[t.index];
    if (!t || !Array.isArray(t.items) || t.items.length < 2 || !rd) return null;

    const p = t.params || {};
    const e = { rp_c: [p.criterion], xc: [p.excludeCountries ?? "[]"] };
    const rg = [];
    const rs = [];
    const ri = [];
    for (const a of t.items) {
      if (!a.geometry) return null;
      rg.push(a.geometry);
      rs.push(a.source || "");
      ri.push(a.source !== "coor" && a.id ? a.id : "");
      if (a.tripData?.[t.index]) {
        e.tp_c = [p.tripCriterion];
        if (p.waypoints) e.tp_w = [p.waypoints];
        e.tp_i = [p.tripIndex];
      }
    }
    e.rg = rg;
    e.rs = rs;
    e.ri = ri;
    if (p.useTraffic) e.rut = [1];
    const rbf = [];
    if (p.avoidHighways) rbf.push("ah");
    if (!p.avoidFerries) rbf.push("alf");
    if (p.allowViaFerrata) rbf.push("avf");
    if (rbf.length) e.rbf = rbf;
    if (rd.routeId) e.route_id = [rd.routeId];
    else if (rd.routeWaypoints) e.rp_aw = [rd.routeWaypoints];

    return {
      params: JSON.parse(JSON.stringify(e)),
      title: t.likeData?.usertitle || "",
      criterion: p.criterion,
      km: typeof rd.totalLength === "number" ? rd.totalLength / 1000 : null,
    };
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.garsync !== "getRoute") return;
    let route = null;
    try {
      route = currentRoute();
    } catch {
      route = null;
    }
    window.postMessage({ garsync: "route", id: event.data.id, route }, location.origin);
  });
})();
