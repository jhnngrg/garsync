/* Toolbar panel: version, language switch (Auto / EN / CZ) and translated texts. */
const I18N = globalThis.GarSyncI18n;

function render({ setting, lang, t }) {
  document.documentElement.lang = lang;
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = t(node.dataset.i18n);
  document.getElementById("open-mapy").href = t("mapyUrl");
  const version = globalThis.chrome?.runtime?.getManifest?.().version;
  document.getElementById("version").textContent = version ? t("version", { version }) : "";
  for (const button of document.querySelectorAll("[data-language]")) {
    const active = button.dataset.language === setting;
    button.setAttribute("aria-checked", String(active));
    button.tabIndex = active ? 0 : -1;
  }
}

async function refresh() {
  render(await I18N.load());
}

async function choose(setting) {
  try {
    await chrome.storage.local.set({ language: setting });
  } catch {
    /* storage unavailable: still show the choice */
  }
  const lang = I18N.resolve(setting, navigator.language);
  render({ setting, lang, t: I18N.translator(lang) });
}

const buttons = [...document.querySelectorAll("[data-language]")];
buttons.forEach((button, i) => {
  button.addEventListener("click", () => choose(button.dataset.language));
  // Arrow keys move within the radio group.
  button.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = buttons[(i + step + buttons.length) % buttons.length];
    next.focus();
    choose(next.dataset.language);
  });
});

refresh();
