export const restorationBatchStatuses = ["planned", "planted", "monitored"] as const;
export type RestorationBatchStatus = (typeof restorationBatchStatuses)[number];

const transitions: Record<RestorationBatchStatus, readonly RestorationBatchStatus[]> = {
  planned: ["planted"],
  planted: ["monitored"],
  monitored: []
};

export function normalizeRestorationBatchStatus(value: string | null | undefined) {
  return restorationBatchStatuses.includes(value as RestorationBatchStatus) ? (value as RestorationBatchStatus) : null;
}

export function canTransitionRestorationBatch(from: string | null | undefined, to: string | null | undefined) {
  const current = normalizeRestorationBatchStatus(from);
  const next = normalizeRestorationBatchStatus(to);
  return Boolean(current && next && transitions[current].includes(next));
}

export function restorationBatchTransitionRequiresEvidence(to: string | null | undefined) {
  return to === "monitored";
}

export function validRestorationAllocationUnits(value: number, sponsorshipUnits: number) {
  return Number.isFinite(value) && value > 0 && Number.isFinite(sponsorshipUnits) && sponsorshipUnits > 0 && value <= sponsorshipUnits;
}


export function restorationAllocationMatchesBatch(
  batch: { campaignId: string; impactSiteId: string },
  sponsorship: { campaignId: string; impactSiteId: string | null }
) {
  return batch.campaignId === sponsorship.campaignId
    && Boolean(sponsorship.impactSiteId)
    && batch.impactSiteId === sponsorship.impactSiteId;
}

export function canAllocateSponsorshipToRestorationBatch(input: {
  batchStatus: string | null | undefined;
  sponsorshipStatus: string | null | undefined;
  batchCampaignId: string;
  batchImpactSiteId: string;
  sponsorshipCampaignId: string;
  sponsorshipImpactSiteId: string | null;
  alreadyAllocated: boolean;
}) {
  return input.batchStatus === "planned"
    && input.sponsorshipStatus !== "reversed"
    && !input.alreadyAllocated
    && restorationAllocationMatchesBatch(
      { campaignId: input.batchCampaignId, impactSiteId: input.batchImpactSiteId },
      { campaignId: input.sponsorshipCampaignId, impactSiteId: input.sponsorshipImpactSiteId }
    );
}

export function restorationTransitionPrerequisiteSatisfied(
  to: string | null | undefined,
  input: { hasAllocation: boolean; hasVerifiedEvidence: boolean }
) {
  if (to === "planted") return input.hasAllocation;
  if (to === "monitored") return input.hasVerifiedEvidence;
  return true;
}
