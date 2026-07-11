export const partnerOrganizationRoles = ["owner", "manager", "contributor", "viewer"] as const;

export type PartnerOrganizationRole = (typeof partnerOrganizationRoles)[number];
export type PartnerOrganizationPermission =
  | "activity:create"
  | "campaign:create"
  | "campaign:delete"
  | "campaign:update"
  | "evidence:revise"
  | "expedition:manage";

const permissionRoles: Record<PartnerOrganizationPermission, readonly PartnerOrganizationRole[]> = {
  "activity:create": ["owner", "manager", "contributor"],
  "campaign:create": ["owner", "manager"],
  "campaign:delete": ["owner"],
  "campaign:update": ["owner", "manager"],
  "evidence:revise": ["owner", "manager", "contributor"],
  "expedition:manage": ["owner", "manager"]
};

export function normalizePartnerOrganizationRole(
  value: string | null | undefined,
  fallback: PartnerOrganizationRole = "viewer"
): PartnerOrganizationRole {
  return partnerOrganizationRoles.includes(value as PartnerOrganizationRole) ? (value as PartnerOrganizationRole) : fallback;
}

export function partnerRoleAllows(role: string | null | undefined, permission: PartnerOrganizationPermission) {
  return permissionRoles[permission].includes(normalizePartnerOrganizationRole(role));
}

export function partnerCapabilitiesForRoles(roles: Iterable<string | null | undefined>, isAdmin = false) {
  const roleList = Array.from(roles);
  const allows = (permission: PartnerOrganizationPermission) =>
    isAdmin || roleList.some((role) => partnerRoleAllows(role, permission));

  return {
    canCreateActivity: allows("activity:create"),
    canCreateCampaign: allows("campaign:create"),
    canDeleteCampaign: allows("campaign:delete"),
    canManageExpeditions: allows("expedition:manage"),
    canReviseEvidence: allows("evidence:revise"),
    canUpdateCampaign: allows("campaign:update")
  };
}
