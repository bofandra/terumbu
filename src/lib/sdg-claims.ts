export const approvedSdgOptions = [
  { code: "4", label: "Quality education" },
  { code: "8", label: "Decent work and economic growth" },
  { code: "13", label: "Climate action" },
  { code: "14", label: "Life below water" },
  { code: "15", label: "Life on land" }
] as const;

export type ApprovedSdgCode = (typeof approvedSdgOptions)[number]["code"];

const approvedCodeSet = new Set<string>(approvedSdgOptions.map((goal) => goal.code));

export function normalizeApprovedSdgCodes(value: unknown): ApprovedSdgCode[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((code): code is ApprovedSdgCode =>
    typeof code === "string" && approvedCodeSet.has(code)
  )));
}

export function approvedSdgCodesFromEvidence(input: {
  verificationStatus: string;
  verifiedAt: Date | null;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  metadata: unknown;
}): ApprovedSdgCode[] {
  // Evidence approval and SDG mapping must both be made by the current reviewer.
  // Legacy tags, free-text activity descriptions and unreviewed metadata never qualify.
  if (input.verificationStatus !== "verified" || !input.verifiedAt ||
      !input.reviewedAt || !input.reviewedByUserId ||
      input.verifiedAt.getTime() !== input.reviewedAt.getTime()) {
    return [];
  }

  const metadata = input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata)
    ? input.metadata as Record<string, unknown>
    : {};
  const approval = metadata.sdgApproval && typeof metadata.sdgApproval === "object" && !Array.isArray(metadata.sdgApproval)
    ? metadata.sdgApproval as Record<string, unknown>
    : {};

  if (approval.reviewedByUserId !== input.reviewedByUserId ||
      approval.reviewedAt !== input.reviewedAt.toISOString()) {
    return [];
  }

  return normalizeApprovedSdgCodes(approval.codes);
}
