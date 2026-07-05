export const CORPORATE_CONTRIBUTION_STATUSES = ["pledged", "committed", "disbursed", "verified", "cancelled"] as const;
export const CORPORATE_CONTRIBUTION_TYPES = ["csr", "grant", "sponsorship", "employee_matching", "in_kind"] as const;

export type CorporateContributionStatus = (typeof CORPORATE_CONTRIBUTION_STATUSES)[number];
export type CorporateContributionType = (typeof CORPORATE_CONTRIBUTION_TYPES)[number];

export type CampaignRaisedContributionInput = {
  amount: number;
  status: CorporateContributionStatus | string | null | undefined;
  countsTowardCampaignGoal: boolean | null | undefined;
};

export function normalizeCorporateContributionStatus(value: string | null | undefined): CorporateContributionStatus {
  return CORPORATE_CONTRIBUTION_STATUSES.includes(value as CorporateContributionStatus) ? (value as CorporateContributionStatus) : "committed";
}

export function normalizeCorporateContributionType(value: string | null | undefined): CorporateContributionType {
  return CORPORATE_CONTRIBUTION_TYPES.includes(value as CorporateContributionType) ? (value as CorporateContributionType) : "csr";
}

export function contributionCountsTowardPublicGoal(status: string | null | undefined) {
  return status === "committed" || status === "disbursed" || status === "verified";
}

export function publicCampaignContributionValue(contribution: CampaignRaisedContributionInput | null | undefined) {
  if (!contribution?.countsTowardCampaignGoal || !contributionCountsTowardPublicGoal(contribution.status)) {
    return 0;
  }

  return Number.isFinite(contribution.amount) ? Math.max(0, contribution.amount) : 0;
}

export function campaignRaisedDelta(
  previousContribution: CampaignRaisedContributionInput | null | undefined,
  nextContribution: CampaignRaisedContributionInput
) {
  return publicCampaignContributionValue(nextContribution) - publicCampaignContributionValue(previousContribution);
}

export function buildCorporateContributionReference(input: {
  accountSlug: string;
  campaignSlug: string;
  contributionType: CorporateContributionType | string;
  date?: Date;
}) {
  const date = input.date ?? new Date();
  const year = date.getUTCFullYear();
  const account = input.accountSlug.replace(/[^a-z0-9]+/gi, "").slice(0, 12).toUpperCase() || "CORP";
  const campaign = input.campaignSlug.replace(/[^a-z0-9]+/gi, "").slice(0, 12).toUpperCase() || "PROJECT";
  const type = input.contributionType.replace(/[^a-z0-9]+/gi, "").slice(0, 8).toUpperCase() || "CSR";

  return `TRB-CORP-${year}-${account}-${campaign}-${type}`;
}
