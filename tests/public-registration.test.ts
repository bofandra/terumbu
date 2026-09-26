import assert from "node:assert/strict";
import test from "node:test";

import sitemap from "../src/app/sitemap";

test("public registration is not advertised", async () => {
  const paths = (await sitemap()).map((entry) => new URL(entry.url).pathname);

  assert.equal(paths.includes("/signup"), false);
  assert.equal(paths.includes("/login"), true);
});
