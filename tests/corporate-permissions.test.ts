import assert from "node:assert/strict";
import test from "node:test";

import {
  assignableCorporateEmployeeRoleOptions,
  canAssignCorporateEmployeeRole,
  corporateCapabilitiesForPermission,
  normalizeCorporateEmployeeRole,
  permissionForCorporateEmployeeRole
} from "../src/lib/corporate-permissions";

test("corporate program managers can manage the full workspace workflow", () => {
  const capabilities = corporateCapabilitiesForPermission("program.manage");

  assert.equal(capabilities.canManagePrograms, true);
  assert.equal(capabilities.canManageProjects, true);
  assert.equal(capabilities.canManageSettings, true);
  assert.equal(capabilities.canGenerateReport, true);
  assert.equal(capabilities.canSubmitReport, true);
  assert.equal(capabilities.canApproveReport, true);
  assert.equal(capabilities.canPublishReport, true);
  assert.equal(capabilities.canUpdateEvidenceStatus, true);
});

test("finance reviewers can review funding and approve reports without workspace admin powers", () => {
  const capabilities = corporateCapabilitiesForPermission("finance_reviewer");

  assert.equal(capabilities.canManageFunding, true);
  assert.equal(capabilities.canApproveReport, true);
  assert.equal(capabilities.canUpdateEvidenceStatus, true);
  assert.equal(capabilities.canManageProjects, false);
  assert.equal(capabilities.canManageSettings, false);
  assert.equal(capabilities.canGenerateReport, false);
  assert.equal(capabilities.canPublishReport, false);
});

test("auditors can inspect evidence and reports without mutating review status", () => {
  const capabilities = corporateCapabilitiesForPermission("auditor");

  assert.equal(capabilities.canPreviewReport, true);
  assert.equal(capabilities.canViewEvidenceReview, true);
  assert.equal(capabilities.canUpdateEvidenceStatus, false);
  assert.equal(capabilities.canManageFunding, false);
  assert.equal(capabilities.canManageSettings, false);
});

test("employee engagement roles can only assign non-privileged employee roles", () => {
  const options = assignableCorporateEmployeeRoleOptions("employee_engagement").map((option) => option.value);

  assert.deepEqual(options, ["member", "report_viewer", "employee_engagement"]);
  assert.equal(canAssignCorporateEmployeeRole("employee_engagement", "member"), true);
  assert.equal(canAssignCorporateEmployeeRole("employee_engagement", "report_viewer"), true);
  assert.equal(canAssignCorporateEmployeeRole("employee_engagement", "employee_engagement"), true);
  assert.equal(canAssignCorporateEmployeeRole("employee_engagement", "finance_reviewer"), false);
  assert.equal(canAssignCorporateEmployeeRole("employee_engagement", "auditor"), false);
  assert.equal(canAssignCorporateEmployeeRole("employee_engagement", "program_admin"), false);
});

test("corporate employee roles normalize before mapping into portal permissions", () => {
  assert.equal(normalizeCorporateEmployeeRole("program_admin"), "program_admin");
  assert.equal(normalizeCorporateEmployeeRole("unexpected"), "member");
  assert.equal(permissionForCorporateEmployeeRole("program_admin"), "program.manage");
  assert.equal(permissionForCorporateEmployeeRole("finance_reviewer"), "finance_reviewer");
  assert.equal(permissionForCorporateEmployeeRole("unexpected"), "executive_viewer");
});
