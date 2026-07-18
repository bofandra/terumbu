import assert from "node:assert/strict";
import test from "node:test";

import {
  adminCreateUserAccessOptions,
  defaultNameForGlobalRole,
  isSystemGlobalRole,
  normalizeAdminCreateUserAccess,
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
  assert.equal(defaultNameForGlobalRole("corporate_admin"), "Corporate Admin");
  assert.equal(defaultNameForGlobalRole("partner_owner"), "Partner Owner");
});

test("admin scoped role values normalize defensively", () => {
  assert.equal(normalizePartnerMembershipStatus("suspended"), "suspended");
  assert.equal(normalizePartnerMembershipStatus("unknown"), "active");
  assert.equal(normalizeCorporatePermission("auditor"), "auditor");
  assert.equal(normalizeCorporatePermission("unknown"), "executive_viewer");
});

test("admin create user access options include RBAC matrix corporate sub-roles", () => {
  const values = adminCreateUserAccessOptions.map((option) => option.value);

  assert.deepEqual(values, [
    "global:user",
    "corporate:program.manage",
    "corporate:esg_manager",
    "corporate:finance_reviewer",
    "corporate:executive_viewer",
    "corporate:employee_engagement",
    "corporate:auditor",
    "partner",
    "global:admin"
  ]);
});

test("admin create user access normalizes global, partner, and scoped corporate roles", () => {
  assert.deepEqual(normalizeAdminCreateUserAccess("global:admin"), { type: "global", roleKey: "admin" });
  assert.deepEqual(normalizeAdminCreateUserAccess("partner"), { type: "partner", roleKey: "partner" });
  assert.deepEqual(normalizeAdminCreateUserAccess("corporate:program.manage"), {
    type: "corporate",
    roleKey: "corporate_admin",
    corporatePermission: "program.manage"
  });
  assert.deepEqual(normalizeAdminCreateUserAccess("corporate:finance_reviewer"), {
    type: "corporate",
    roleKey: null,
    corporatePermission: "finance_reviewer"
  });
});

test("admin user return paths stay inside the user management page", () => {
  assert.equal(safeAdminUsersReturnPath("/admin/users?q=reef"), "/admin/users?q=reef");
  assert.equal(safeAdminUsersReturnPath("/admin/corporate"), "/admin/users");
  assert.equal(safeAdminUsersReturnPath("https://example.com/admin/users"), "/admin/users");
});
