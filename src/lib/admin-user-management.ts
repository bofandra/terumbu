export const systemGlobalRoleOptions = [
  { key: "user", name: "User" },
  { key: "partner", name: "Partner" },
  { key: "corporate_admin", name: "Corporate User" },
  { key: "admin", name: "Admin" }
] as const;

export const systemGlobalRoleKeys = systemGlobalRoleOptions.map((role) => role.key);

export const partnerMembershipStatuses = ["active", "invited", "suspended"] as const;
export const corporatePermissionOptions = [
  { value: "corporate_user", label: "Corporate User" },
  { value: "program.manage", label: "Corporate User" },
  { value: "esg_manager", label: "Corporate User" },
  { value: "finance_reviewer", label: "Corporate User" },
  { value: "employee_engagement", label: "Corporate User" },
  { value: "executive_viewer", label: "Corporate User" },
  { value: "auditor", label: "Corporate User" }
] as const;

export type CorporatePermissionValue = (typeof corporatePermissionOptions)[number]["value"];
export const adminAssignableCorporatePermissionOptions = [
  { value: "corporate_user", label: "Corporate User" }
] as const;
export type AdminCreateUserAccess =
  | { type: "global"; roleKey: string; corporatePermission?: never }
  | { type: "partner"; roleKey: "partner"; corporatePermission?: never }
  | { type: "corporate"; roleKey: "corporate_admin"; corporatePermission: "corporate_user" };

export const adminCreateUserAccessOptions = [
  { value: "global:user", label: "User" },
  { value: "corporate:corporate_user", label: "Corporate User" },
  { value: "partner", label: "Partner" },
  { value: "global:admin", label: "Admin" }
] as const;

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
  return corporatePermissionOptions.some((option) => option.value === value) ? (value as CorporatePermissionValue) : "corporate_user";
}

export function normalizeAdminCorporatePermission(value: string | null | undefined): "corporate_user" {
  void value;

  return "corporate_user";
}

export function normalizeAdminCreateUserAccess(value: string | null | undefined, fallbackRoleKey = "user"): AdminCreateUserAccess {
  const rawValue = String(value ?? "").trim();

  if (rawValue === "partner") {
    return { type: "partner", roleKey: "partner" };
  }

  if (rawValue.startsWith("corporate:")) {
    return {
      type: "corporate",
      roleKey: "corporate_admin",
      corporatePermission: normalizeAdminCorporatePermission(rawValue.slice("corporate:".length))
    };
  }

  const globalRoleValue = rawValue.startsWith("global:") ? rawValue.slice("global:".length) : rawValue;
  const roleKey = normalizeGlobalRoleKey(globalRoleValue) || normalizeGlobalRoleKey(fallbackRoleKey) || "user";

  return { type: "global", roleKey };
}

export function safeAdminUsersReturnPath(value: string | null | undefined) {
  return value?.startsWith("/admin/users") ? value : "/admin/users";
}
