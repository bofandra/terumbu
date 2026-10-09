export const CORPORATE_ACCESS_PERMISSION = "corporate_user";
export const CORPORATE_ADMIN_PERMISSION = "corporate_admin";

export const corporateRoleOptions = [
  { value: CORPORATE_ACCESS_PERMISSION, label: "Corporate User" },
  { value: CORPORATE_ADMIN_PERMISSION, label: "Corporate Admin" },
  { value: "esg_manager", label: "ESG Manager" },
  { value: "finance_reviewer", label: "Finance Reviewer" },
  { value: "employee_engagement", label: "Employee Engagement Manager" },
  { value: "executive_viewer", label: "Executive Viewer" },
  { value: "auditor", label: "Auditor" }
] as const;

export const corporateEmployeeRoleOptions = [
  { value: "member", label: "Employee" }
] as const;

export type CorporateEmployeeRole = (typeof corporateEmployeeRoleOptions)[number]["value"];
export type CorporatePermission = (typeof corporateRoleOptions)[number]["value"];

// Old 'program.manage' rows were full-administrator access. Keep that narrow,
// explicit compatibility alias, but do not promote other legacy roles to admin.
export function normalizeCorporatePermission(
  value: string | null | undefined,
  fallback: CorporatePermission = CORPORATE_ACCESS_PERMISSION
): CorporatePermission {
  if (value === "program.manage") return CORPORATE_ADMIN_PERMISSION;
  return corporateRoleOptions.some((option) => option.value === value)
    ? value as CorporatePermission
    : fallback;
}

export function corporatePermissionLabel(permission: string | null | undefined) {
  const normalized = normalizeCorporatePermission(permission);
  return corporateRoleOptions.find((option) => option.value === normalized)?.label ?? "Corporate User";
}

export function isCorporateProgramManager(permission: string | null | undefined) {
  return normalizeCorporatePermission(permission) === CORPORATE_ADMIN_PERMISSION;
}

// Each capability is used at the server-action boundary. Membership grants
// program/account scope; a role grants only these operations within that scope.
export function corporateCapabilitiesForPermission(permission?: string | null) {
  const role = normalizeCorporatePermission(permission);
  const admin = role === CORPORATE_ADMIN_PERMISSION;
  const esg = role === "esg_manager";
  const finance = role === "finance_reviewer";
  const engagement = role === "employee_engagement";
  const reportReader = role !== CORPORATE_ACCESS_PERMISSION;

  return {
    canApproveReport: admin || finance,
    canGenerateReport: admin || esg,
    canManageEmployees: admin || engagement,
    canManageFunding: admin || finance,
    canManagePrograms: admin || esg,
    canManageProjects: admin || esg,
    canManageSettings: admin,
    canPreviewReport: reportReader,
    canPublishReport: admin || esg,
    canSubmitReport: admin || esg,
    canUpdateEvidenceStatus: false,
    canViewEvidenceReview: admin || esg || finance || role === "auditor"
  };
}

export function normalizeCorporateEmployeeRole(_value: string | null | undefined): CorporateEmployeeRole {
  void _value;
  return "member";
}

export function permissionForCorporateEmployeeRole(_role: string | null | undefined) {
  void _role;
  return CORPORATE_ACCESS_PERMISSION;
}

export function canAssignCorporateEmployeeRole(actorPermission: string | null | undefined, _requestedRole: string | null | undefined) {
  void _requestedRole;
  return corporateCapabilitiesForPermission(actorPermission).canManageEmployees;
}

export function assignableCorporateEmployeeRoleOptions(actorPermission: string | null | undefined) {
  return canAssignCorporateEmployeeRole(actorPermission, "member") ? corporateEmployeeRoleOptions : [];
}
