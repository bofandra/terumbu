export type ExpeditionAdditionalFee = {
  amount: number;
  currency: string;
  period: string;
  description: string;
  paysFor: string[];
};

export type ExpeditionMarketplaceMetadata = {
  typeLabel: string;
  programTypes: string[];
  highlights: string[];
  purposes: string[];
  helpActivities: string[];
  styles: string[];
  collaborationHoursPerWeek: number;
  travelLengthLabel: string;
  accommodations: string[];
  mealsIncluded: string;
  digitalNomadAmenities: string[];
  benefits: string[];
  badges: string[];
  additionalFee: ExpeditionAdditionalFee | null;
};

export type ExpeditionSearchFilters = {
  q?: string;
  destination?: string;
  programType?: string;
  highlight?: string;
  purpose?: string;
  availability?: string;
  help?: string;
  style?: string;
  hoursMax?: number;
  travelLength?: string;
  meals?: string;
  accommodation?: string;
  digitalNomad?: string;
  benefits?: string;
  sort?: string;
};

export type ExpeditionMarketplaceOption = {
  value: string;
  label: string;
  description?: string;
  count: number;
};

export type ExpeditionMarketplaceFacets = {
  destinations: ExpeditionMarketplaceOption[];
  programTypes: ExpeditionMarketplaceOption[];
  highlights: ExpeditionMarketplaceOption[];
  purposes: ExpeditionMarketplaceOption[];
  availability: ExpeditionMarketplaceOption[];
  helpActivities: ExpeditionMarketplaceOption[];
  styles: ExpeditionMarketplaceOption[];
  travelLengths: ExpeditionMarketplaceOption[];
  meals: ExpeditionMarketplaceOption[];
  accommodations: ExpeditionMarketplaceOption[];
  digitalNomadAmenities: ExpeditionMarketplaceOption[];
  benefits: ExpeditionMarketplaceOption[];
};

type DefaultMarketplaceInput = {
  region: string;
  durationDays: number;
  summary: string;
  title?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function textArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);

  return items.length > 0 ? Array.from(new Set(items)) : fallback;
}

function normalized(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function includesNormalized(values: string[], expected: string | undefined) {
  const target = normalized(expected);

  return !target || values.some((value) => normalized(value) === target);
}

function containsNormalized(value: string, query: string | undefined) {
  const target = normalized(query);

  return !target || normalized(value).includes(target);
}

function defaultHelpActivities(input: DefaultMarketplaceInput) {
  const haystack = `${input.title ?? ""} ${input.summary}`.toLowerCase();

  if (haystack.includes("monitor") || haystack.includes("survey")) {
    return ["Reef Monitoring", "Documentation", "Community Work"];
  }

  if (haystack.includes("mangrove")) {
    return ["Mangrove Planting", "Nursery Work", "Community Work"];
  }

  if (haystack.includes("cleanup") || haystack.includes("plastic")) {
    return ["Ocean Cleanup", "Sorting Waste", "Community Work"];
  }

  return ["Coral Restoration", "Reef Monitoring", "Community Work"];
}

function defaultTravelLength(durationDays: number) {
  if (durationDays <= 7) {
    return "Short Term Stay";
  }

  if (durationDays <= 30) {
    return "Medium Term Stay";
  }

  return "Long Term Stay";
}

export function buildDefaultExpeditionMarketplaceMetadata(input: DefaultMarketplaceInput): ExpeditionMarketplaceMetadata {
  const helpActivities = defaultHelpActivities(input);

  return {
    typeLabel: "Eco Program",
    programTypes: ["Eco Program"],
    highlights: ["Higher chance of approval"],
    purposes: ["Connect with nature", "Learn about sustainability"],
    helpActivities,
    styles: ["Contact with nature", "Rural"],
    collaborationHoursPerWeek: Math.min(32, Math.max(8, input.durationDays * 5)),
    travelLengthLabel: defaultTravelLength(input.durationDays),
    accommodations: ["Shared Dorm"],
    mealsIncluded: "2 meals",
    digitalNomadAmenities: ["Basic Internet Access"],
    benefits: ["Use our equipped kitchen", "Free Events"],
    badges: ["Sustainable project", "Higher approval"],
    additionalFee: null
  };
}

export function normalizeExpeditionMarketplaceMetadata(metadata: unknown, defaults: ExpeditionMarketplaceMetadata): ExpeditionMarketplaceMetadata {
  const source = record(record(metadata).marketplace);
  const fee = record(source.additionalFee);
  const feeAmount = numberValue(fee.amount, 0);
  const feeCurrency = text(fee.currency, defaults.additionalFee?.currency ?? "USD");
  const feePeriod = text(fee.period, defaults.additionalFee?.period ?? "per day");
  const feeDescription = text(fee.description, defaults.additionalFee?.description ?? "");
  const feePaysFor = textArray(fee.paysFor, defaults.additionalFee?.paysFor ?? []);
  const additionalFee =
    feeAmount > 0
      ? {
          amount: feeAmount,
          currency: feeCurrency,
          period: feePeriod,
          description: feeDescription,
          paysFor: feePaysFor
        }
      : null;

  return {
    typeLabel: text(source.typeLabel, defaults.typeLabel),
    programTypes: textArray(source.programTypes, defaults.programTypes),
    highlights: textArray(source.highlights, defaults.highlights),
    purposes: textArray(source.purposes, defaults.purposes),
    helpActivities: textArray(source.helpActivities, defaults.helpActivities),
    styles: textArray(source.styles, defaults.styles),
    collaborationHoursPerWeek: Math.max(0, Math.min(60, numberValue(source.collaborationHoursPerWeek, defaults.collaborationHoursPerWeek))),
    travelLengthLabel: text(source.travelLengthLabel, defaults.travelLengthLabel),
    accommodations: textArray(source.accommodations, defaults.accommodations),
    mealsIncluded: text(source.mealsIncluded, defaults.mealsIncluded),
    digitalNomadAmenities: textArray(source.digitalNomadAmenities, defaults.digitalNomadAmenities),
    benefits: textArray(source.benefits, defaults.benefits),
    badges: textArray(source.badges, defaults.badges),
    additionalFee
  };
}

export function marketplaceSearchHaystack({
  title,
  summary,
  region,
  marketplace
}: {
  title: string;
  summary: string;
  region: string;
  marketplace: ExpeditionMarketplaceMetadata;
}) {
  return [
    title,
    summary,
    region,
    marketplace.typeLabel,
    marketplace.programTypes.join(" "),
    marketplace.highlights.join(" "),
    marketplace.purposes.join(" "),
    marketplace.helpActivities.join(" "),
    marketplace.styles.join(" "),
    marketplace.travelLengthLabel,
    marketplace.accommodations.join(" "),
    marketplace.mealsIncluded,
    marketplace.digitalNomadAmenities.join(" "),
    marketplace.benefits.join(" "),
    marketplace.badges.join(" ")
  ].join(" ");
}

export function expeditionMatchesMarketplaceFilters(
  item: {
    title: string;
    summary: string;
    region: string;
    availabilityLabel: string;
    marketplace: ExpeditionMarketplaceMetadata;
  },
  filters: ExpeditionSearchFilters
) {
  const marketplace = item.marketplace;
  const haystack = marketplaceSearchHaystack(item);

  return (
    containsNormalized(haystack, filters.q) &&
    containsNormalized(item.region, filters.destination) &&
    includesNormalized(marketplace.programTypes, filters.programType) &&
    includesNormalized(marketplace.highlights, filters.highlight) &&
    includesNormalized(marketplace.purposes, filters.purpose) &&
    containsNormalized(item.availabilityLabel, filters.availability) &&
    includesNormalized(marketplace.helpActivities, filters.help) &&
    includesNormalized(marketplace.styles, filters.style) &&
    (!filters.hoursMax || marketplace.collaborationHoursPerWeek <= filters.hoursMax) &&
    containsNormalized(marketplace.travelLengthLabel, filters.travelLength) &&
    containsNormalized(marketplace.mealsIncluded, filters.meals) &&
    includesNormalized(marketplace.accommodations, filters.accommodation) &&
    includesNormalized(marketplace.digitalNomadAmenities, filters.digitalNomad) &&
    includesNormalized(marketplace.benefits, filters.benefits)
  );
}

export function parseExpeditionSearchFilters(params: Record<string, string | string[] | undefined>): ExpeditionSearchFilters {
  const pick = (key: string) => {
    const value = params[key];
    const raw = Array.isArray(value) ? value[0] : value;

    return raw && raw.trim() ? raw.trim() : undefined;
  };
  const hoursMax = Number(pick("hoursMax"));

  return {
    q: pick("q"),
    destination: pick("destination"),
    programType: pick("programType"),
    highlight: pick("highlight"),
    purpose: pick("purpose"),
    availability: pick("availability"),
    help: pick("help"),
    style: pick("style"),
    hoursMax: Number.isFinite(hoursMax) && hoursMax > 0 ? hoursMax : undefined,
    travelLength: pick("travelLength"),
    meals: pick("meals"),
    accommodation: pick("accommodation"),
    digitalNomad: pick("digitalNomad"),
    benefits: pick("benefits"),
    sort: pick("sort")
  };
}

export function expeditionSearchParams(filters: ExpeditionSearchFilters, overrides: Partial<Record<keyof ExpeditionSearchFilters, string | number | null | undefined>> = {}) {
  const params = new URLSearchParams();
  const values = { ...filters, ...overrides };

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      params.set(key, String(value));
    }
  }

  return params.toString();
}

export function activeExpeditionFilterCount(filters: ExpeditionSearchFilters) {
  return Object.entries(filters).filter(([key, value]) => key !== "sort" && value !== undefined && value !== null && String(value).trim()).length;
}

export function buildExpeditionMarketplaceFacets(
  items: Array<{
    region: string;
    availabilityLabel: string;
    marketplace: ExpeditionMarketplaceMetadata;
  }>
): ExpeditionMarketplaceFacets {
  const countMap = new Map<string, Map<string, number>>();

  function add(group: string, values: string[]) {
    const map = countMap.get(group) ?? new Map<string, number>();

    for (const value of values.filter(Boolean)) {
      map.set(value, (map.get(value) ?? 0) + 1);
    }

    countMap.set(group, map);
  }

  for (const item of items) {
    add("destinations", [item.region]);
    add("programTypes", item.marketplace.programTypes);
    add("highlights", item.marketplace.highlights);
    add("purposes", item.marketplace.purposes);
    add("availability", [item.availabilityLabel]);
    add("helpActivities", item.marketplace.helpActivities);
    add("styles", item.marketplace.styles);
    add("travelLengths", [item.marketplace.travelLengthLabel]);
    add("meals", [item.marketplace.mealsIncluded]);
    add("accommodations", item.marketplace.accommodations);
    add("digitalNomadAmenities", item.marketplace.digitalNomadAmenities);
    add("benefits", item.marketplace.benefits);
  }

  function options(group: string): ExpeditionMarketplaceOption[] {
    return Array.from(countMap.get(group)?.entries() ?? [])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }));
  }

  return {
    destinations: options("destinations"),
    programTypes: options("programTypes"),
    highlights: options("highlights"),
    purposes: options("purposes"),
    availability: options("availability"),
    helpActivities: options("helpActivities"),
    styles: options("styles"),
    travelLengths: options("travelLengths"),
    meals: options("meals"),
    accommodations: options("accommodations"),
    digitalNomadAmenities: options("digitalNomadAmenities"),
    benefits: options("benefits")
  };
}

export function sortExpeditionMarketplaceItems<T extends { price: number; title: string; marketplace: ExpeditionMarketplaceMetadata; nextDepartureStartsAt?: Date | null }>(
  items: T[],
  sort?: string
) {
  const sorted = [...items];

  if (sort === "price_asc") {
    sorted.sort((a, b) => a.price - b.price || a.title.localeCompare(b.title));
  } else if (sort === "hours_asc") {
    sorted.sort((a, b) => a.marketplace.collaborationHoursPerWeek - b.marketplace.collaborationHoursPerWeek || a.title.localeCompare(b.title));
  } else if (sort === "soonest") {
    sorted.sort((a, b) => (a.nextDepartureStartsAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.nextDepartureStartsAt?.getTime() ?? Number.MAX_SAFE_INTEGER));
  } else {
    sorted.sort((a, b) => {
      const aFeatured = a.marketplace.badges.some((badge) => normalized(badge).includes("top")) ? 0 : 1;
      const bFeatured = b.marketplace.badges.some((badge) => normalized(badge).includes("top")) ? 0 : 1;

      return aFeatured - bFeatured || a.title.localeCompare(b.title);
    });
  }

  return sorted;
}
