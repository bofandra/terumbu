import assert from "node:assert/strict";
import test from "node:test";

import { createPasswordHash, verifyPassword } from "../src/lib/password";

test("password hashes verify only the original password", () => {
  const hash = createPasswordHash("TerumbuDemo2026!", "fixed-test-salt");

  assert.equal(verifyPassword("TerumbuDemo2026!", hash), true);
  assert.equal(verifyPassword("wrong-password", hash), false);
});

test("invalid stored password hashes are rejected", () => {
  assert.equal(verifyPassword("secret", null), false);
  assert.equal(verifyPassword("secret", "not-a-supported-hash"), false);
});
