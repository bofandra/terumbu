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
