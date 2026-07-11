export const systemGlobalRoleOptions = [
  { key: "user", name: "User" },
  { key: "partner", name: "Partner" },
  { key: "corporate_admin", name: "Corporate Admin" },
  { key: "admin", name: "Admin" }
] as const;

export const systemGlobalRoleKeys = systemGlobalRoleOptions.map((role) => role.key);

export const partnerMembershipStatuses = ["active", "invited", "suspended"] as const;
export const corporatePermissionOptions = [
  { value: "program.manage", label: "Program Admin" },
  { value: "esg_manager", label: "ESG Manager" },
  { value: "finance_reviewer", label: "Finance Reviewer" },
  { value: "employee_engagement", label: "Employee Engagement" },
  { value: "executive_viewer", label: "Executive Viewer" },
  { value: "auditor", label: "Auditor" }
] as const;

export type CorporatePermissionValue = (typeof corporatePermissionOptions)[number]["value"];

export function normalizeGlobalRoleKey(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export function isSystemGlobalRole(key: string | null | undefined) {
  return systemGlobalRoleKeys.includes(String(key ?? "") as (typeof systemGlobalRoleKeys)[number]);
}

export function defaultNameForGlobalRole(key: string) {
  return systemGlobalRoleOptions.find((role) => role.key === key)?.name ?? key.replace(/[_:-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizePartnerMembershipStatus(value: string | null | undefined) {
  return partnerMembershipStatuses.includes(value as (typeof partnerMembershipStatuses)[number])
    ? (value as (typeof partnerMembershipStatuses)[number])
    : "active";
}

export function normalizeCorporatePermission(value: string | null | undefined): CorporatePermissionValue {
  return corporatePermissionOptions.some((option) => option.value === value) ? (value as CorporatePermissionValue) : "executive_viewer";
}

export function safeAdminUsersReturnPath(value: string | null | undefined) {
  return value?.startsWith("/admin/users") ? value : "/admin/users";
}
