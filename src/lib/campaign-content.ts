export const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"] as const;
export type CampaignStatus = (typeof campaignStatuses)[number];

export const partnerCampaignStatuses = ["draft", "review"] as const;
export type PartnerCampaignStatus = (typeof partnerCampaignStatuses)[number];

export const campaignCurrencies = ["IDR", "USD"] as const;
export type CampaignCurrency = (typeof campaignCurrencies)[number];

export const campaignCategories = [
  "Coral Restoration",
  "Mangrove Restoration",
  "Seagrass Restoration",
  "Community Conservation",
  "Marine Protection",
  "Conservation"
] as const;
export type CampaignCategory = (typeof campaignCategories)[number];

export const campaignImpactUnits = [
  "coral fragments",
  "mangrove seedlings",
  "seagrass plots",
  "hectares protected",
  "project milestones"
] as const;
export type CampaignImpactUnit = (typeof campaignImpactUnits)[number];

export const impactSiteEcosystemTypes = [
  "Coral",
  "Mangrove",
  "Seagrass",
  "Marine protection",
  "Community conservation",
  "Conservation"
] as const;
export type ImpactSiteEcosystemType = (typeof impactSiteEcosystemTypes)[number];

export const impactSiteVerificationStatuses = ["basic", "document", "field"] as const;
export type ImpactSiteVerificationStatus = (typeof impactSiteVerificationStatuses)[number];

export const campaignBudgetCategories = [
  "Restoration materials",
  "Field team",
  "Monitoring",
  "Community coordination",
  "Transport",
  "Reporting"
] as const;
export type CampaignBudgetCategory = (typeof campaignBudgetCategories)[number];

export const campaignMediaTypes = ["image", "video", "document"] as const;
export type CampaignMediaType = (typeof campaignMediaTypes)[number];

export const campaignTimelinePhaseStatuses = ["planned", "in_progress", "completed", "blocked"] as const;
export type CampaignTimelinePhaseStatus = (typeof campaignTimelinePhaseStatuses)[number];

export const organizationTeamRoles = [
  "Project lead",
  "Field coordinator",
  "Marine biologist",
  "Community liaison",
  "Monitoring lead"
] as const;
export type OrganizationTeamRole = (typeof organizationTeamRoles)[number];

export type CampaignContentCounts = {
  media: number;
  budget: number;
  timeline: number;
  team: number;
};

export function normalizeCampaignStatus(value: unknown): CampaignStatus {
  const normalized = String(value ?? "").trim();

  return campaignStatuses.includes(normalized as CampaignStatus) ? (normalized as CampaignStatus) : "draft";
}

export function normalizePartnerCampaignStatus(value: unknown): PartnerCampaignStatus {
  const normalized = String(value ?? "draft").trim();

  return partnerCampaignStatuses.includes(normalized as PartnerCampaignStatus) ? (normalized as PartnerCampaignStatus) : "review";
}

export function normalizeCampaignCurrency(value: unknown, fallback: CampaignCurrency = "USD"): CampaignCurrency {
  const normalized = String(value ?? "").trim().toUpperCase();

  return campaignCurrencies.includes(normalized as CampaignCurrency) ? (normalized as CampaignCurrency) : fallback;
}

export function campaignCategoryFromEcosystemType(value: unknown): CampaignCategory {
  const normalized = String(value ?? "").toLowerCase();

  if (normalized.includes("coral") || normalized.includes("reef")) {
    return "Coral Restoration";
  }

  if (normalized.includes("mangrove")) {
    return "Mangrove Restoration";
  }

  if (normalized.includes("seagrass")) {
    return "Seagrass Restoration";
  }

  if (normalized.includes("community")) {
    return "Community Conservation";
  }

  if (normalized.includes("marine")) {
    return "Marine Protection";
  }

  return "Conservation";
}

export function normalizeCampaignCategory(value: unknown, fallback: CampaignCategory = "Conservation"): CampaignCategory {
  const normalized = String(value ?? "").trim();

  return campaignCategories.includes(normalized as CampaignCategory) ? (normalized as CampaignCategory) : fallback;
}

export function defaultImpactUnitForCategory(category: string): CampaignImpactUnit {
  if (category === "Coral Restoration") {
    return "coral fragments";
  }

  if (category === "Mangrove Restoration") {
    return "mangrove seedlings";
  }

  if (category === "Seagrass Restoration") {
    return "seagrass plots";
  }

  if (category === "Marine Protection") {
    return "hectares protected";
  }

  return "project milestones";
}

export function normalizeCampaignImpactUnit(value: unknown, category: string): CampaignImpactUnit {
  const normalized = String(value ?? "").trim();

  return campaignImpactUnits.includes(normalized as CampaignImpactUnit)
    ? (normalized as CampaignImpactUnit)
    : defaultImpactUnitForCategory(category);
}

export function normalizeImpactSiteEcosystemType(value: unknown): ImpactSiteEcosystemType {
  const normalized = String(value ?? "").trim();

  return impactSiteEcosystemTypes.includes(normalized as ImpactSiteEcosystemType)
    ? (normalized as ImpactSiteEcosystemType)
    : "Coral";
}

export function normalizeImpactSiteVerificationStatus(value: unknown): ImpactSiteVerificationStatus {
  const normalized = String(value ?? "basic").trim();

  return impactSiteVerificationStatuses.includes(normalized as ImpactSiteVerificationStatus)
    ? (normalized as ImpactSiteVerificationStatus)
    : "basic";
}

export function normalizeCampaignBudgetCategory(value: unknown): CampaignBudgetCategory {
  const normalized = String(value ?? "").trim();

  return campaignBudgetCategories.includes(normalized as CampaignBudgetCategory)
    ? (normalized as CampaignBudgetCategory)
    : "Restoration materials";
}

export function normalizeCampaignMediaType(value: unknown): CampaignMediaType {
  const normalized = String(value ?? "").trim();

  return campaignMediaTypes.includes(normalized as CampaignMediaType) ? (normalized as CampaignMediaType) : "image";
}

export function normalizeCampaignTimelinePhaseStatus(value: unknown): CampaignTimelinePhaseStatus {
  const normalized = String(value ?? "").trim();

  return campaignTimelinePhaseStatuses.includes(normalized as CampaignTimelinePhaseStatus)
    ? (normalized as CampaignTimelinePhaseStatus)
    : "planned";
}

export function normalizeOrganizationTeamRole(value: unknown): OrganizationTeamRole {
  const normalized = String(value ?? "").trim();

  return organizationTeamRoles.includes(normalized as OrganizationTeamRole)
    ? (normalized as OrganizationTeamRole)
    : "Project lead";
}

export function campaignContentCompleteness(counts: CampaignContentCounts) {
  const checks = [
    { key: "media", label: "Media gallery", complete: counts.media > 0 },
    { key: "budget", label: "Budget line items", complete: counts.budget > 0 },
    { key: "timeline", label: "Timeline phases", complete: counts.timeline > 0 },
    { key: "team", label: "Public team members", complete: counts.team > 0 }
  ];
  const completeCount = checks.filter((check) => check.complete).length;

  return {
    score: Math.round((completeCount / checks.length) * 100),
    completeCount,
    totalCount: checks.length,
    missingLabels: checks.filter((check) => !check.complete).map((check) => check.label),
    checks
  };
}

export function campaignBudgetUtilization(lineItems: Array<{ amount: number; spentAmount: number }>) {
  const planned = lineItems.reduce((total, item) => total + Math.max(0, item.amount), 0);
  const spent = lineItems.reduce((total, item) => total + Math.max(0, item.spentAmount), 0);

  return {
    planned,
    spent,
    remaining: Math.max(0, planned - spent),
    percent: planned > 0 ? Math.min(100, Math.round((spent / planned) * 100)) : 0
  };
}
