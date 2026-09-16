export const CORPORATE_ACCESS_PERMISSION = "corporate_user";

const legacyCorporatePermissions = new Set([
  CORPORATE_ACCESS_PERMISSION,
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
  return value && legacyCorporatePermissions.has(value) ? value : fallback;
}

export function isCorporateProgramManager(permission: string | null | undefined) {
  return legacyCorporatePermissions.has(normalizeCorporatePermission(permission));
}

export function corporateCapabilitiesForPermission(_permission?: string | null) {
  return {
    canApproveReport: true,
    canGenerateReport: true,
    canManageEmployees: true,
    canManageFunding: true,
    canManagePrograms: true,
    canManageProjects: true,
    canManageSettings: true,
    canPreviewReport: true,
    canPublishReport: true,
    canSubmitReport: true,
    canUpdateEvidenceStatus: false,
    canViewEvidenceReview: true
  };
}

export function normalizeCorporateEmployeeRole(_value: string | null | undefined): CorporateEmployeeRole {
  return "member";
}

export function permissionForCorporateEmployeeRole(_role: string | null | undefined) {
  return CORPORATE_ACCESS_PERMISSION;
}

export function canAssignCorporateEmployeeRole(_actorPermission: string | null | undefined, _requestedRole: string | null | undefined) {
  return true;
}

export function assignableCorporateEmployeeRoleOptions(_actorPermission: string | null | undefined) {
  return corporateEmployeeRoleOptions;
}
