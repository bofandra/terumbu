import assert from "node:assert/strict";
import test from "node:test";

import {
  CORPORATE_ACCESS_PERMISSION,
  CORPORATE_ADMIN_PERMISSION,
  assignableCorporateEmployeeRoleOptions,
  canAssignCorporateEmployeeRole,
  corporateCapabilitiesForPermission,
  corporatePermissionLabel,
  normalizeCorporateEmployeeRole,
  normalizeCorporatePermission,
  permissionForCorporateEmployeeRole
} from "../src/lib/corporate-permissions";

test("legacy program.manage maps to admin but other roles never escalate to admin", () => {
  assert.equal(normalizeCorporatePermission("program.manage"), CORPORATE_ADMIN_PERMISSION);
  assert.equal(normalizeCorporatePermission("finance_reviewer"), "finance_reviewer");
  assert.equal(normalizeCorporatePermission("executive_viewer"), "executive_viewer");
  assert.equal(normalizeCorporatePermission("auditor"), "auditor");
  assert.equal(normalizeCorporatePermission("unexpected"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(corporatePermissionLabel("finance_reviewer"), "Finance Reviewer");
});

test("corporate administrator retains full workflow capabilities", () => {
  for (const permission of [CORPORATE_ADMIN_PERMISSION, "program.manage"]) {
    const c = corporateCapabilitiesForPermission(permission);
    assert.equal(c.canManagePrograms, true);
    assert.equal(c.canManageProjects, true);
    assert.equal(c.canManageEmployees, true);
    assert.equal(c.canManageFunding, true);
    assert.equal(c.canManageSettings, true);
    assert.equal(c.canGenerateReport, true);
    assert.equal(c.canSubmitReport, true);
    assert.equal(c.canApproveReport, true);
    assert.equal(c.canPublishReport, true);
    assert.equal(c.canViewEvidenceReview, true);
    assert.equal(c.canUpdateEvidenceStatus, false);
  }
});

test("finance reviewer can approve reports and manage finance but not author or publish reports", () => {
  const c = corporateCapabilitiesForPermission("finance_reviewer");
  assert.equal(c.canApproveReport, true);
  assert.equal(c.canManageFunding, true);
  assert.equal(c.canGenerateReport, false);
  assert.equal(c.canSubmitReport, false);
  assert.equal(c.canPublishReport, false);
  assert.equal(c.canManagePrograms, false);
  assert.equal(c.canManageProjects, false);
  assert.equal(c.canManageSettings, false);
  assert.equal(c.canManageEmployees, false);
});

test("ESG manager can author and publish but cannot approve their own report or change security", () => {
  const c = corporateCapabilitiesForPermission("esg_manager");
  assert.equal(c.canManagePrograms, true);
  assert.equal(c.canManageProjects, true);
  assert.equal(c.canGenerateReport, true);
  assert.equal(c.canSubmitReport, true);
  assert.equal(c.canPublishReport, true);
  assert.equal(c.canApproveReport, false);
  assert.equal(c.canManageSettings, false);
  assert.equal(c.canManageFunding, false);
});

test("employee engagement role can manage employees, not funding or reports", () => {
  const c = corporateCapabilitiesForPermission("employee_engagement");
  assert.equal(c.canManageEmployees, true);
  assert.equal(c.canManageFunding, false);
  assert.equal(c.canManageProjects, false);
  assert.equal(c.canGenerateReport, false);
  assert.equal(c.canApproveReport, false);
  assert.equal(c.canManageSettings, false);
});

test("auditor and executive viewer are strictly read-only", () => {
  for (const role of ["auditor", "executive_viewer"]) {
    const c = corporateCapabilitiesForPermission(role);
    assert.equal(c.canPreviewReport, true);
    for (const [capability, allowed] of Object.entries(c)) {
      if (capability.startsWith("canManage") || capability.startsWith("canGenerate") ||
        capability.startsWith("canSubmit") || capability.startsWith("canApprove") ||
        capability.startsWith("canPublish") || capability.startsWith("canUpdate")) {
        assert.equal(allowed, false, `${role} unexpectedly has ${capability}`);
      }
    }
  }
});

test("regular corporate user cannot inherit any administration capability", () => {
  const c = corporateCapabilitiesForPermission(CORPORATE_ACCESS_PERMISSION);
  for (const allowed of Object.values(c)) assert.equal(allowed, false);
});

test("employee invitations cannot grant elevated roles and require management capability", () => {
  assert.equal(permissionForCorporateEmployeeRole("program_admin"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(permissionForCorporateEmployeeRole("finance_reviewer"), CORPORATE_ACCESS_PERMISSION);
  assert.equal(normalizeCorporateEmployeeRole("program_admin"), "member");
  assert.deepEqual(assignableCorporateEmployeeRoleOptions("employee_engagement"), [{ value: "member", label: "Employee" }]);
  assert.deepEqual(assignableCorporateEmployeeRoleOptions(CORPORATE_ACCESS_PERMISSION), []);
  assert.equal(canAssignCorporateEmployeeRole("auditor", "member"), false);
  assert.equal(canAssignCorporateEmployeeRole("finance_reviewer", "member"), false);
  assert.equal(canAssignCorporateEmployeeRole("corporate_admin", "member"), true);
});
