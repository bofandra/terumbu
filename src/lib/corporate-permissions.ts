export const CORPORATE_ACCESS_PERMISSION = "corporate_user";
export const CORPORATE_ADMIN_PERMISSION = "corporate_admin";

const legacyCorporateAdminPermissions = new Set([
  CORPORATE_ADMIN_PERMISSION,
  "program.manage",
  "esg_manager",
  "finance_reviewer",
  "executive_viewer",
  "employee_engagement",
  "auditor"
]);

export const corporateEmployeeRoleOptions = [
  { value: "member", label: "Employee" }
] as const;

export type CorporateEmployeeRole = (typeof corporateEmployeeRoleOptions)[number]["value"];

export function normalizeCorporatePermission(value: string | null | undefined, fallback = CORPORATE_ACCESS_PERMISSION) {
  if (value === CORPORATE_ACCESS_PERMISSION) {
    return CORPORATE_ACCESS_PERMISSION;
  }

  return value && legacyCorporateAdminPermissions.has(value) ? CORPORATE_ADMIN_PERMISSION : fallback;
}

export function isCorporateProgramManager(permission: string | null | undefined) {
  return normalizeCorporatePermission(permission) === CORPORATE_ADMIN_PERMISSION;
}

export function corporateCapabilitiesForPermission(permission?: string | null) {
  const isAdmin = isCorporateProgramManager(permission);

  return {
    canApproveReport: isAdmin,
    canGenerateReport: isAdmin,
    canManageEmployees: isAdmin,
    canManageFunding: isAdmin,
    canManagePrograms: isAdmin,
    canManageProjects: isAdmin,
    canManageSettings: isAdmin,
    canPreviewReport: isAdmin,
    canPublishReport: isAdmin,
    canSubmitReport: isAdmin,
    canUpdateEvidenceStatus: false,
    canViewEvidenceReview: isAdmin
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
  return isCorporateProgramManager(actorPermission);
}

export function assignableCorporateEmployeeRoleOptions(actorPermission: string | null | undefined) {
  return isCorporateProgramManager(actorPermission) ? corporateEmployeeRoleOptions : [];
}
