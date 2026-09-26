import type { ExpeditionMarketplaceMetadata } from "@/lib/expedition-marketplace";

export type ExpeditionDetailViewDeparture = {
  startsAt: Date;
  endsAt: Date;
  status: string;
  availableSeats: number;
};

export type ExpeditionFact = {
  kind: string;
  value: string;
  label: string;
  description: string;
};

export type ExpeditionMonthAvailability = {
  key: string;
  label: string;
  status: "available" | "limited" | "closed";
  seats: number;
};

export type ExpeditionSdgFact = {
  code: string;
  label: string;
  description: string;
  tone: "kelp" | "ocean" | "sand";
};

function uniq(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function shortMonth(value: Date) {
  return value.toLocaleDateString("en-US", { month: "short" });
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

export function buildExpeditionMonthAvailability(departures: ExpeditionDetailViewDeparture[], limit = 6): ExpeditionMonthAvailability[] {
  const monthMap = new Map<string, ExpeditionMonthAvailability>();

  for (const departure of departures) {
    const key = `${departure.startsAt.getUTCFullYear()}-${String(departure.startsAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const seats = Math.max(0, departure.availableSeats);
    const status = departure.status === "open" && seats > 0 ? (seats <= 4 ? "limited" : "available") : "closed";
    const current = monthMap.get(key);

    if (!current) {
      monthMap.set(key, {
        key,
        label: shortMonth(departure.startsAt),
        status,
        seats
      });
      continue;
    }

    current.seats += seats;
    if (current.status === "closed" && status !== "closed") {
      current.status = status;
    }
    if (current.status === "limited" && status === "available") {
      current.status = "available";
    }
  }

  return Array.from(monthMap.values()).slice(0, limit);
}

export function buildExpeditionStayRange(durationDays: number, travelLengthLabel: string) {
  const minimumDays = Math.max(1, durationDays);
  const length = travelLengthLabel.toLowerCase();
  const maxWeeks = length.includes("long") ? 12 : length.includes("medium") ? 4 : Math.max(1, Math.ceil(minimumDays / 7));

  return {
    stayAtLeast: plural(minimumDays, "day"),
    stayUpTo: plural(maxWeeks, "week")
  };
}

export function buildExpeditionOfferFacts(marketplace: ExpeditionMarketplaceMetadata): ExpeditionFact[] {
  const facts: ExpeditionFact[] = [];

  if (marketplace.collaborationHoursPerWeek > 0) {
    facts.push({ kind: "hours", value: `${marketplace.collaborationHoursPerWeek}h`, label: "Hours per week", description: "Collaboration time listed by the host." });
  }

  for (const activity of marketplace.helpActivities.slice(0, 4)) {
    facts.push({ kind: activity.toLowerCase().replace(/[^a-z0-9]+/g, "-"), value: "", label: activity, description: "Activity listed by the expedition host." });
  }

  if (marketplace.additionalFee) {
    facts.push({ kind: "fee", value: "Fee", label: "Additional fee", description: "An additional local fee is listed by the host." });
  }

  return facts;
}

export function buildExpeditionBenefitFacts({
  marketplace,
  durationDays,
  included,
  hostVerificationLabel
}: {
  marketplace: ExpeditionMarketplaceMetadata;
  durationDays: number;
  included: string[];
  hostVerificationLabel: string;
}): ExpeditionFact[] {
  const facts: ExpeditionFact[] = [];

  if (durationDays > 0) {
    facts.push({ kind: "stay", value: plural(durationDays, "day"), label: "Expedition duration", description: "Duration configured for this expedition." });
  }
  if (marketplace.accommodations[0]) {
    facts.push({ kind: "accommodation", value: "", label: marketplace.accommodations[0], description: "Accommodation option listed by the host." });
  }
  if (marketplace.mealsIncluded) {
    facts.push({ kind: "meals", value: "", label: marketplace.mealsIncluded, description: "Meal inclusion listed by the host." });
  }
  if (marketplace.digitalNomadAmenities[0]) {
    facts.push({ kind: "internet", value: "", label: marketplace.digitalNomadAmenities[0], description: "Connectivity or work amenity listed by the host." });
  }

  for (const item of marketplace.benefits.slice(0, 3)) {
    facts.push({ kind: item.toLowerCase().includes("certificate") ? "certificate" : "benefit", value: "", label: item, description: "Benefit listed by the host." });
  }

  const explicitCertificate = included.find((item) => item.toLowerCase().includes("certificate"));
  if (explicitCertificate && !facts.some((fact) => fact.label === explicitCertificate)) {
    facts.push({ kind: "certificate", value: "", label: explicitCertificate, description: "Included item listed for this expedition." });
  }
  if (hostVerificationLabel.trim()) {
    facts.push({ kind: "verified-host", value: "", label: "Host verification", description: hostVerificationLabel });
  }

  return facts;
}

export function buildExpeditionSdgFacts({
  tags,
  sustainability,
  impactTargets
}: {
  tags: string[];
  sustainability: string[];
  impactTargets: { label: string; value: string }[];
}): ExpeditionSdgFact[] {
  const haystack = `${tags.join(" ")} ${sustainability.join(" ")} ${impactTargets.map((item) => `${item.value} ${item.label}`).join(" ")}`.toLowerCase();
  const facts: ExpeditionSdgFact[] = [];

  if (haystack.includes("education") || haystack.includes("learning") || haystack.includes("academy")) {
    facts.push({
      code: "4",
      label: "Quality education",
      description: "Support field learning and practical conservation knowledge.",
      tone: "ocean"
    });
  }

  if (haystack.includes("community") || haystack.includes("workday") || haystack.includes("local")) {
    facts.push({
      code: "8",
      label: "Decent work and economic growth",
      description: "Support local livelihoods connected to conservation work.",
      tone: "sand"
    });
  }

  if (haystack.includes("climate") || haystack.includes("mangrove") || haystack.includes("carbon")) {
    facts.push({
      code: "13",
      label: "Climate action",
      description: "Contribute to ecosystem protection with climate co-benefits.",
      tone: "kelp"
    });
  }

  if (haystack.includes("coral") || haystack.includes("reef") || haystack.includes("marine") || haystack.includes("ocean")) {
    facts.push({
      code: "14",
      label: "Life below water",
      description: "Protect, restore, and monitor coastal and marine ecosystems.",
      tone: "ocean"
    });
  }

  if (haystack.includes("farm") || haystack.includes("forest") || haystack.includes("land") || haystack.includes("garden")) {
    facts.push({
      code: "15",
      label: "Life on land",
      description: "Protect and restore terrestrial ecosystems through host-led action.",
      tone: "kelp"
    });
  }

  const uniqueFacts = uniq(facts.map((fact) => fact.code))
    .map((code) => facts.find((fact) => fact.code === code))
    .filter((fact): fact is ExpeditionSdgFact => Boolean(fact));

  return uniqueFacts.slice(0, 4);
}

