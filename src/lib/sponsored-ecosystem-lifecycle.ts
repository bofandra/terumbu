export const sponsoredEcosystemOperationalStatuses = ["sponsored", "growing", "planted", "monitored"] as const;
export type SponsoredEcosystemOperationalStatus = (typeof sponsoredEcosystemOperationalStatuses)[number];

const transitions: Record<SponsoredEcosystemOperationalStatus, readonly SponsoredEcosystemOperationalStatus[]> = {
  sponsored: ["growing"],
  growing: ["planted"],
  planted: ["monitored"],
  monitored: []
};

export function normalizeSponsoredEcosystemOperationalStatus(value: string | null | undefined) {
  return sponsoredEcosystemOperationalStatuses.includes(value as SponsoredEcosystemOperationalStatus)
    ? (value as SponsoredEcosystemOperationalStatus)
    : null;
}

export function canTransitionSponsoredEcosystem(from: string | null | undefined, to: string | null | undefined) {
  const current = normalizeSponsoredEcosystemOperationalStatus(from);
  const next = normalizeSponsoredEcosystemOperationalStatus(to);
  return Boolean(current && next && transitions[current].includes(next));
}

export function sponsoredEcosystemTransitionRequiresReason(from: string, to: string) {
  return from === "planted" || to === "planted" || to === "monitored";
}
