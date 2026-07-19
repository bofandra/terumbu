export const corporateEmployeeRoleOptions = [
  { value: "member", label: "Member" },
  { value: "report_viewer", label: "Report viewer" },
  { value: "employee_engagement", label: "Engagement" },
  { value: "finance_reviewer", label: "Finance reviewer" },
  { value: "auditor", label: "Auditor" },
  { value: "program_admin", label: "Program admin" }
] as const;

export type CorporateEmployeeRole = (typeof corporateEmployeeRoleOptions)[number]["value"];

const managerPermissions = new Set(["program.manage", "esg_manager"]);
const knownPermissions = new Set([
  "program.manage",
  "esg_manager",
  "finance_reviewer",
  "executive_viewer",
  "employee_engagement",
  "auditor"
]);

const employeeRolePermissions: Record<CorporateEmployeeRole, string> = {
  program_admin: "program.manage",
  finance_reviewer: "finance_reviewer",
  employee_engagement: "employee_engagement",
  auditor: "auditor",
  report_viewer: "executive_viewer",
  member: "executive_viewer"
};

const employeeEngagementAssignableRoles = new Set<CorporateEmployeeRole>(["member", "report_viewer", "employee_engagement"]);

export function normalizeCorporatePermission(value: string | null | undefined, fallback = "executive_viewer") {
  return value && knownPermissions.has(value) ? value : fallback;
}

export function isCorporateProgramManager(permission: string | null | undefined) {
  return managerPermissions.has(normalizeCorporatePermission(permission));
}

export function corporateCapabilitiesForPermission(permission: string | null | undefined) {
  const value = normalizeCorporatePermission(permission);
  const isManager = isCorporateProgramManager(value);
  const isFinance = value === "finance_reviewer";
  const isExecutive = value === "executive_viewer";
  const isEmployeeEngagement = value === "employee_engagement";
  const isAuditor = value === "auditor";

  return {
    canApproveReport: isManager || isFinance,
    canGenerateReport: isManager,
    canManageEmployees: isManager || isEmployeeEngagement,
    canManageFunding: isManager || isFinance,
    canManagePrograms: isManager,
    canManageProjects: isManager,
    canManageSettings: isManager,
    canPreviewReport: isManager || isFinance || isExecutive || isEmployeeEngagement || isAuditor,
    canPublishReport: isManager,
    canSubmitReport: isManager,
    canUpdateEvidenceStatus: false,
    canViewEvidenceReview: isManager || isFinance || isAuditor
  };
}

export function normalizeCorporateEmployeeRole(value: string | null | undefined): CorporateEmployeeRole {
  return corporateEmployeeRoleOptions.some((option) => option.value === value) ? (value as CorporateEmployeeRole) : "member";
}

export function permissionForCorporateEmployeeRole(role: string | null | undefined) {
  return employeeRolePermissions[normalizeCorporateEmployeeRole(role)];
}

export function canAssignCorporateEmployeeRole(actorPermission: string | null | undefined, requestedRole: string | null | undefined) {
  const role = normalizeCorporateEmployeeRole(requestedRole);

  if (isCorporateProgramManager(actorPermission)) {
    return true;
  }

  return normalizeCorporatePermission(actorPermission) === "employee_engagement" && employeeEngagementAssignableRoles.has(role);
}

export function assignableCorporateEmployeeRoleOptions(actorPermission: string | null | undefined) {
  if (isCorporateProgramManager(actorPermission)) {
    return corporateEmployeeRoleOptions;
  }

  if (normalizeCorporatePermission(actorPermission) === "employee_engagement") {
    return corporateEmployeeRoleOptions.filter((option) => employeeEngagementAssignableRoles.has(option.value));
  }

  return [];
}
