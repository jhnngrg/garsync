/*
 * Runs on mapy.com. Adds our own action row (Garmin, ...) under mapy.com's
 * Save / Share / Export row, downloads the route's GPX through mapy.com's own export
 * and hands it to the background worker, which uploads it to Garmin Connect.
 * The dialog copies mapy.com's own look (Arial, green #1eae00, 12px dialog).
 */
(() => {
  const R = globalThis.GarSyncRoute;

  const SPORTS = [
    [3, "Hiking"],
    [9, "Walking"],
    [1, "Running"],
    [6, "Trail running"],
    [2, "Cycling"],
    [5, "Mountain biking"],
    [10, "Road cycling"],
    [4, "Other"],
  ];

  const ICON_WATCH =
    '<path fill-rule="evenodd" d="M9 2h6l.7 3.1A3 3 0 0 1 18 8v8a3 3 0 0 1-2.3 2.9L15 22H9l-.7-3.1A3 3 0 0 1 6 16V8a3 3 0 0 1 2.3-2.9L9 2Zm0 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H9Zm2 2h2v3.4l1.7 1-1 1.7L11 13.6V9Z"/>';
  const ICON_BIKE_COMPUTER =
    '<path fill-rule="evenodd" d="M8 2h8a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Zm0 2a1 1 0 0 0-1 1v9h10V5a1 1 0 0 0-1-1H8Zm-1 12v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3H7Zm2 1h6v2H9v-2Z"/>';
  const ICON_CLOSE =
    '<path d="M12 10.59 7.76 6.34a1 1 0 0 0-1.42 1.42L10.59 12l-4.25 4.24a1 1 0 1 0 1.42 1.42L12 13.41l4.24 4.25a1 1 0 0 0 1.42-1.42L13.41 12l4.25-4.24a1 1 0 0 0-1.42-1.42L12 10.59Z"/>';
  const ICON_CHECK = '<path d="M9.5 16.6 5.4 12.5 4 13.9l5.5 5.5L20 8.9l-1.4-1.4z"/>';
  const ICON_PERSON =
    '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z"/>';

  /* ---------- our own action row under mapy.com's ---------- */

  // mapy.com's own row (Save / Share / Export / MapyClimbs) is left
  // untouched. Below it we add our own row. Its items use mapy.com's own
  // .icon-action markup, so mapy.com's .icon-action rules style them, and the
  // row itself copies 1:1 the one rule mapy.com has for .route-actions:
  //   .route-summary .box .route-actions { align-items: flex-start; display: flex;
  //                                         justify-content: center; padding: 12px 0px; }
  // Items are 90px wide (mapy.com's .icon-action), so three fit per row.
  // To add another feature, add an entry to EXTRA_ACTIONS.
  const EXTRA_ACTIONS = [
    { id: "garmin", label: "Garmin", title: "Send to Garmin", icon: ICON_WATCH, onClick: () => openDialog() },
  ];

  const ROW_CSS = `
    .garsync-actions { align-items: flex-start; display: flex; justify-content: center; padding: 12px 0px; }
  `;

  function ensureStyle() {
    if (document.getElementById("garsync-style")) return;
    const style = document.createElement("style");
    style.id = "garsync-style";
    style.textContent = ROW_CSS;
    (document.head || document.documentElement).append(style);
  }

  function makeAction({ id, label, title, icon, onClick }) {
    const item = document.createElement("div");
    item.className = `icon-action garsync-action--${id}`;
    item.title = title;
    item.innerHTML = `<button type="button"><svg viewBox="0 0 24 24" class="icon" aria-hidden="true">${icon}</svg><span>${label}</span></button>`;
    item.querySelector("button").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    });
    return item;
  }

  function ensureActionButtons() {
    for (const actions of document.querySelectorAll(".route-actions")) {
      if (actions.nextElementSibling?.classList.contains("garsync-actions")) continue;
      ensureStyle();
      const row = document.createElement("div");
      row.className = "garsync-actions";
      row.append(...EXTRA_ACTIONS.map(makeAction));
      actions.after(row);
    }
  }

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      ensureActionButtons();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  ensureActionButtons();

  /* ---------- reading the route ---------- */

  /** Asks the page (mapy-bridge.js) for the route it currently shows. */
  function routeFromPage(timeoutMs = 1500) {
    return new Promise((resolve) => {
      const id = Math.random().toString(36).slice(2);
      const onMessage = (event) => {
        if (event.source !== window || event.data?.garsync !== "route" || event.data.id !== id) return;
        window.removeEventListener("message", onMessage);
        clearTimeout(timer);
        resolve(event.data.route || null);
      };
      const timer = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve(null);
      }, timeoutMs);
      window.addEventListener("message", onMessage);
      window.postMessage({ garsync: "getRoute", id }, location.origin);
    });
  }

  function distanceKm(doc) {
    const pts = [...doc.querySelectorAll("trkpt, rtept")].map((p) => [
      parseFloat(p.getAttribute("lat")),
      parseFloat(p.getAttribute("lon")),
    ]);
    const rad = Math.PI / 180;
    let m = 0;
    for (let i = 1; i < pts.length; i++) {
      const [a, b] = [pts[i - 1], pts[i]];
      const h =
        Math.sin(((b[0] - a[0]) * rad) / 2) ** 2 +
        Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(((b[1] - a[1]) * rad) / 2) ** 2;
      m += 2 * 6371000 * Math.asin(Math.sqrt(h));
    }
    return m / 1000;
  }

  /** Returns { gpx, name, km, criterion } for the route on screen. */
  async function loadRoute() {
    const lang = (document.documentElement.lang || "en").slice(0, 2);
    const fromPage = await routeFromPage();
    let exportUrl;
    let criterion;
    if (fromPage) {
      exportUrl = R.buildExportUrlFromParams(fromPage.params, lang);
      criterion = fromPage.criterion;
    } else {
      let fromUrl = null;
      try {
        fromUrl = R.parseRouteUrl(location.href);
      } catch {
        fromUrl = null;
      }
      if (!fromUrl) {
        throw new Error("No route is shown on the map. Open one in the route planner and wait until it is drawn.");
      }
      exportUrl = R.buildExportUrl(fromUrl, lang);
      criterion = fromUrl.criterion;
    }

    const res = await fetch(exportUrl, { credentials: "include" });
    const text = await res.text();
    if (!res.ok || !text.includes("<gpx")) {
      throw new Error("Mapy.com could not export the route. Reload the page and try again.");
    }
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const gpxName = doc.querySelector("trk > name, rte > name, metadata > name")?.textContent?.trim();
    return {
      gpx: text,
      name: fromPage?.title || gpxName || "Route from Mapy.com",
      km: fromPage?.km ?? distanceKm(doc),
      criterion,
    };
  }

  /* ---------- dialog ---------- */

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
    .cover {
      position: fixed; inset: 0; z-index: 2147483001; background: rgba(0,0,0,.7);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .dialog {
      position: relative; width: 100%; max-width: 440px; max-height: calc(100vh - 32px); overflow: auto;
      background: #fff; color: #000; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.2);
      padding: 24px; font-size: 16px; line-height: 1.4;
    }
    .close {
      position: absolute; top: 16px; right: 16px; width: 24px; height: 24px; padding: 0; border: 0;
      background: none; color: rgb(107,117,128); cursor: pointer;
    }
    .close svg { width: 24px; height: 24px; fill: currentColor; display: block; }
    .close:hover { color: #000; }
    h4 { margin: 0 32px 4px 0; font-size: 16px; line-height: 24px; font-weight: 700; }
    .subtitle { margin: 0 0 20px; color: rgba(1,30,57,.6); font-size: 14px; }
    .label { margin: 0 0 8px; color: rgba(1,30,57,.6); font-size: 14px; }
    .section { margin-bottom: 20px; }
    input.name {
      display: block; width: 100%; height: 40px; padding: 5px 12px; border: 1px solid #1eae00;
      border-radius: 4px; font-size: 16px; font-weight: 700; color: #000; background: #fff; outline: none;
    }
    input.name:focus { box-shadow: 0 0 0 2px rgba(30,174,0,.2); }
    input.name.invalid { border-color: #b3261e; }
    input.name.invalid:focus { box-shadow: 0 0 0 2px rgba(179,38,30,.2); }
    .required { color: #b3261e; }
    .field-error { margin: 6px 0 0; font-size: 13px; color: #b3261e; }
    .field-error:empty { display: none; }
    .success { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 24px 8px 8px; }
    .success-icon {
      width: 72px; height: 72px; border-radius: 50%; background: #1eae00; display: flex;
      align-items: center; justify-content: center; margin-bottom: 20px;
    }
    .success-icon svg { width: 44px; height: 44px; fill: #fff; }
    .success h3 { margin: 0 0 8px; font-size: 20px; line-height: 28px; font-weight: 700; color: #000; }
    .success-name { margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #1eae00; overflow-wrap: anywhere; }
    .success-text { margin: 0 0 8px; font-size: 14px; color: rgba(1,30,57,.6); max-width: 320px; }
    .success-link { margin: 0 0 28px; font-size: 14px; color: #1eae00; font-weight: 700; }
    .success .btn { min-width: 120px; }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      padding: 8px 14px; border: 1px solid #fff; border-radius: 20px; background: rgba(1,30,57,.06);
      color: #000; font-size: 14px; cursor: pointer;
    }
    .chip:hover { background: rgba(1,30,57,.1); }
    .chip[aria-checked="true"] { background: rgba(30,174,0,.1); border-color: #1eae00; color: #1eae00; }
    .devices { list-style: none; margin: 0; padding: 0; border-top: 1px solid rgba(1,30,57,.1); }
    .device {
      display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid rgba(1,30,57,.1);
      cursor: pointer; user-select: none;
    }
    .device-icon { width: 24px; height: 24px; flex: none; fill: rgb(107,117,128); }
    .device-text { flex: 1; min-width: 0; }
    .device-name { font-size: 16px; color: #000; }
    .device-sub { font-size: 13px; color: rgba(1,30,57,.6); }
    .check {
      width: 22px; height: 22px; flex: none; border-radius: 50%; border: 2px solid rgba(1,30,57,.3);
      display: flex; align-items: center; justify-content: center;
    }
    .check svg { width: 16px; height: 16px; fill: #fff; visibility: hidden; }
    .device[aria-checked="true"] .check { background: #1eae00; border-color: #1eae00; }
    .device[aria-checked="true"] .check svg { visibility: visible; }
    .device:focus-visible, .chip:focus-visible, button:focus-visible { outline: 2px solid #1eae00; outline-offset: 2px; }
    .hint { margin: 8px 0 0; font-size: 13px; color: rgba(1,30,57,.6); }
    .notice { margin: 0 0 20px; padding: 10px 12px; border-radius: 8px; font-size: 14px; background: rgba(1,30,57,.06); color: rgba(1,30,57,.8); }
    .notice.error { background: #fdeceb; color: #b3261e; }
    .notice.ok { background: rgba(30,174,0,.1); color: #157a00; }
    .notice a { color: inherit; font-weight: 700; }
    .notice:empty { display: none; }
    .footer { display: flex; justify-content: flex-end; gap: 8px; }
    .btn {
      height: 32px; padding: 6px 16px; border: 0; border-radius: 8px; font-size: 14px; line-height: 20px; cursor: pointer;
    }
    .btn.secondary { background: rgba(1,30,57,.08); color: rgba(1,30,57,.6); }
    .btn.secondary:hover { background: rgba(1,30,57,.12); }
    .btn.primary { background: #1eae00; color: #fff; }
    .btn.primary:hover { background: #1a9900; }
    .btn:disabled { opacity: .5; cursor: default; }
    .skeleton { height: 48px; border-radius: 8px; background: rgba(1,30,57,.06); }
    .account {
      display: flex; align-items: center; gap: 12px; margin: 0 0 20px; padding: 12px;
      border-radius: 8px; background: rgba(1,30,57,.04);
    }
    .avatar {
      position: relative; width: 40px; height: 40px; flex: none; border-radius: 50%; overflow: hidden; display: flex;
      align-items: center; justify-content: center; background: #1eae00; color: #fff; font-size: 15px; font-weight: 700;
    }
    .avatar.muted { background: rgba(1,30,57,.08); }
    .avatar.muted svg { width: 24px; height: 24px; fill: rgb(107,117,128); }
    .account-text { flex: 1; min-width: 0; }
    .account-name { font-size: 16px; font-weight: 700; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .account-sub { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(1,30,57,.6); }
    .account-sub a { color: inherit; }
    .dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: #1eae00; }
    .dot.off { background: rgba(1,30,57,.3); }
    .dot.error { background: #b3261e; }
    .account .btn { flex: none; }
    /* While connecting to Garmin Connect, only the account panel stays sharp. */
    .dialog > * { transition: filter .2s ease, opacity .2s ease; }
    .dialog.is-connecting > :not(.account):not(.close) {
      filter: blur(3px); opacity: .55; pointer-events: none; user-select: none;
    }
    @media (prefers-reduced-motion: reduce) { .dialog > * { transition: none; } }
  `;

  const host = document.createElement("div");
  host.id = "garsync-root";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>${CSS}</style>`;

  function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children.filter((c) => c != null));
    return node;
  }

  function svg(paths, className) {
    const span = document.createElement("span");
    span.innerHTML = `<svg viewBox="0 0 24 24" class="${className || ""}" aria-hidden="true">${paths}</svg>`;
    return span.firstChild;
  }

  /*
   * When the extension is updated or reloaded, Chrome disconnects the content
   * scripts already running in open tabs: chrome.runtime disappears and calls
   * throw "Extension context invalidated". The page then has to be reloaded.
   */
  function extensionAlive() {
    try {
      return Boolean(chrome?.runtime?.id);
    } catch {
      return false;
    }
  }

  function reloadedError() {
    return Object.assign(new Error("GarSync was updated. Reload this page to continue."), { code: "EXTENSION_RELOADED" });
  }

  function asReloaded(err) {
    return !extensionAlive() || /context invalidated/i.test(String(err?.message || err)) ? reloadedError() : err;
  }

  function send(type, payload) {
    if (!extensionAlive()) return Promise.reject(reloadedError());
    let request;
    try {
      request = chrome.runtime.sendMessage({ target: "background", type, payload });
    } catch (err) {
      return Promise.reject(asReloaded(err));
    }
    return request.then(
      (res) => {
        if (!res) throw new Error("The extension did not respond. Reload the page and try again.");
        if (!res.ok) throw Object.assign(new Error(res.error), { code: res.code });
        return res.data;
      },
      (err) => {
        throw asReloaded(err);
      },
    );
  }

  /** chrome.storage.local that survives a disconnected extension. */
  async function storageGet(key) {
    if (!extensionAlive()) throw reloadedError();
    try {
      return (await chrome.storage.local.get(key))[key];
    } catch (err) {
      throw asReloaded(err);
    }
  }

  async function storageSet(values) {
    if (!extensionAlive()) throw reloadedError();
    try {
      await chrome.storage.local.set(values);
    } catch (err) {
      throw asReloaded(err);
    }
  }

  function formatKm(km) {
    return `${km.toFixed(1)} km`;
  }

  function deviceKind(name) {
    return /edge|oregon|etrex|gpsmap|montana/i.test(name) ? "computer" : "watch";
  }

  /** A toggleable row/chip with aria-checked, Space/Enter support. */
  function toggleable(node, { onToggle, role = "checkbox" }) {
    node.setAttribute("role", role);
    node.tabIndex = 0;
    const toggle = () => onToggle();
    node.addEventListener("click", toggle);
    node.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }
    });
    return node;
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "G";
  }

  let open = false;

  async function openDialog() {
    if (open) return;
    open = true;
    if (!host.isConnected) document.documentElement.append(host);

    const account = el("div", { className: "account", ariaLive: "polite" });
    const notice = el("p", { className: "notice", textContent: "" });
    const subtitle = el("p", { className: "subtitle", textContent: "Loading route…" });
    const nameInput = el("input", { className: "name", type: "text", ariaLabel: "Route name", required: true });
    nameInput.setAttribute("aria-required", "true");
    const nameError = el("p", { className: "field-error", id: "garsync-name-error", role: "alert" });
    nameInput.setAttribute("aria-describedby", "garsync-name-error");
    const setNameError = (msg) => {
      nameError.textContent = msg;
      nameInput.classList.toggle("invalid", Boolean(msg));
      nameInput.setAttribute("aria-invalid", String(Boolean(msg)));
    };
    nameInput.addEventListener("input", () => nameInput.value.trim() && setNameError(""));
    const chips = el("div", { className: "chips", role: "radiogroup", ariaLabel: "Sport" });
    const devicesBody = el("div");
    const devicesSection = el(
      "div",
      { className: "section" },
      el("p", { className: "label", textContent: "Send to devices" }),
      devicesBody,
    );
    const sendBtn = el("button", { className: "btn primary", type: "button", textContent: "Send", disabled: true });
    const cancelBtn = el("button", { className: "btn secondary", type: "button", textContent: "Cancel" });
    const closeBtn = el("button", { className: "close", type: "button", ariaLabel: "Close" }, svg(ICON_CLOSE));

    const dialog = el(
      "div",
      { className: "dialog", role: "dialog", ariaModal: "true", ariaLabel: "Send to Garmin" },
      closeBtn,
      el("h4", { textContent: "Send to Garmin" }),
      subtitle,
      account,
      notice,
      el("div", { className: "section" }, el("p", { className: "label" }, "Route name", el("span", { className: "required", textContent: " *", ariaHidden: "true" })), nameInput, nameError),
      el("div", { className: "section" }, el("p", { className: "label", textContent: "Sport" }), chips),
      devicesSection,
      el("div", { className: "footer" }, cancelBtn, sendBtn),
    );
    const cover = el("div", { className: "cover" }, dialog);
    shadow.append(cover);

    let sport = 3;
    let route = null;
    let devices = null; // null until Garmin Connect answered
    let accountState = "loading";
    let busy = false;
    const selected = new Set();

    const renderChips = () => {
      chips.replaceChildren(
        ...SPORTS.map(([id, label]) => {
          const chip = el("div", { className: "chip", textContent: label });
          chip.setAttribute("aria-checked", String(id === sport));
          return toggleable(chip, {
            role: "radio",
            onToggle: () => {
              sport = id;
              renderChips();
              chips.querySelector('[aria-checked="true"]')?.focus();
            },
          });
        }),
      );
    };
    renderChips();

    const setNotice = (text, kind = "") => {
      notice.className = `notice ${kind}`.trim();
      notice.textContent = text;
    };

    const updateSend = () => {
      sendBtn.disabled = busy || !route || !devices;
    };

    /* --- Garmin Connect account (top of the dialog) --- */

    const renderAccount = (state, data) => {
      accountState = state;
      const connecting = state === "loading";
      dialog.classList.toggle("is-connecting", connecting);
      for (const child of dialog.children) {
        if (child !== account && child !== closeBtn) child.inert = connecting;
      }
      let avatar;
      let name;
      let sub;
      let action = null;

      if (state === "ok") {
        const profile = data || {};
        avatar = el("div", { className: "avatar", textContent: initials(profile.name), ariaHidden: "true" });
        name = el("div", { className: "account-name", textContent: profile.name || "Garmin Connect" });
        const link = profile.profileUrl
          ? el("a", { href: profile.profileUrl, target: "_blank", rel: "noopener", textContent: "Garmin Connect" })
          : "Garmin Connect";
        sub = el("div", { className: "account-sub" }, el("span", { className: "dot" }), link, " · connected");
      } else if (state === "loggedOut") {
        avatar = el("div", { className: "avatar muted" }, svg(ICON_PERSON));
        name = el("div", { className: "account-name", textContent: "Not signed in" });
        sub = el("div", { className: "account-sub" }, el("span", { className: "dot off" }), "Garmin Connect");
        action = el("button", { className: "btn primary", type: "button", textContent: "Sign in" });
        action.addEventListener("click", () => {
          send("openLogin").catch(() => {});
          account.querySelector(".account-sub").lastChild.textContent = "Garmin Connect · come back here after signing in";
        });
      } else if (state === "reloaded") {
        avatar = el("div", { className: "avatar muted" }, svg(ICON_PERSON));
        name = el("div", { className: "account-name", textContent: "GarSync was updated" });
        sub = el("div", { className: "account-sub" }, el("span", { className: "dot off" }), "Reload this page to continue.");
        action = el("button", { className: "btn primary", type: "button", textContent: "Reload page" });
        action.addEventListener("click", () => location.reload());
      } else if (state === "error") {
        avatar = el("div", { className: "avatar muted" }, svg(ICON_PERSON));
        name = el("div", { className: "account-name", textContent: "Connection error" });
        sub = el("div", { className: "account-sub" }, el("span", { className: "dot error" }), data || "Please try again.");
        action = el("button", { className: "btn secondary", type: "button", textContent: "Try again" });
        action.addEventListener("click", () => loadAccount());
      } else {
        avatar = el("div", { className: "avatar muted" }, svg(ICON_PERSON));
        name = el("div", { className: "account-name", textContent: "Garmin Connect" });
        sub = el("div", { className: "account-sub" }, el("span", { className: "dot off" }), "Connecting…");
      }
      account.replaceChildren(...[avatar, el("div", { className: "account-text" }, name, sub), action].filter(Boolean));
    };

    /* --- device list --- */

    const renderDevices = () => {
      if (accountState === "loading") {
        devicesBody.replaceChildren(el("div", { className: "skeleton" }));
        return;
      }
      if (!devices) {
        devicesBody.replaceChildren(
          el("p", {
            className: "hint",
            textContent:
              accountState === "loggedOut"
                ? "Your devices will show up here after you sign in to Garmin Connect."
                : accountState === "reloaded"
                  ? "Your devices will show up here after you reload the page."
                  : "Could not load your devices.",
          }),
        );
        return;
      }
      if (!devices.length) {
        devicesBody.replaceChildren(
          el("p", { className: "hint", textContent: "No devices are paired with this Garmin account. The route will only be saved to Garmin Connect." }),
        );
        return;
      }
      const list = el("ul", { className: "devices" });
      for (const d of devices) {
        const kind = deviceKind(d.name);
        const row = el(
          "li",
          { className: "device" },
          svg(kind === "computer" ? ICON_BIKE_COMPUTER : ICON_WATCH, "device-icon"),
          el(
            "div",
            { className: "device-text" },
            el("div", { className: "device-name", textContent: d.name }),
            el("div", {
              className: "device-sub",
              textContent: [kind === "computer" ? "Bike computer" : "Watch", d.primary ? "primary device" : ""]
                .filter(Boolean)
                .join(" · "),
            }),
          ),
          el("span", { className: "check" }, svg(ICON_CHECK)),
        );
        row.setAttribute("aria-checked", String(selected.has(d.id)));
        list.append(
          toggleable(row, {
            onToggle: () => {
              if (selected.has(d.id)) selected.delete(d.id);
              else selected.add(d.id);
              row.setAttribute("aria-checked", String(selected.has(d.id)));
            },
          }),
        );
      }
      devicesBody.replaceChildren(
        list,
        el("p", {
          className: "hint",
          textContent: "The route appears on your device after the next sync. With no device selected, it is only saved to Garmin Connect.",
        }),
      );
    };

    let accountRequest = 0;
    async function loadAccount() {
      const req = ++accountRequest;
      renderAccount("loading");
      renderDevices();
      updateSend();
      try {
        const result = await send("getAccount");
        if (req !== accountRequest) return;
        devices = result.devices || [];
        const saved = await storageGet("deviceIds");
        selected.clear();
        for (const d of devices) {
          if (Array.isArray(saved) ? saved.includes(d.id) : d.primary || devices.length === 1) selected.add(d.id);
        }
        renderAccount("ok", result.profile);
      } catch (err) {
        if (req !== accountRequest) return;
        devices = null;
        if (err.code === "NOT_LOGGED_IN") renderAccount("loggedOut");
        else if (err.code === "EXTENSION_RELOADED") renderAccount("reloaded");
        else renderAccount("error", err.message);
      }
      renderDevices();
      updateSend();
    }

    // After signing in in another tab, coming back refreshes the account.
    const onReturn = () => {
      if (document.visibilityState === "visible" && accountState === "loggedOut") loadAccount();
    };
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);

    const close = () => {
      cover.remove();
      open = false;
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
      send("done").catch(() => {});
    };
    const onKey = (e) => {
      if (!e.composedPath().includes(dialog)) return;
      if (e.key === "Escape") close();
      else if (e.key === "Enter" && e.target === nameInput && !sendBtn.disabled) sendBtn.click();
      e.stopPropagation(); // keep mapy.com keyboard shortcuts out of the dialog
    };
    document.addEventListener("keydown", onKey, true);
    cancelBtn.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    cover.addEventListener("click", (e) => e.target === cover && close());

    /** Replaces the whole dialog with the confirmation. */
    const showSuccess = (courseName, deviceNames, url) => {
      const okBtn = el("button", { className: "btn primary", type: "button", textContent: "Close" });
      okBtn.addEventListener("click", close);
      dialog.setAttribute("aria-label", "Route sent");
      dialog.replaceChildren(
        closeBtn,
        el(
          "div",
          { className: "success", role: "status" },
          el("div", { className: "success-icon" }, svg(ICON_CHECK)),
          el("h3", { textContent: deviceNames.length ? "Your route is on its way" : "Your route is in Garmin Connect" }),
          el("p", { className: "success-name", textContent: courseName }),
          el("p", {
            className: "success-text",
            textContent: deviceNames.length
              ? `It will appear on ${deviceNames.join(" and ")} after the next sync.`
              : "It has been saved to your courses in Garmin Connect.",
          }),
          url ? el("a", { className: "success-link", href: url, target: "_blank", rel: "noopener", textContent: "Open in Garmin Connect" }) : null,
          okBtn,
        ),
      );
      okBtn.focus();
    };

    sendBtn.addEventListener("click", async () => {
      if (!route || !devices) return;
      const courseName = nameInput.value.trim();
      if (!courseName) {
        setNameError("Enter a route name.");
        nameInput.focus();
        return;
      }
      const deviceIds = devices.filter((d) => selected.has(d.id)).map((d) => d.id);
      try {
        await storageSet({ deviceIds });
      } catch (err) {
        renderAccount("reloaded");
        setNotice(err.message, "error");
        return;
      }
      busy = true;
      updateSend();
      cancelBtn.disabled = true;
      sendBtn.textContent = "Sending…";
      setNotice("");
      try {
        const result = await send("uploadCourse", {
          gpx: route.gpx,
          filename: "mapy-com-route.gpx",
          name: courseName,
          activityTypePk: sport,
          deviceIds,
        });
        const names = devices.filter((d) => result.sentTo.includes(d.id)).map((d) => d.name);
        showSuccess(result.courseName || courseName, names, result.url);
        return;
      } catch (err) {
        if (err.code === "NOT_LOGGED_IN") {
          devices = null;
          renderAccount("loggedOut");
          renderDevices();
          setNotice("Your Garmin Connect session has expired. Sign in and send the route again.", "error");
        } else if (err.code === "EXTENSION_RELOADED") {
          devices = null;
          renderAccount("reloaded");
          renderDevices();
          setNotice(err.message, "error");
        } else {
          setNotice(err.message, "error");
        }
        sendBtn.textContent = "Send";
      } finally {
        busy = false;
        cancelBtn.disabled = false;
        updateSend();
        if (!sendBtn.disabled) sendBtn.focus();
      }
    });

    // Route (from mapy.com) and account (from Garmin Connect) load in parallel.
    loadAccount();
    try {
      route = await loadRoute();
      nameInput.value = route.name;
      subtitle.textContent = `Route from Mapy.com · ${formatKm(route.km)}`;
      sport = R.garminSportFor(route.criterion);
      renderChips();
    } catch (err) {
      subtitle.textContent = "Could not load the route";
      setNotice(err.message, "error");
    }
    updateSend();
  }

})();
