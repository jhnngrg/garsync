// Run with: node extension/test/i18n.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("../lib/i18n.js", import.meta.url), "utf8"), ctx);
const I = ctx.GarSyncI18n;

// Both languages define exactly the same keys.
const en = Object.keys(I.STRINGS.en).sort();
const cs = Object.keys(I.STRINGS.cs).sort();
assert.deepEqual(cs, en, "en and cs must have the same keys");

// Placeholders match between languages.
const holes = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
for (const key of en) assert.equal(holes(I.STRINGS.cs[key]), holes(I.STRINGS.en[key]), `placeholders differ for ${key}`);

// "auto" follows the browser; explicit choices win.
assert.equal(I.resolve("auto", "cs-CZ"), "cs");
assert.equal(I.resolve("auto", "sk"), "cs");
assert.equal(I.resolve("auto", "en-US"), "en");
assert.equal(I.resolve("auto", "de-DE"), "en");
assert.equal(I.resolve("en", "cs-CZ"), "en");
assert.equal(I.resolve("cs", "en-US"), "cs");

// Translation with parameters, fallback and error codes.
const t = I.translator("cs");
assert.equal(t("routeFrom", { km: "21,9 km" }), "Trasa z Mapy.com · 21,9 km");
assert.equal(t("error.HTTP_ERROR", { status: 500 }), "Garmin Connect vrátil chybu 500. Zkus to prosím později.");
assert.equal(I.errorText(t, { code: "NOT_LOGGED_IN", message: "x" }), "Nejsi přihlášený do Garmin Connect.");
assert.equal(I.errorText(t, { message: "Raw message" }), "Raw message");
assert.equal(I.errorText(t, { code: "UNKNOWN_CODE", message: "Raw message" }), "Raw message");

console.log("i18n: all tests passed");
