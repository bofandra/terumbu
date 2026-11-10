import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isLocalizedPublicPath, publicLanguageAlternates, publicLocaleHref, stripPublicLocale } from "../src/lib/public-localized-routes";

test("only approved public routes receive localized aliases", () => {
  assert.equal(isLocalizedPublicPath("/"), true);
  assert.equal(isLocalizedPublicPath("/expeditions"), true);
  assert.equal(isLocalizedPublicPath("/expeditions/reef-care"), true);
  assert.equal(isLocalizedPublicPath("/impact-map"), true);
  assert.equal(isLocalizedPublicPath("/checkout/expedition"), false);
  assert.equal(isLocalizedPublicPath("/admin"), false);
  assert.equal(publicLocaleHref("en", "/"), "/en");
  assert.equal(publicLocaleHref("id", "/impact-map"), "/id/impact-map");
  assert.equal(publicLocaleHref("id", "/expeditions/reef-care"), "/id/expeditions/reef-care");
  assert.equal(publicLocaleHref("id", "/login"), "/login");
  assert.equal(stripPublicLocale("/en/expeditions"), "/expeditions");
  assert.deepEqual(publicLanguageAlternates("/expeditions"), { en: "/en/expeditions", id: "/id/expeditions" });
});

test("the public shell is consistently branded and canonical URLs never mention eco", () => {
  const header = readFileSync("src/components/site-header.tsx","utf8");
  const footer = readFileSync("src/components/site-footer.tsx","utf8");
  const proxy = readFileSync("src/proxy.ts","utf8");
  assert.match(header, /publicLocaleHref/);
  assert.match(footer, /Terumbu.world/);
  assert.doesNotMatch(footer, /Terumbu\.eco/);
  assert.match(proxy, /terumbu_locale/);
  assert.doesNotMatch(proxy, /\/partner\//);
});
