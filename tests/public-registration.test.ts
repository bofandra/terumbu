import assert from "node:assert/strict";
import test from "node:test";

import { publicSitemapPaths } from "../src/app/sitemap";

test("public registration is not advertised", () => {
  assert.equal(publicSitemapPaths.includes("/signup" as never), false);
  assert.equal(publicSitemapPaths.includes("/login"), true);
});
