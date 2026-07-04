import assert from "node:assert/strict";
import test from "node:test";

import { defaultAuthenticatedPathForAccount } from "../src/lib/account-destinations";

test("role accounts default to their dedicated portal", () => {
  assert.equal(defaultAuthenticatedPathForAccount({ roles: ["admin", "user"] }), "/admin");
  assert.equal(defaultAuthenticatedPathForAccount({ roles: ["partner", "user"] }), "/partner");
  assert.equal(defaultAuthenticatedPathForAccount({ roles: ["corporate_admin", "user"] }), "/corporate");
});

test("regular accounts default to the public user dashboard", () => {
  assert.equal(defaultAuthenticatedPathForAccount({ roles: ["user"] }), "/dashboard");
});

test("corporate permissions can route accounts without a role record", () => {
  assert.equal(defaultAuthenticatedPathForAccount({ roles: [], hasCorporateAccess: true }), "/corporate");
});
