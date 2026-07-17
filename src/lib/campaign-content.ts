export const campaignMediaTypes = ["image", "video", "document"] as const;
export type CampaignMediaType = (typeof campaignMediaTypes)[number];

export const campaignTimelinePhaseStatuses = ["planned", "in_progress", "completed", "blocked"] as const;
export type CampaignTimelinePhaseStatus = (typeof campaignTimelinePhaseStatuses)[number];

export type CampaignContentCounts = {
  media: number;
  budget: number;
  timeline: number;
  team: number;
};

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
