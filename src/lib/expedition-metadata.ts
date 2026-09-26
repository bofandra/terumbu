import { formatCurrency } from "@/lib/utils";

export type ExpeditionGalleryImage = {
  src: string;
  label: string;
  caption: string;
  provenance: string;
};

export type ExpeditionDetailMetadata = {
  categoryLabel: string;
  activitySummary: string;
  documentationUrl: string;
  rating: number;
  reviewCount: number;
  participantCount: number;
  difficulty: string;
  minimumAge: number;
  languages: string[];
  skillRequirements: string[];
  tags: string[];
  quickFacts: { label: string; value: string }[];
  galleryImages: ExpeditionGalleryImage[];
  hostedBy: {
    title: string;
    verificationLabel: string;
    profileHref: string;
    profileLabel: string;
  };
  overview: {
    title: string;
    paragraphs: string[];
    pillars: { title: string; body: string }[];
    passportNote: string;
  };
  highlights: { title: string; status: string }[];
  impact: {
    title: string;
    summary: string;
    contributionPercent: number;
    conservationContribution?: number;
    methodologyUpdatedAt: string;
    methodologyNote: string;
    targets: { value: string; label: string }[];
    allocation: { label: string; percent: number }[];
  };
  priceBreakdown: {
    equipmentRental: number;
    platformFeePercent: number;
    platformFee?: number;
  };
  itineraryTitle: string;
  itineraryDisclaimer: string;
  itinerary: {
    day: string;
    title: string;
    meals: string;
    physicalLevel: string;
    activities: string[];
  }[];
  included: string[];
  notIncluded: string[];
  requirements: string[];
  safety: string[];
  emergencyPlanSummary: string;
  sustainability: string[];
  route: {
    title: string;
    mapTitle: string;
    mapEmbedUrl: string;
    privacyNote: string;
    sidebarTitle: string;
    sidebarNote: string;
    steps: string[];
    travelTimes: string[];
  };
  accommodation: {
    name: string;
    type: string;
    details: string[];
    mealNote: string;
  };
  travelInfo: {
    meetingPoint: string;
    nearestAirport: string;
    airportTransfer: string;
    arrivalGuidance: string;
    visaGuidance: string;
    insuranceGuidance: string;
    connectivity: string;
    localTimeZone: string;
    supportContact: string;
    packingHighlights: string[];
  };
  team: { name: string; role: string; detail: string }[];
  preparationCourse: {
    title: string;
    summary: string;
    imageUrl: string | null;
    href: string;
    ctaLabel: string;
  };
  reviewCategories: { label: string; value: string }[];
  reviews: {
    name: string;
    joinedAs: string;
    rating: number;
    date: string;
    body: string;
  }[];
  tripUpdates: {
    title: string;
    date: string;
    body: string;
  }[];
  cancellationPolicy: { label: string; refund: string }[];
  faqs: { question: string; answer: string }[];
  finalCta: {
    eyebrow: string;
    title: string;
    body: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
  weatherAdvisory: {
    title: string;
    body: string;
  };
  bookingTrustIndicators: string[];
};

type DefaultExpeditionMetadataInput = {
  title: string;
  region: string;
  durationLabel: string;
  price: number;
  currency?: string;
  maxCapacity: number;
  galleryImages: ExpeditionGalleryImage[];
  tripUpdates: ExpeditionDetailMetadata["tripUpdates"];
  hostedBy?: ExpeditionDetailMetadata["hostedBy"];
  preparationCourse?: ExpeditionDetailMetadata["preparationCourse"];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : undefined;
}

function textArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function objectArray<T>(value: unknown, fallback: T[], mapper: (value: Record<string, unknown>, fallback: T) => T) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return value.map((item, index) => mapper(record(item), fallback[index] ?? fallback[0] ?? ({} as T))).filter(Boolean);
}

function pairArray(value: unknown, fallback: { label: string; value: string }[]) {
  return objectArray(value, fallback, (item, itemFallback) => ({
    label: text(item.label, itemFallback.label),
    value: text(item.value, itemFallback.value)
  }));
}

function labeledPercentArray(value: unknown, fallback: { label: string; percent: number }[]) {
  return objectArray(value, fallback, (item, itemFallback) => ({
    label: text(item.label, itemFallback.label),
    percent: Math.max(0, Math.min(100, numberValue(item.percent, itemFallback.percent)))
  }));
}

function faqArray(value: unknown, fallback: { question: string; answer: string }[]) {
  return objectArray(value, fallback, (item, itemFallback) => ({
    question: text(item.question, itemFallback.question),
    answer: text(item.answer, itemFallback.answer)
  }));
}

export function parseExpeditionMetadataJson(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return { metadata: null as Record<string, unknown> | null, error: null as string | null };
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    if (!isRecord(parsed)) {
      return { metadata: null, error: "expedition-metadata-json" };
    }

    return { metadata: parsed, error: null };
  } catch {
    return { metadata: null, error: "expedition-metadata-json" };
  }
}

export function buildDefaultExpeditionDetailMetadata(input: DefaultExpeditionMetadataInput): ExpeditionDetailMetadata {
  const quickFacts: { label: string; value: string }[] = [];
  if (input.durationLabel.trim()) quickFacts.push({ label: "Duration", value: input.durationLabel });
  if (input.maxCapacity > 0) quickFacts.push({ label: "Group size", value: `Up to ${input.maxCapacity} people` });
  if (input.price > 0) quickFacts.push({ label: "Per person", value: formatCurrency(input.price, input.currency) });
  return {
    categoryLabel: "", activitySummary: "", documentationUrl: "", rating: 0, reviewCount: 0, participantCount: 0, difficulty: "", minimumAge: 0,
    languages: [], skillRequirements: [], tags: [], quickFacts, galleryImages: input.galleryImages,
    hostedBy: input.hostedBy ?? { title: "", verificationLabel: "", profileHref: "", profileLabel: "View partner profile" },
    overview: { title: "", paragraphs: [], pillars: [], passportNote: "" }, highlights: [],
    impact: { title: "", summary: "", contributionPercent: 0, methodologyUpdatedAt: "", methodologyNote: "", targets: [], allocation: [] },
    priceBreakdown: { equipmentRental: 0, platformFeePercent: 0 }, itineraryTitle: "", itineraryDisclaimer: "", itinerary: [], included: [], notIncluded: [],
    requirements: [], safety: [], emergencyPlanSummary: "", sustainability: [],
    route: { title: "", mapTitle: "", mapEmbedUrl: "", privacyNote: "", sidebarTitle: "", sidebarNote: "", steps: [], travelTimes: [] },
    accommodation: { name: "", type: "", details: [], mealNote: "" },
    travelInfo: { meetingPoint: "", nearestAirport: "", airportTransfer: "", arrivalGuidance: "", visaGuidance: "", insuranceGuidance: "", connectivity: "", localTimeZone: "", supportContact: "", packingHighlights: [] },
    team: [],
    preparationCourse: input.preparationCourse ?? { title: "", summary: "", imageUrl: null, href: "", ctaLabel: "Open course" },
    reviewCategories: [], reviews: [], tripUpdates: input.tripUpdates, cancellationPolicy: [], faqs: [],
    finalCta: { eyebrow: "", title: `Join ${input.title}`, body: "", primaryLabel: "Check Available Dates", secondaryLabel: "Ask the Expedition Team" },
    weatherAdvisory: { title: "", body: "" }, bookingTrustIndicators: []
  };
}

export function normalizeExpeditionDetailMetadata(metadata: unknown, defaults: ExpeditionDetailMetadata): ExpeditionDetailMetadata {
  const source = record(metadata);
  const overview = record(source.overview);
  const impact = record(source.impact);
  const priceBreakdown = record(source.priceBreakdown);
  const hostedBy = record(source.hostedBy);
  const route = record(source.route);
  const accommodation = record(source.accommodation);
  const travelInfo = record(source.travelInfo);
  const preparationCourse = record(source.preparationCourse);
  const finalCta = record(source.finalCta);
  const weatherAdvisory = record(source.weatherAdvisory);

  return {
    categoryLabel: text(source.categoryLabel, defaults.categoryLabel),
    activitySummary: text(source.activitySummary, defaults.activitySummary),
    documentationUrl: typeof source.documentationUrl === "string" ? source.documentationUrl.trim() : defaults.documentationUrl,
    rating: numberValue(source.rating, defaults.rating),
    reviewCount: numberValue(source.reviewCount, defaults.reviewCount),
    participantCount: numberValue(source.participantCount, defaults.participantCount),
    difficulty: text(source.difficulty, defaults.difficulty),
    minimumAge: numberValue(source.minimumAge, defaults.minimumAge),
    languages: textArray(source.languages, defaults.languages),
    skillRequirements: textArray(source.skillRequirements, defaults.skillRequirements),
    tags: textArray(source.tags, defaults.tags),
    quickFacts: pairArray(source.quickFacts, defaults.quickFacts),
    galleryImages: objectArray(source.galleryImages, defaults.galleryImages, (item, itemFallback) => ({
      src: text(item.src, itemFallback.src),
      label: text(item.label, itemFallback.label),
      caption: text(item.caption, itemFallback.caption),
      provenance: text(item.provenance, itemFallback.provenance)
    })),
    hostedBy: {
      title: text(hostedBy.title, defaults.hostedBy.title),
      verificationLabel: text(hostedBy.verificationLabel, defaults.hostedBy.verificationLabel),
      profileHref: typeof hostedBy.profileHref === "string" ? hostedBy.profileHref.trim() : defaults.hostedBy.profileHref,
      profileLabel: text(hostedBy.profileLabel, defaults.hostedBy.profileLabel)
    },
    overview: {
      title: text(overview.title, defaults.overview.title),
      paragraphs: textArray(overview.paragraphs, defaults.overview.paragraphs),
      pillars: objectArray(overview.pillars, defaults.overview.pillars, (item, itemFallback) => ({
        title: text(item.title, itemFallback.title),
        body: text(item.body, itemFallback.body)
      })),
      passportNote: text(overview.passportNote, defaults.overview.passportNote)
    },
    highlights: objectArray(source.highlights, defaults.highlights, (item, itemFallback) => ({
      title: text(item.title, itemFallback.title),
      status: text(item.status, itemFallback.status)
    })),
    impact: {
      title: text(impact.title, defaults.impact.title),
      summary: text(impact.summary, defaults.impact.summary),
      contributionPercent: numberValue(impact.contributionPercent, defaults.impact.contributionPercent),
      conservationContribution: optionalNumber(impact.conservationContribution) ?? defaults.impact.conservationContribution,
      methodologyUpdatedAt: text(impact.methodologyUpdatedAt, defaults.impact.methodologyUpdatedAt),
      methodologyNote: text(impact.methodologyNote, defaults.impact.methodologyNote),
      targets: pairArray(impact.targets, defaults.impact.targets),
      allocation: labeledPercentArray(impact.allocation, defaults.impact.allocation)
    },
    priceBreakdown: {
      equipmentRental: numberValue(priceBreakdown.equipmentRental, defaults.priceBreakdown.equipmentRental),
      platformFeePercent: numberValue(priceBreakdown.platformFeePercent, defaults.priceBreakdown.platformFeePercent),
      platformFee: optionalNumber(priceBreakdown.platformFee) ?? defaults.priceBreakdown.platformFee
    },
    itineraryTitle: text(source.itineraryTitle, defaults.itineraryTitle),
    itineraryDisclaimer: text(source.itineraryDisclaimer, defaults.itineraryDisclaimer),
    itinerary: objectArray(source.itinerary, defaults.itinerary, (item, itemFallback) => ({
      day: text(item.day, itemFallback.day),
      title: text(item.title, itemFallback.title),
      meals: text(item.meals, itemFallback.meals),
      physicalLevel: text(item.physicalLevel, itemFallback.physicalLevel),
      activities: textArray(item.activities, itemFallback.activities)
    })),
    included: textArray(source.included, defaults.included),
    notIncluded: textArray(source.notIncluded, defaults.notIncluded),
    requirements: textArray(source.requirements, defaults.requirements),
    safety: textArray(source.safety, defaults.safety),
    emergencyPlanSummary: text(source.emergencyPlanSummary, defaults.emergencyPlanSummary),
    sustainability: textArray(source.sustainability, defaults.sustainability),
    route: {
      title: text(route.title, defaults.route.title),
      mapTitle: text(route.mapTitle, defaults.route.mapTitle),
      mapEmbedUrl: text(route.mapEmbedUrl, defaults.route.mapEmbedUrl),
      privacyNote: text(route.privacyNote, defaults.route.privacyNote),
      sidebarTitle: text(route.sidebarTitle, defaults.route.sidebarTitle),
      sidebarNote: text(route.sidebarNote, defaults.route.sidebarNote),
      steps: textArray(route.steps, defaults.route.steps),
      travelTimes: textArray(route.travelTimes, defaults.route.travelTimes)
    },
    accommodation: {
      name: text(accommodation.name, defaults.accommodation.name),
      type: text(accommodation.type, defaults.accommodation.type),
      details: textArray(accommodation.details, defaults.accommodation.details),
      mealNote: text(accommodation.mealNote, defaults.accommodation.mealNote)
    },
    travelInfo: {
      meetingPoint: text(travelInfo.meetingPoint, defaults.travelInfo.meetingPoint),
      nearestAirport: text(travelInfo.nearestAirport, defaults.travelInfo.nearestAirport),
      airportTransfer: text(travelInfo.airportTransfer, defaults.travelInfo.airportTransfer),
      arrivalGuidance: text(travelInfo.arrivalGuidance, defaults.travelInfo.arrivalGuidance),
      visaGuidance: text(travelInfo.visaGuidance, defaults.travelInfo.visaGuidance),
      insuranceGuidance: text(travelInfo.insuranceGuidance, defaults.travelInfo.insuranceGuidance),
      connectivity: text(travelInfo.connectivity, defaults.travelInfo.connectivity),
      localTimeZone: text(travelInfo.localTimeZone, defaults.travelInfo.localTimeZone),
      supportContact: text(travelInfo.supportContact, defaults.travelInfo.supportContact),
      packingHighlights: textArray(travelInfo.packingHighlights, defaults.travelInfo.packingHighlights)
    },
    team: objectArray(source.team, defaults.team, (item, itemFallback) => ({
      name: text(item.name, itemFallback.name),
      role: text(item.role, itemFallback.role),
      detail: text(item.detail, itemFallback.detail)
    })),
    preparationCourse: {
      title: text(preparationCourse.title, defaults.preparationCourse.title),
      summary: text(preparationCourse.summary, defaults.preparationCourse.summary),
      imageUrl: typeof preparationCourse.imageUrl === "string" && preparationCourse.imageUrl.trim() ? preparationCourse.imageUrl.trim() : defaults.preparationCourse.imageUrl,
      href: text(preparationCourse.href, defaults.preparationCourse.href),
      ctaLabel: text(preparationCourse.ctaLabel, defaults.preparationCourse.ctaLabel)
    },
    reviewCategories: objectArray(source.reviewCategories, defaults.reviewCategories, (item, itemFallback) => ({
      label: text(item.label, itemFallback.label),
      value: text(item.value, itemFallback.value)
    })),
    reviews: objectArray(source.reviews, defaults.reviews, (item, itemFallback) => ({
      name: text(item.name, itemFallback.name),
      joinedAs: text(item.joinedAs, itemFallback.joinedAs),
      rating: numberValue(item.rating, itemFallback.rating),
      date: text(item.date, itemFallback.date),
      body: text(item.body, itemFallback.body)
    })),
    tripUpdates: objectArray(source.tripUpdates, defaults.tripUpdates, (item, itemFallback) => ({
      title: text(item.title, itemFallback.title),
      date: text(item.date, itemFallback.date),
      body: text(item.body, itemFallback.body)
    })),
    cancellationPolicy: objectArray(source.cancellationPolicy, defaults.cancellationPolicy, (item, itemFallback) => ({
      label: text(item.label, itemFallback.label),
      refund: text(item.refund, itemFallback.refund)
    })),
    faqs: faqArray(source.faqs, defaults.faqs),
    finalCta: {
      eyebrow: text(finalCta.eyebrow, defaults.finalCta.eyebrow),
      title: text(finalCta.title, defaults.finalCta.title),
      body: text(finalCta.body, defaults.finalCta.body),
      primaryLabel: text(finalCta.primaryLabel, defaults.finalCta.primaryLabel),
      secondaryLabel: text(finalCta.secondaryLabel, defaults.finalCta.secondaryLabel)
    },
    weatherAdvisory: {
      title: text(weatherAdvisory.title, defaults.weatherAdvisory.title),
      body: text(weatherAdvisory.body, defaults.weatherAdvisory.body)
    },
    bookingTrustIndicators: textArray(source.bookingTrustIndicators, defaults.bookingTrustIndicators)
  };
}

export function expeditionMetadataEditorJson(metadata: ExpeditionDetailMetadata) {
  return JSON.stringify(metadata, null, 2);
}

export function metadataDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date("2026-06-01T00:00:00.000Z") : date;
}
