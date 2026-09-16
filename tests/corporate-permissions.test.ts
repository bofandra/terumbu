import assert from "node:assert/strict";
import test from "node:test";

import {
  CORPORATE_ACCESS_PERMISSION,
  assignableCorporateEmployeeRoleOptions,
  canAssignCorporateEmployeeRole,
  corporateCapabilitiesForPermission,
  normalizeCorporateEmployeeRole,
  normalizeCorporatePermission,
  permissionForCorporateEmployeeRole
} from "../src/lib/corporate-permissions";

const legacyPermissions = [
  CORPORATE_ACCESS_PERMISSION,
  "program.manage",
  "esg_manager",
  "finance_reviewer",
  "executive_viewer",
  "employee_engagement",
  "auditor"
];

test("all corporate access rows map to one simple capability set", () => {
  for (const permission of legacyPermissions) {
    const capabilities = corporateCapabilitiesForPermission(permission);

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

test("new corporate access uses one canonical permission", () => {
  assert.equal(normalizeCorporatePermission("unexpected"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(permissionForCorporateEmployeeRole("program_admin"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(permissionForCorporateEmployeeRole("finance_reviewer"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(permissionForCorporateEmployeeRole("unexpected"), CORPORATE_ACCESS_PERMISSION);
});

test("employee roles are simplified for MVP", () => {
  assert.deepEqual(assignableCorporateEmployeeRoleOptions("employee_engagement"), [{ value: "member", label: "Employee" }]);
  assert.equal(normalizeCorporateEmployeeRole("program_admin"), "member");
  assert.equal(normalizeCorporateEmployeeRole("unexpected"), "member");
  assert.equal(canAssignCorporateEmployeeRole("auditor", "program_admin"), true);
});
