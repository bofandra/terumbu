import assert from "node:assert/strict";
import test from "node:test";

import {
  CORPORATE_ACCESS_PERMISSION,
  CORPORATE_ADMIN_PERMISSION,
  assignableCorporateEmployeeRoleOptions,
  canAssignCorporateEmployeeRole,
  corporateCapabilitiesForPermission,
  normalizeCorporateEmployeeRole,
  normalizeCorporatePermission,
  permissionForCorporateEmployeeRole
} from "../src/lib/corporate-permissions";

const legacyAdminPermissions = [
  CORPORATE_ADMIN_PERMISSION,
  "program.manage",
  "esg_manager",
  "finance_reviewer",
  "executive_viewer",
  "employee_engagement",
  "auditor"
];

test("legacy corporate admin access maps to the corporate admin capability set", () => {
  for (const permission of legacyAdminPermissions) {
    const capabilities = corporateCapabilitiesForPermission(permission);

    assert.equal(normalizeCorporatePermission(permission), CORPORATE_ADMIN_PERMISSION);
    assert.equal(capabilities.canManagePrograms, true);
    assert.equal(capabilities.canManageProjects, true);
    assert.equal(capabilities.canManageEmployees, true);
    assert.equal(capabilities.canManageSettings, true);
    assert.equal(capabilities.canGenerateReport, true);
    assert.equal(capabilities.canSubmitReport, true);
    assert.equal(capabilities.canApproveReport, true);
    assert.equal(capabilities.canPublishReport, true);
    assert.equal(capabilities.canViewEvidenceReview, true);
    assert.equal(capabilities.canUpdateEvidenceStatus, false);
  }
});

test("employee corporate access cannot inherit corporate admin capabilities", () => {
  const capabilities = corporateCapabilitiesForPermission(CORPORATE_ACCESS_PERMISSION);

  assert.equal(capabilities.canManagePrograms, false);
  assert.equal(capabilities.canManageProjects, false);
  assert.equal(capabilities.canManageEmployees, false);
  assert.equal(capabilities.canManageSettings, false);
  assert.equal(capabilities.canGenerateReport, false);
  assert.equal(capabilities.canSubmitReport, false);
  assert.equal(capabilities.canApproveReport, false);
  assert.equal(capabilities.canPublishReport, false);
  assert.equal(capabilities.canViewEvidenceReview, false);
  assert.equal(capabilities.canUpdateEvidenceStatus, false);
});

test("new employee access uses one canonical permission", () => {
  assert.equal(normalizeCorporatePermission("unexpected"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(permissionForCorporateEmployeeRole("program_admin"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(permissionForCorporateEmployeeRole("finance_reviewer"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(permissionForCorporateEmployeeRole("unexpected"), CORPORATE_ACCESS_PERMISSION);
});

test("employee roles are simplified and only corporate admins can assign them", () => {
  assert.deepEqual(assignableCorporateEmployeeRoleOptions("employee_engagement"), [{ value: "member", label: "Employee" }]);
  assert.deepEqual(assignableCorporateEmployeeRoleOptions(CORPORATE_ACCESS_PERMISSION), []);
  assert.equal(normalizeCorporateEmployeeRole("program_admin"), "member");
  assert.equal(normalizeCorporateEmployeeRole("unexpected"), "member");
  assert.equal(canAssignCorporateEmployeeRole("auditor", "program_admin"), true);
  assert.equal(canAssignCorporateEmployeeRole(CORPORATE_ACCESS_PERMISSION, "member"), false);
});
