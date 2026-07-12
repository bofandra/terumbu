export const evidenceVerificationStatuses = ["submitted", "in_review", "needs_clarification", "verified", "rejected"] as const;
export type EvidenceVerificationStatus = (typeof evidenceVerificationStatuses)[number];

export const evidenceReviewActions = [
  "submitted",
  "assigned",
  "in_review",
  "clarification_requested",
  "clarification_resolved",
  "verified",
  "rejected",
  "resubmitted"
] as const;
export type EvidenceReviewAction = (typeof evidenceReviewActions)[number];

export function normalizeEvidenceVerificationStatus(value: string | null | undefined, fallback: EvidenceVerificationStatus = "submitted"): EvidenceVerificationStatus {
  return evidenceVerificationStatuses.includes(value as EvidenceVerificationStatus) ? (value as EvidenceVerificationStatus) : fallback;
}

export function evidenceStatusLabel(status: string | null | undefined) {
  const normalized = normalizeEvidenceVerificationStatus(status);

  return {
    submitted: "Submitted",
    in_review: "In review",
    needs_clarification: "Needs clarification",
    verified: "Verified",
    rejected: "Rejected"
  }[normalized];
}

export function evidenceReviewStage(status: string | null | undefined) {
  const normalized = normalizeEvidenceVerificationStatus(status);

  return {
    submitted: "Submitted",
    in_review: "In review",
    needs_clarification: "Needs clarification",
    verified: "Approved",
    rejected: "Rejected"
  }[normalized];
}

export function evidenceReviewActionForTransition(input: {
  fromStatus?: string | null;
  toStatus: string | null | undefined;
  assignedReviewerChanged?: boolean;
}): EvidenceReviewAction {
  const fromStatus = input.fromStatus ? normalizeEvidenceVerificationStatus(input.fromStatus) : null;
  const toStatus = normalizeEvidenceVerificationStatus(input.toStatus);

  if (toStatus === "needs_clarification") {
    return "clarification_requested";
  }

  if (fromStatus === "needs_clarification" && toStatus === "submitted") {
    return "clarification_resolved";
  }

  if (toStatus === "submitted") {
    return fromStatus ? "resubmitted" : "submitted";
  }

  if (toStatus === "verified") {
    return "verified";
  }

  if (toStatus === "rejected") {
    return "rejected";
  }

  if (input.assignedReviewerChanged) {
    return "assigned";
  }

  return "in_review";
}

export function evidenceReviewActionLabel(action: string | null | undefined) {
  return {
    submitted: "Submitted",
    assigned: "Reviewer assigned",
    in_review: "Moved to review",
    clarification_requested: "Clarification requested",
    clarification_resolved: "Clarification answered",
    verified: "Verified",
    rejected: "Rejected",
    resubmitted: "Resubmitted"
  }[action ?? ""] ?? "Review event";
}

export function evidenceReviewNoteRequired(status: string | null | undefined) {
  const normalized = normalizeEvidenceVerificationStatus(status);

  return normalized === "needs_clarification" || normalized === "rejected";
}

export function evidenceCanBeRevisedByPartner(status: string | null | undefined) {
  const normalized = normalizeEvidenceVerificationStatus(status);

  return normalized === "needs_clarification" || normalized === "rejected";
}
