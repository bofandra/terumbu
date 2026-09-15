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
  const facts: ExpeditionFact[] = [
    {
      kind: "hours",
      value: `${marketplace.collaborationHoursPerWeek}h`,
      label: "Hours per week",
      description: "Help out and collaborate with your host only a few hours per week."
    }
  ];

  for (const activity of marketplace.helpActivities.slice(0, 3)) {
    facts.push({
      kind: activity.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      value: "",
      label: activity,
      description: "Support hands-on field work with guidance from the local team."
    });
  }

  facts.push(
    marketplace.additionalFee
      ? {
          kind: "fee",
          value: "Fee",
          label: "Additional Fee",
          description: "This host charges a local fee in addition to the platform booking."
        }
      : {
          kind: "fee",
          value: "No fee",
          label: "No Additional Fee",
          description: "No extra host fee is listed for this opportunity."
        }
  );

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
  const daysOff = marketplace.collaborationHoursPerWeek <= 20 ? 2 : 1;
  const accommodation = marketplace.accommodations[0] ?? "Accommodation";
  const nomadAmenity = marketplace.digitalNomadAmenities[0] ?? "Basic Internet Access";
  const includesCertificate = included.some((item) => item.toLowerCase().includes("certificate"));
  const stayRange = buildExpeditionStayRange(durationDays, marketplace.travelLengthLabel);

  return [
    {
      kind: "days-off",
      value: String(daysOff),
      label: "Days off per week",
      description: "Have time off for yourself, go explore the area, or rest for a while."
    },
    {
      kind: "stay",
      value: stayRange.stayAtLeast,
      label: marketplace.travelLengthLabel,
      description: `Plan a stay from ${stayRange.stayAtLeast} and up to ${stayRange.stayUpTo}.`
    },
    {
      kind: "accommodation",
      value: "",
      label: accommodation,
      description: "A place to sleep is included during the confirmed expedition dates."
    },
    {
      kind: "meals",
      value: "",
      label: marketplace.mealsIncluded,
      description: "Meals are included according to the host and departure details."
    },
    {
      kind: "internet",
      value: "",
      label: nomadAmenity,
      description: "Connectivity varies by field site and weather conditions."
    },
    {
      kind: "workspace",
      value: "",
      label: marketplace.benefits.find((item) => item.toLowerCase().includes("workspace")) ?? "Dedicated Workspace",
      description: "A practical place for planning, reflection, or light remote work when available."
    },
    {
      kind: "certificate",
      value: "",
      label: includesCertificate ? "Certificate" : "Impact Passport record",
      description: includesCertificate ? "Get a certificate after finishing your experience." : "Completed trips are recorded in your Terumbu Impact Passport."
    },
    {
      kind: "support",
      value: "",
      label: "Support",
      description: "Get help from Terumbu and the host team before and during the trip."
    },
    {
      kind: "verified-host",
      value: "",
      label: "Verified Host",
      description: hostVerificationLabel
    }
  ];
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

  return uniqueFacts.length > 0
    ? uniqueFacts.slice(0, 4)
    : [
        {
          code: "14",
          label: "Life below water",
          description: "Protect, restore, and monitor coastal and marine ecosystems.",
          tone: "ocean"
        },
        {
          code: "13",
          label: "Climate action",
          description: "Contribute to ecosystem protection with climate co-benefits.",
          tone: "kelp"
        },
        {
          code: "8",
          label: "Decent work and economic growth",
          description: "Support local livelihoods connected to conservation work.",
          tone: "sand"
        }
      ];
}

