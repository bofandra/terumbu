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

function shortMonth(value: Date, locale: "en" | "id") {
  return value.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { month: "short" });
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function durationLabel(value: number, unit: "day" | "week", locale: "en" | "id") {
  if (locale === "id") {
    return `${value} ${unit === "day" ? "hari" : "minggu"}`;
  }

  return plural(value, unit);
}

export function buildExpeditionMonthAvailability(
  departures: ExpeditionDetailViewDeparture[],
  limit = 6,
  locale: "en" | "id" = "en"
): ExpeditionMonthAvailability[] {
  const monthMap = new Map<string, ExpeditionMonthAvailability>();

  for (const departure of departures) {
    const key = `${departure.startsAt.getUTCFullYear()}-${String(departure.startsAt.getUTCMonth() + 1).padStart(2, "0")}`;
    const seats = Math.max(0, departure.availableSeats);
    const status = departure.status === "open" && seats > 0 ? (seats <= 4 ? "limited" : "available") : "closed";
    const current = monthMap.get(key);

    if (!current) {
      monthMap.set(key, {
        key,
        label: shortMonth(departure.startsAt, locale),
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

export function buildExpeditionStayRange(durationDays: number, travelLengthLabel: string, locale: "en" | "id" = "en") {
  const minimumDays = Math.max(1, durationDays);
  const length = travelLengthLabel.toLowerCase();
  const maxWeeks = length.includes("long") ? 12 : length.includes("medium") ? 4 : Math.max(1, Math.ceil(minimumDays / 7));

  return {
    stayAtLeast: durationLabel(minimumDays, "day", locale),
    stayUpTo: durationLabel(maxWeeks, "week", locale)
  };
}

export function buildExpeditionOfferFacts(marketplace: ExpeditionMarketplaceMetadata, locale: "en" | "id" = "en"): ExpeditionFact[] {
  const facts: ExpeditionFact[] = [];

  if (marketplace.collaborationHoursPerWeek > 0) {
    facts.push({
      kind: "hours",
      value: `${marketplace.collaborationHoursPerWeek}h`,
      label: locale === "id" ? "Jam per minggu" : "Hours per week",
      description: locale === "id" ? "Waktu kolaborasi yang dicantumkan mitra." : "Collaboration time listed by the host."
    });
  }

  for (const activity of marketplace.helpActivities.slice(0, 4)) {
    facts.push({
      kind: activity.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      value: "",
      label: activity,
      description: locale === "id" ? "Aktivitas yang dicantumkan mitra ekspedisi." : "Activity listed by the expedition host."
    });
  }

  if (marketplace.additionalFee) {
    facts.push({
      kind: "fee",
      value: locale === "id" ? "Biaya" : "Fee",
      label: locale === "id" ? "Biaya Tambahan" : "Additional Fee",
      description: locale === "id" ? "Mitra mencantumkan biaya lokal tambahan." : "An additional local fee is listed by the host."
    });
  }

  return facts;
}

export function buildExpeditionBenefitFacts({
  marketplace,
  durationDays,
  included,
  hostVerificationLabel,
  locale = "en"
}: {
  marketplace: ExpeditionMarketplaceMetadata;
  durationDays: number;
  included: string[];
  hostVerificationLabel: string;
  locale?: "en" | "id";
}): ExpeditionFact[] {
  const facts: ExpeditionFact[] = [];

  if (durationDays > 0) {
    facts.push({
      kind: "stay",
      value: durationLabel(durationDays, "day", locale),
      label: locale === "id" ? "Durasi ekspedisi" : "Expedition duration",
      description: locale === "id" ? "Durasi yang dikonfigurasi untuk ekspedisi ini." : "Duration configured for this expedition."
    });
  }
  if (marketplace.accommodations[0]) {
    facts.push({ kind: "accommodation", value: "", label: marketplace.accommodations[0], description: locale === "id" ? "Pilihan akomodasi yang dicantumkan mitra." : "Accommodation option listed by the host." });
  }
  if (marketplace.mealsIncluded) {
    facts.push({ kind: "meals", value: "", label: marketplace.mealsIncluded, description: locale === "id" ? "Keterangan makanan yang dicantumkan mitra." : "Meal inclusion listed by the host." });
  }
  if (marketplace.digitalNomadAmenities[0]) {
    facts.push({ kind: "internet", value: "", label: marketplace.digitalNomadAmenities[0], description: locale === "id" ? "Fasilitas konektivitas atau kerja yang dicantumkan mitra." : "Connectivity or work amenity listed by the host." });
  }

  for (const item of marketplace.benefits.slice(0, 3)) {
    facts.push({ kind: item.toLowerCase().includes("certificate") ? "certificate" : "benefit", value: "", label: item, description: locale === "id" ? "Manfaat yang dicantumkan mitra." : "Benefit listed by the host." });
  }

  const explicitCertificate = included.find((item) => item.toLowerCase().includes("certificate"));
  if (explicitCertificate && !facts.some((fact) => fact.label === explicitCertificate)) {
    facts.push({ kind: "certificate", value: "", label: explicitCertificate, description: locale === "id" ? "Item yang termasuk dalam ekspedisi ini." : "Included item listed for this expedition." });
  }
  if (hostVerificationLabel.trim()) {
    facts.push({ kind: "verified-host", value: "", label: locale === "id" ? "Verifikasi mitra" : "Host verification", description: hostVerificationLabel });
  }

  return facts;
}

export function buildExpeditionSdgFacts({
  tags,
  sustainability,
  impactTargets,
  locale = "en"
}: {
  tags: string[];
  sustainability: string[];
  impactTargets: { label: string; value: string }[];
  locale?: "en" | "id";
}): ExpeditionSdgFact[] {
  const haystack = `${tags.join(" ")} ${sustainability.join(" ")} ${impactTargets.map((item) => `${item.value} ${item.label}`).join(" ")}`.toLowerCase();
  const facts: ExpeditionSdgFact[] = [];

  if (haystack.includes("education") || haystack.includes("learning") || haystack.includes("academy")) {
    facts.push({
      code: "4",
      label: locale === "id" ? "Pendidikan berkualitas" : "Quality education",
      description: locale === "id" ? "Mendukung pembelajaran lapangan dan pengetahuan konservasi praktis." : "Support field learning and practical conservation knowledge.",
      tone: "ocean"
    });
  }

  if (haystack.includes("community") || haystack.includes("workday") || haystack.includes("local")) {
    facts.push({
      code: "8",
      label: locale === "id" ? "Pekerjaan layak dan pertumbuhan ekonomi" : "Decent work and economic growth",
      description: locale === "id" ? "Mendukung mata pencaharian lokal yang terhubung dengan kerja konservasi." : "Support local livelihoods connected to conservation work.",
      tone: "sand"
    });
  }

  if (haystack.includes("climate") || haystack.includes("mangrove") || haystack.includes("carbon")) {
    facts.push({
      code: "13",
      label: locale === "id" ? "Penanganan perubahan iklim" : "Climate action",
      description: locale === "id" ? "Berkontribusi pada perlindungan ekosistem dengan manfaat iklim." : "Contribute to ecosystem protection with climate co-benefits.",
      tone: "kelp"
    });
  }

  if (haystack.includes("coral") || haystack.includes("reef") || haystack.includes("marine") || haystack.includes("ocean")) {
    facts.push({
      code: "14",
      label: locale === "id" ? "Ekosistem laut" : "Life below water",
      description: locale === "id" ? "Melindungi, memulihkan, dan memantau ekosistem pesisir dan laut." : "Protect, restore, and monitor coastal and marine ecosystems.",
      tone: "ocean"
    });
  }

  if (haystack.includes("farm") || haystack.includes("forest") || haystack.includes("land") || haystack.includes("garden")) {
    facts.push({
      code: "15",
      label: locale === "id" ? "Ekosistem daratan" : "Life on land",
      description: locale === "id" ? "Melindungi dan memulihkan ekosistem daratan melalui aksi yang dipimpin mitra." : "Protect and restore terrestrial ecosystems through host-led action.",
      tone: "kelp"
    });
  }

  const uniqueFacts = uniq(facts.map((fact) => fact.code))
    .map((code) => facts.find((fact) => fact.code === code))
    .filter((fact): fact is ExpeditionSdgFact => Boolean(fact));

  return uniqueFacts.slice(0, 4);
}

