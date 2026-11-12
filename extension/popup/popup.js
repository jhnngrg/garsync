/* Toolbar panel: show the installed version. Links open in new tabs on their own. */
const version = globalThis.chrome?.runtime?.getManifest?.().version;
if (version) document.getElementById("version").textContent = `Version ${version}`;
