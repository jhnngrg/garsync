/*
 * Feature switches. The GarSync TEST build (store/build.sh) ships its own
 * copy of this file, so new features can be tried there before release.
 */
(function (root) {
  root.GarSyncFlags = {
    coursePoints: true, // via points from Mapy.com as Garmin Course Points (since 1.0.2)
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
