import assert from "node:assert/strict";
import test from "node:test";

import { forbiddenRedirectPath, defaultAuthenticatedPathForAccount, internalRedirectPath } from "../src/lib/account-destinations";

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

test("forbidden redirects preserve the requested protected path", () => {
  assert.equal(forbiddenRedirectPath("/admin/campaigns"), "/forbidden?next=%2Fadmin%2Fcampaigns");
  assert.equal(forbiddenRedirectPath("/partner/evidence"), "/forbidden?next=%2Fpartner%2Fevidence");
  assert.equal(forbiddenRedirectPath("/corporate/reports"), "/forbidden?next=%2Fcorporate%2Freports");
});

test("internal redirect paths reject external or missing values", () => {
  assert.equal(internalRedirectPath("https://example.com/admin"), "/dashboard");
  assert.equal(internalRedirectPath("//example.com/admin"), "/dashboard");
  assert.equal(internalRedirectPath(null, "/login"), "/login");
});
