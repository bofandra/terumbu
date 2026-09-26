export const destinationStatuses = ["draft", "published", "archived"] as const;

export const destinationIslandGroups = [
  "Sumatra",
  "Java",
  "Bali & Nusa Tenggara",
  "Kalimantan",
  "Sulawesi",
  "Maluku",
  "Papua"
] as const;

export const destinationProvinceOptions = [
  "Aceh",
  "North Sumatra",
  "West Sumatra",
  "Riau",
  "Riau Islands",
  "Jambi",
  "South Sumatra",
  "Bangka Belitung Islands",
  "Bengkulu",
  "Lampung",
  "Banten",
  "Jakarta",
  "West Java",
  "Central Java",
  "Yogyakarta",
  "East Java",
  "Bali",
  "West Nusa Tenggara",
  "East Nusa Tenggara",
  "West Kalimantan",
  "Central Kalimantan",
  "South Kalimantan",
  "East Kalimantan",
  "North Kalimantan",
  "North Sulawesi",
  "Gorontalo",
  "Central Sulawesi",
  "West Sulawesi",
  "South Sulawesi",
  "Southeast Sulawesi",
  "Maluku",
  "North Maluku",
  "West Papua",
  "Southwest Papua",
  "Papua",
  "Central Papua",
  "Highland Papua",
  "South Papua"
] as const;

export const destinationConservationFocusOptions = [
  "Coral restoration",
  "Reef monitoring",
  "Marine conservation",
  "Mangrove restoration",
  "Coastal restoration",
  "Marine debris reduction",
  "Waste reduction",
  "Wildlife monitoring",
  "Community conservation",
  "Environmental education",
  "Sustainable agriculture",
  "Biodiversity monitoring"
] as const;

export const destinationArrivalHubTypes = ["airport", "port", "city", "station"] as const;

export const destinationMonthOptions = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
] as const;

export type DestinationStatus = (typeof destinationStatuses)[number];

export type DestinationArrivalHub = {
  type: (typeof destinationArrivalHubTypes)[number];
  name: string;
  code: string;
};

function record(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function destinationStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean)
    )
  );
}

export function destinationMonthArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 12)
    )
  ).sort((a, b) => a - b);
}

export function destinationArrivalHubs(value: unknown): DestinationArrivalHub[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => record(item))
    .map((item) => {
      const typeValue = String(item.type ?? "").trim().toLowerCase();
      const type = destinationArrivalHubTypes.includes(typeValue as DestinationArrivalHub["type"])
        ? (typeValue as DestinationArrivalHub["type"])
        : "city";
      const name = String(item.name ?? "").trim();
      const code = String(item.code ?? "").trim().toUpperCase();

      return { type, name, code };
    })
    .filter((item) => item.name);
}

export function destinationStatus(value: unknown): DestinationStatus {
  const candidate = String(value ?? "").trim();

  return destinationStatuses.includes(candidate as DestinationStatus)
    ? (candidate as DestinationStatus)
    : "draft";
}

export function destinationMonthLabels(months: number[]) {
  const labels = new Map(destinationMonthOptions.map((month) => [month.value, month.label]));

  return months.map((month) => labels.get(month)).filter((label): label is string => Boolean(label));
}
