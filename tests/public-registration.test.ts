import assert from "node:assert/strict";
import test from "node:test";

import { publicSitemapPaths } from "../src/app/sitemap";

test("sitemap advertises discovery pages instead of account entry points", () => {
  assert.equal(publicSitemapPaths.includes("/signup" as never), false);
  assert.equal(publicSitemapPaths.includes("/login" as never), false);
  assert.equal(publicSitemapPaths.includes("/campaigns"), true);
  assert.equal(publicSitemapPaths.includes("/expeditions"), true);
  assert.equal(publicSitemapPaths.includes("/destinations"), true);
  assert.equal(publicSitemapPaths.includes("/academy"), true);
});
