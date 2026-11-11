import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import {
  isPublicSeoPath,
  localizedSeoPath,
  publicLocaleHref,
  publicSeoAlternates,
  resolveLocalizedPublicPath
} from "../src/lib/public-locale-routing";

test("only approved public acquisition URLs have language variants", () => {
  assert.deepEqual(resolveLocalizedPublicPath("/en"), { locale: "en", path: "/" });
  assert.deepEqual(resolveLocalizedPublicPath("/id/expeditions"), { locale: "id", path: "/expeditions" });
  assert.deepEqual(resolveLocalizedPublicPath("/en/expeditions/reef-trip"), { locale: "en", path: "/expeditions/reef-trip" });
  assert.deepEqual(resolveLocalizedPublicPath("/id/impact-map"), { locale: "id", path: "/impact-map" });
  for (const path of ["/id/admin", "/en/dashboard", "/en/checkout", "/en/academy", "/en/api", "/fr/expeditions"]) {
    assert.equal(resolveLocalizedPublicPath(path), null, path);
  }
  assert.equal(isPublicSeoPath("/expeditions/reef-trip"), true);
  assert.equal(isPublicSeoPath("/admin"), false);
  assert.throws(() => localizedSeoPath("/checkout", "id"));
});

test("public locale URLs retain queries, departures and reciprocal hreflang", () => {
  assert.equal(publicLocaleHref("/expeditions?dateFrom=2027-01-01&participants=3", "en"), "/en/expeditions?dateFrom=2027-01-01&participants=3");
  assert.equal(publicLocaleHref("/expeditions/reef-trip?departure=123#availability", "id"), "/id/expeditions/reef-trip?departure=123#availability");
  assert.equal(publicLocaleHref("/campaigns/reef", "id"), "/campaigns/reef");
  assert.deepEqual(publicSeoAlternates("/impact-map"), {
    en: "/en/impact-map",
    id: "/id/impact-map",
    "x-default": "/en/impact-map"
  });
});

test("public URL locale rewrite preserves the search query and security header policy", () => {
  const response = proxy(new NextRequest("https://terumbu.world/id/expeditions?participants=2"));
  assert.equal(response.headers.get("x-middleware-rewrite"), "https://terumbu.world/expeditions?participants=2");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  const protectedPath = proxy(new NextRequest("https://terumbu.world/admin"));
  assert.equal(protectedPath.headers.get("x-middleware-rewrite"), null);
});
