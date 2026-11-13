/*
 * UI texts in English and Czech, shared by the Mapy.com dialog and the toolbar
 * panel. The chosen language is stored in chrome.storage.local ("language":
 * "auto" | "en" | "cs"); "auto" follows the browser language (cs/sk -> Czech).
 *
 *   const { lang, t } = await GarSyncI18n.load();
 *   t("routeFrom", { km: "21.9 km" })
 */
(function (root) {
  const STRINGS = {
    en: {
      // Mapy.com route panel
      sendToGarmin: "Send to Garmin",

      // Send dialog
      loadingRoute: "Loading route…",
      routeFrom: "Route from Mapy.com · {km}",
      routeLoadFailed: "Could not load the route",
      defaultRouteName: "Route from Mapy.com",
      routeName: "Route name",
      routeNameRequired: "Enter a route name.",
      sport: "Sport",
      "sport.hiking": "Hiking",
      "sport.walking": "Walking",
      "sport.running": "Running",
      "sport.trailRunning": "Trail running",
      "sport.cycling": "Cycling",
      "sport.mountainBiking": "Mountain biking",
      "sport.roadCycling": "Road cycling",
      "sport.other": "Other",
      sendToDevices: "Send to devices",
      cancel: "Cancel",
      close: "Close",
      send: "Send",
      sending: "Sending…",

      // Garmin Connect account panel
      connecting: "Connecting…",
      connected: "connected",
      notSignedIn: "Not signed in",
      signIn: "Sign in",
      comeBackAfterSignIn: "come back here after signing in",
      comeBackAfterSignInSentence: "Come back here after signing in",
      connectionError: "Connection error",
      pleaseTryAgain: "Please try again.",
      tryAgain: "Try again",
      stillConnecting: "Still connecting…",
      notSignedInQuestion: "Not signed in to Garmin Connect?",
      updatedTitle: "GarSync was updated",
      reloadToContinue: "Reload this page to continue.",
      reloadPage: "Reload page",

      // Devices
      devicesAfterSignIn: "Your devices will show up here after you sign in to Garmin Connect.",
      devicesAfterReload: "Your devices will show up here after you reload the page.",
      devicesLoadFailed: "Could not load your devices.",
      noDevices: "No devices are paired with this Garmin account. The route will only be saved to Garmin Connect.",
      deviceHint: "The route appears on your device after the next sync. With no device selected, it is only saved to Garmin Connect.",
      watch: "Watch",
      bikeComputer: "Bike computer",
      primaryDevice: "primary device",

      // Success
      routeSent: "Route sent",
      successTitleDevices: "Your route is on its way",
      successTitleSaved: "Your route is in Garmin Connect",
      successDevicesOne: "It will appear on {devices} after the next sync.",
      successDevicesMany: "It will appear on {devices} after the next sync.",
      successSaved: "It has been saved to your courses in Garmin Connect.",
      openInGarmin: "Open in Garmin Connect",
      and: "and",
      sessionExpired: "Your Garmin Connect session has expired. Sign in and send the route again.",

      // Errors (by code)
      "error.NO_ROUTE": "No route is shown on the map. Open one in the route planner and wait until it is drawn.",
      "error.EXPORT_FAILED": "Mapy.com could not export the route. Reload the page and try again.",
      "error.NO_RESPONSE": "The extension did not respond. Reload the page and try again.",
      "error.EXTENSION_RELOADED": "GarSync was updated. Reload this page to continue.",
      "error.NOT_LOGGED_IN": "You are not signed in to Garmin Connect.",
      "error.TAB_CLOSED": "The Garmin Connect tab was closed.",
      "error.TAB_TIMEOUT": "Garmin Connect did not load in time. Please try again.",
      "error.SESSION_MISSING": "Could not load your Garmin Connect session. Are you signed in at connect.garmin.com?",
      "error.UNEXPECTED_RESPONSE": "Garmin Connect returned an unexpected page. Please try again.",
      "error.HTTP_ERROR": "Garmin Connect returned error {status}. Please try again later.",
      "error.GPX_UNREADABLE": "Garmin Connect could not read the route from Mapy.com.",
      "error.NOT_SAVED": "Garmin Connect did not confirm the route was saved.",

      // Toolbar panel
      version: "Version {version}",
      lead: "Send routes planned on Mapy.com to Garmin Connect and your Garmin watch or bike computer in one click.",
      step1: "Plan or open a route on Mapy.com.",
      step2a: "In the route panel, click",
      step2b: "below Save / Share / Export:",
      step3a: "Pick your devices and click",
      mockSave: "Save",
      mockShare: "Share",
      mockExport: "Export",
      openMapy: "Open Mapy.com",
      mapyUrl: "https://mapy.com/en/turisticka?planovani-trasy",
      note: "You need to be signed in to Garmin Connect in this browser. The route appears on your device after the next sync.",
      language: "Language",
      languageAuto: "Auto",
      support: "Support this project",
      disclaimer: "Unofficial add-on. Not affiliated with Garmin or Seznam.cz.",
      sourceCode: "Source code",
      privacy: "Privacy",
      reportProblem: "Report a problem",
    },

    cs: {
      sendToGarmin: "Poslat do Garminu",

      loadingRoute: "Načítám trasu…",
      routeFrom: "Trasa z Mapy.com · {km}",
      routeLoadFailed: "Trasu se nepodařilo načíst",
      defaultRouteName: "Trasa z Mapy.com",
      routeName: "Název trasy",
      routeNameRequired: "Zadej název trasy.",
      sport: "Sport",
      "sport.hiking": "Turistika",
      "sport.walking": "Chůze",
      "sport.running": "Běh",
      "sport.trailRunning": "Trailový běh",
      "sport.cycling": "Kolo",
      "sport.mountainBiking": "Horské kolo",
      "sport.roadCycling": "Silniční kolo",
      "sport.other": "Jiné",
      sendToDevices: "Poslat do zařízení",
      cancel: "Zrušit",
      close: "Zavřít",
      send: "Odeslat",
      sending: "Odesílám…",

      connecting: "Připojuji se…",
      connected: "připojeno",
      notSignedIn: "Nepřihlášeno",
      signIn: "Přihlásit se",
      comeBackAfterSignIn: "po přihlášení se sem vrať",
      comeBackAfterSignInSentence: "Po přihlášení se sem vrať",
      connectionError: "Chyba připojení",
      pleaseTryAgain: "Zkus to prosím znovu.",
      tryAgain: "Zkusit znovu",
      stillConnecting: "Pořád se připojuji…",
      notSignedInQuestion: "Nejsi přihlášený do Garmin Connect?",
      updatedTitle: "GarSync byl aktualizován",
      reloadToContinue: "Pro pokračování obnov stránku.",
      reloadPage: "Obnovit stránku",

      devicesAfterSignIn: "Po přihlášení do Garmin Connect se tu ukážou tvoje zařízení.",
      devicesAfterReload: "Po obnovení stránky se tu ukážou tvoje zařízení.",
      devicesLoadFailed: "Zařízení se nepodařilo načíst.",
      noDevices: "K účtu Garmin není připojené žádné zařízení. Trasa se jen uloží do Garmin Connect.",
      deviceHint: "Trasa se v zařízení objeví po další synchronizaci. Bez výběru zařízení se jen uloží do Garmin Connect.",
      watch: "Hodinky",
      bikeComputer: "Cyklopočítač",
      primaryDevice: "hlavní zařízení",

      routeSent: "Trasa odeslána",
      successTitleDevices: "Trasa je na cestě do Garminu",
      successTitleSaved: "Trasa je v Garmin Connect",
      successDevicesOne: "V zařízení {devices} se objeví po další synchronizaci.",
      successDevicesMany: "V zařízeních {devices} se objeví po další synchronizaci.",
      successSaved: "Uložili jsme ji mezi tvoje trasy v Garmin Connect.",
      openInGarmin: "Otevřít v Garmin Connect",
      and: "a",
      sessionExpired: "Přihlášení do Garmin Connect vypršelo. Přihlas se a odešli trasu znovu.",

      "error.NO_ROUTE": "Na mapě není zobrazená žádná trasa. Otevři ji v plánovači a počkej, až se vykreslí.",
      "error.EXPORT_FAILED": "Mapy.com trasu nevyexportovaly. Obnov stránku a zkus to znovu.",
      "error.NO_RESPONSE": "Rozšíření neodpovědělo. Obnov stránku a zkus to znovu.",
      "error.EXTENSION_RELOADED": "GarSync byl aktualizován. Pro pokračování obnov stránku.",
      "error.NOT_LOGGED_IN": "Nejsi přihlášený do Garmin Connect.",
      "error.TAB_CLOSED": "Záložka Garmin Connect byla zavřena.",
      "error.TAB_TIMEOUT": "Garmin Connect se nenačetl včas. Zkus to prosím znovu.",
      "error.SESSION_MISSING": "Nepodařilo se načíst přihlášení Garmin Connect. Jsi přihlášený na connect.garmin.com?",
      "error.UNEXPECTED_RESPONSE": "Garmin Connect vrátil nečekanou stránku. Zkus to prosím znovu.",
      "error.HTTP_ERROR": "Garmin Connect vrátil chybu {status}. Zkus to prosím později.",
      "error.GPX_UNREADABLE": "Garmin Connect nedokázal načíst trasu z Mapy.com.",
      "error.NOT_SAVED": "Garmin Connect nepotvrdil, že trasu uložil.",

      version: "Verze {version}",
      lead: "Pošle trasu naplánovanou na Mapy.com jedním kliknutím do Garmin Connect a do hodinek nebo cyklopočítače Garmin.",
      step1: "Naplánuj nebo otevři trasu na Mapy.com.",
      step2a: "V panelu trasy klikni na",
      step2b: "pod Uložit / Sdílet / Exportovat:",
      step3a: "Vyber zařízení a klikni na",
      mockSave: "Uložit",
      mockShare: "Sdílet",
      mockExport: "Exportovat",
      openMapy: "Otevřít Mapy.com",
      mapyUrl: "https://mapy.com/cs/turisticka?planovani-trasy",
      note: "V tomto prohlížeči musíš být přihlášený do Garmin Connect. Trasa se v zařízení objeví po další synchronizaci.",
      language: "Jazyk",
      languageAuto: "Auto",
      support: "Podpořit projekt",
      disclaimer: "Neoficiální doplněk. Nesouvisí se společnostmi Garmin ani Seznam.cz.",
      sourceCode: "Zdrojový kód",
      privacy: "Soukromí",
      reportProblem: "Nahlásit problém",
    },
  };

  const SETTINGS = ["auto", "en", "cs"];

  /** "auto" follows the browser: Czech for cs/sk, English otherwise. */
  function resolve(setting, browserLanguage) {
    if (setting === "en" || setting === "cs") return setting;
    return /^(cs|sk)\b/i.test(browserLanguage || "") ? "cs" : "en";
  }

  function translator(lang) {
    const dict = STRINGS[lang] || STRINGS.en;
    return (key, params = {}) => {
      let text = dict[key] ?? STRINGS.en[key] ?? key;
      for (const [name, value] of Object.entries(params)) text = text.split(`{${name}}`).join(String(value));
      return text;
    };
  }

  async function getSetting() {
    try {
      const { language } = await chrome.storage.local.get("language");
      return SETTINGS.includes(language) ? language : "auto";
    } catch {
      return "auto";
    }
  }

  async function load() {
    const setting = await getSetting();
    const lang = resolve(setting, globalThis.navigator?.language);
    return { setting, lang, t: translator(lang) };
  }

  /** Localized text for an error with a code, or its own message. */
  function errorText(t, err) {
    const key = err?.code ? `error.${err.code}` : null;
    if (key && STRINGS.en[key]) return t(key, err.params || {});
    return String(err?.message || err);
  }

  root.GarSyncI18n = { STRINGS, SETTINGS, resolve, translator, load, errorText };
})(typeof globalThis !== "undefined" ? globalThis : this);
