export type ImpactStatData = {
  label: string;
  value: string;
  tone: "coral" | "kelp" | "ocean" | "sand";
};

export type CampaignCardData = {
  slug: string;
  title: string;
  category: string;
  region: string;
  summary: string;
  imageUrl: string | null;
  raised: number;
  goal: number;
  donors: number;
  daysLeft: number;
  impact: string;
  partner: string;
  verification: string;
};

export type ExpeditionCardData = {
  slug: string;
  title: string;
  region: string;
  duration: string;
  price: number;
  availabilityLabel: string;
  imageUrl: string | null;
  summary: string;
};

export type ImpactSiteData = {
  name: string;
  type: string;
  region: string;
  progress: number;
  latitude: number;
  longitude: number;
  verification: string;
  evidenceCount: number;
  latestSurvey: string | null;
};

export type PassportPreviewData = {
  displayName: string;
  initials: string;
  levelLabel: string;
  xp: number;
  xpTarget: number;
  stats: Array<{
    label: string;
    value: string;
  }>;
  latestActivity: {
    title: string;
    description: string;
  } | null;
  href: string;
};

type CampaignRow = {
  slug: string;
  title: string;
  category: string;
  region: string;
  summary: string;
  imageUrl: string | null;
  raisedAmount: string | number;
  goalAmount: string | number;
  donorCount: number;
  impactUnit: string;
  impactTarget: number;
  endsAt: Date | null;
  partner: string;
  verification: string;
};

type ExpeditionRow = {
  slug: string;
  title: string;
  region: string;
  durationDays: number;
  basePrice: string | number;
  imageUrl: string | null;
  summary: string;
};

export function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function getMetadataNumber(metadata: unknown, key: string, fallback = 0) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return fallback;
  }

  const value = (metadata as Record<string, unknown>)[key];

  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];

  return typeof value === "string" ? value : null;
}

export function daysUntil(value: Date | null, now = new Date()) {
  if (!value) {
    return 0;
  }

  const days = Math.ceil((value.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return Math.max(0, days);
}

export function verificationLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    basic: "Basic verified",
    document: "Document verified",
    field: "Field verified"
  };

  return labels[value ?? ""] ?? "Verified";
}

export function initialsForName(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "OH";
}

export function toCampaignCard(row: CampaignRow, now = new Date()): CampaignCardData {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    region: row.region,
    summary: row.summary,
    imageUrl: row.imageUrl,
    raised: toNumber(row.raisedAmount),
    goal: toNumber(row.goalAmount),
    donors: row.donorCount,
    daysLeft: daysUntil(row.endsAt, now),
    impact: `${row.impactTarget.toLocaleString("id-ID")} ${row.impactUnit} target`,
    partner: row.partner,
    verification: verificationLabel(row.verification)
  };
}

export function suggestedDonationAmounts(goal: number) {
  const baseline = Math.max(1, goal);
  const amounts = [0.0002, 0.0005, 0.001].map((multiplier) => {
    const amount = baseline * multiplier;
    const step = amount >= 1_000_000 ? 100_000 : 50_000;

    return Math.max(step, Math.round(amount / step) * step);
  });

  return Array.from(new Set(amounts));
}

export function toExpeditionCard(row: ExpeditionRow, availabilityLabel = "Departure schedule pending"): ExpeditionCardData {
  return {
    slug: row.slug,
    title: row.title,
    region: row.region,
    duration: `${row.durationDays} days / ${Math.max(0, row.durationDays - 1)} nights`,
    price: toNumber(row.basePrice),
    availabilityLabel,
    imageUrl: row.imageUrl,
    summary: row.summary
  };
}
