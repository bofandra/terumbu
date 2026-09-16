import assert from "node:assert/strict";
import test from "node:test";

import {
  adminAssignableCorporatePermissionOptions,
  adminCreateUserAccessOptions,
  defaultNameForGlobalRole,
  isSystemGlobalRole,
  normalizeAdminCreateUserAccess,
  normalizeAdminCorporatePermission,
  normalizeCorporatePermission,
  normalizeGlobalRoleKey,
  normalizePartnerMembershipStatus,
  safeAdminUsersReturnPath
} from "../src/lib/admin-user-management";

test("admin global role keys normalize into safe database keys", () => {
  assert.equal(normalizeGlobalRoleKey("Corporate Admin"), "corporate_admin");
  assert.equal(normalizeGlobalRoleKey(" finance-reviewer! "), "finance-reviewer");
  assert.equal(normalizeGlobalRoleKey("Partner:Owner"), "partner:owner");
});

test("admin role helpers distinguish system and custom role labels", () => {
  assert.equal(isSystemGlobalRole("admin"), true);
  assert.equal(isSystemGlobalRole("partner_owner"), false);
  assert.equal(defaultNameForGlobalRole("corporate_admin"), "Corporate User");
  assert.equal(defaultNameForGlobalRole("partner_owner"), "Partner Owner");
});

test("admin scoped role values normalize defensively", () => {
  assert.equal(normalizePartnerMembershipStatus("suspended"), "suspended");
  assert.equal(normalizePartnerMembershipStatus("unknown"), "active");
  assert.equal(normalizeCorporatePermission("auditor"), "auditor");
  assert.equal(normalizeCorporatePermission("unknown"), "corporate_user");
  assert.equal(normalizeAdminCorporatePermission("finance_reviewer"), "corporate_user");
});

test("admin create user access options expose one corporate access choice", () => {
  const values = adminCreateUserAccessOptions.map((option) => option.value);

  assert.deepEqual(values, ["global:user", "corporate:corporate_user", "partner", "global:admin"]);
  assert.deepEqual(adminAssignableCorporatePermissionOptions.map((option) => option.value), ["corporate_user"]);
});

test("admin create user access normalizes global, partner, and corporate access", () => {
  assert.deepEqual(normalizeAdminCreateUserAccess("global:admin"), { type: "global", roleKey: "admin" });
  assert.deepEqual(normalizeAdminCreateUserAccess("partner"), { type: "partner", roleKey: "partner" });
  assert.deepEqual(normalizeAdminCreateUserAccess("corporate:corporate_user"), {
    type: "corporate",
    roleKey: "corporate_admin",
    corporatePermission: "corporate_user"
  });
  assert.deepEqual(normalizeAdminCreateUserAccess("corporate:finance_reviewer"), {
    type: "corporate",
    roleKey: "corporate_admin",
    corporatePermission: "corporate_user"
  });
});

test("admin user return paths stay inside the user management page", () => {
  assert.equal(safeAdminUsersReturnPath("/admin/users?q=reef"), "/admin/users?q=reef");
  assert.equal(safeAdminUsersReturnPath("/admin/corporate"), "/admin/users");
  assert.equal(safeAdminUsersReturnPath("https://example.com/admin/users"), "/admin/users");
});
