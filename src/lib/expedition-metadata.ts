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

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback: number) {
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

  return value.map((item, index) => mapper(record(item), fallback[index] ?? fallback[0])).filter(Boolean);
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
  const capacityLabel = input.maxCapacity > 0 ? `Max ${input.maxCapacity} people` : "Capacity pending";

  return {
    categoryLabel: "Coral Restoration Expedition",
    activitySummary: "Boat travel, snorkeling, and outdoor field conditions.",
    rating: 4.9,
    reviewCount: 128,
    participantCount: 340,
    difficulty: "Moderate",
    minimumAge: 16,
    languages: ["English", "Bahasa Indonesia"],
    skillRequirements: ["Snorkeling ability required", "Diving certification optional"],
    tags: ["Coral restoration", "Reef monitoring", "Community-based conservation", "Snorkeling", "Small group", "SDG 14"],
    quickFacts: [
      { label: "Duration", value: input.durationLabel },
      { label: "Small group", value: capacityLabel },
      { label: "Difficulty", value: "Moderate" },
      { label: "Min. age", value: "16+ years old" },
      { label: "Swimming ability", value: "Snorkeling required" },
      { label: "Per person", value: formatCurrency(input.price) }
    ],
    galleryImages: input.galleryImages,
    hostedBy: input.hostedBy ?? {
      title: "Hosted by Terumbu.eco",
      verificationLabel: "Verified Expedition Partner",
      profileHref: "",
      profileLabel: "View partner profile"
    },
    overview: {
      title: "A Conservation Journey, Not Just a Holiday",
      paragraphs: [
        `This expedition blends adventure and purpose. You will explore ${input.region}'s seascapes, learn from local conservation experts, and contribute to active coral restoration projects.`,
        "Participants support field teams through supervised preparation, documentation, and learning activities. The work is designed to help, not replace trained restoration practitioners."
      ],
      pillars: [
        { title: "Explore", body: "Discover pristine lagoons, islands, and vibrant marine life." },
        { title: "Contribute", body: "Assist with supervised restoration, monitoring, and cleanups." },
        { title: "Learn", body: "Gain knowledge from marine professionals and local teams." }
      ],
      passportNote: "Impact recorded in your Passport after completion."
    },
    highlights: [
      { title: "Prepare coral fragments with trained restoration staff", status: "Weather-dependent" },
      { title: "Visit an active coral nursery", status: "Weather-dependent" },
      { title: "Record basic reef-monitoring observations", status: "Included" },
      { title: "Learn from local marine conservation practitioners", status: "Guaranteed" },
      { title: "Support community-led conservation", status: "Included" },
      { title: "Receive a verified expedition record in your Impact Passport", status: "Included" }
    ],
    impact: {
      title: "How This Expedition Creates Impact",
      summary: "Each booking directly supports the associated conservation program.",
      contributionPercent: 16,
      methodologyUpdatedAt: "2026-06-01",
      methodologyNote:
        "Estimates use booking allocation, unit-cost assumptions from the related campaign, a monitoring period of one field cycle, and partner evidence records.",
      targets: [
        { value: "500", label: "Coral fragments supported" },
        { value: "3", label: "Monitoring visits funded" },
        { value: "12", label: "Local workdays supported" },
        { value: "1", label: "Community education session" }
      ],
      allocation: [
        { label: "Field conservation activities", percent: 35 },
        { label: "Local guides and community services", percent: 25 },
        { label: "Accommodation and meals", percent: 18 },
        { label: "Boats and local transport", percent: 12 },
        { label: "Safety, insurance, and equipment", percent: 6 },
        { label: "Platform operations", percent: 4 }
      ]
    },
    priceBreakdown: {
      equipmentRental: 250000,
      platformFeePercent: 4
    },
    itineraryTitle: `${input.durationLabel.split(" / ")[0]} in the field`,
    itineraryDisclaimer: "Itinerary may change because of weather, sea conditions, conservation priorities, or safety considerations.",
    itinerary: [
      {
        day: "Day 1",
        title: "Arrival and Orientation",
        meals: "Dinner",
        physicalLevel: "Light",
        activities: ["Sorong arrival", "Transfer to harbor", "Boat journey to base island", "Safety and conservation briefing", "Welcome dinner"]
      },
      {
        day: "Day 2",
        title: "Coral Nursery and Field Training",
        meals: "Breakfast, lunch, dinner",
        physicalLevel: "Moderate",
        activities: ["Reef-ecology introduction", "Equipment familiarization", "Coral nursery visit", "Supervised conservation activity", "Field debrief"]
      },
      {
        day: "Day 3",
        title: "Reef Monitoring and Community Program",
        meals: "Breakfast, lunch, dinner",
        physicalLevel: "Moderate",
        activities: ["Monitoring-site visit", "Photo and observation recording", "Community conservation discussion", "Optional snorkeling", "Impact-data review"]
      },
      {
        day: "Day 4",
        title: "Reflection and Departure",
        meals: "Breakfast",
        physicalLevel: "Light",
        activities: ["Final learning session", "Participant feedback", "Impact Passport confirmation", "Boat transfer", "Departure from Sorong"]
      }
    ],
    included: [
      "Three nights of accommodation",
      "Meals listed in the itinerary",
      "Local boat transport",
      "Harbor transfer",
      "Conservation activities",
      "Field equipment",
      "Expedition leader and local guide",
      "Participant insurance",
      "Impact Passport record",
      "Digital participation certificate"
    ],
    notIncluded: [
      "Flight to Sorong",
      "Personal travel insurance extension",
      "Diving equipment unless selected",
      "Personal expenses",
      "Additional accommodation",
      "Optional activities",
      "Medical testing or certification"
    ],
    requirements: [
      "Comfortable on small boats",
      "Able to swim or snorkel",
      "Able to walk on uneven and wet surfaces",
      "Able to join outdoor activity for several hours",
      "No conservation experience required"
    ],
    safety: [
      "Life jackets provided",
      "Certified boat operators",
      "First-aid equipment",
      "Emergency communication",
      "Weather monitoring",
      "Participant insurance",
      "Maximum ratio: 1 facilitator for every 6 participants"
    ],
    emergencyPlanSummary: "A public summary is provided during briefing. Sensitive operational details are shared only with confirmed participants.",
    sustainability: [
      "No coral touching without direct instruction",
      "No wildlife feeding",
      "Reef-safe personal products encouraged",
      "Local procurement where practical",
      "Waste-management protocol",
      "Community consent and conservation-first itinerary decisions"
    ],
    route: {
      title: "Route without exposing sensitive reef coordinates",
      mapTitle: `OpenStreetMap route preview for ${input.region} expedition`,
      mapEmbedUrl: "https://www.openstreetmap.org/export/embed.html?bbox=130.2%2C-0.7%2C131%2C0.2&layer=mapnik",
      privacyNote: "Precise restoration-site coordinates are hidden to protect the ecosystem.",
      sidebarTitle: "Route privacy",
      sidebarNote: "Exact restoration coordinates are hidden. Public maps show approximate zones and travel sequence only.",
      steps: ["Sorong Airport", "Sorong Harbor", "Expedition Base Island", "General conservation zone"],
      travelTimes: ["Airport to harbor: 20-30 min", "Harbor to island: 2-3 hours by boat", "Daily boat journey: 20-45 min depending on sea conditions"]
    },
    accommodation: {
      name: `${input.region} Eco-lodge partner stay`,
      type: "Shared twin room included",
      details: ["Fan-cooled rooms", "Shared or private bathroom by availability", "Limited mobile coverage", "Refill drinking water", "Local meals served family-style"],
      mealNote: "Three breakfasts, three lunches, and three dinners are included. Vegetarian and halal-friendly meals can be requested; allergy-safe preparation cannot be guaranteed."
    },
    team: [
      { name: "Dimas Pratama", role: "Expedition leader", detail: "8 years leading marine field programs / English and Bahasa Indonesia" },
      { name: "Partner field team", role: "Marine conservation lead", detail: "Restoration and monitoring partner for the associated campaign" },
      { name: "Local community coordinator", role: "Participant support", detail: "Coordinates village etiquette, meals, transfers, and local guides" },
      { name: "Safety officer", role: "First-aid lead", detail: "Responsible for field briefings and emergency communication" }
    ],
    preparationCourse: input.preparationCourse ?? {
      title: "Expedition Preparation",
      summary: "Review conservation etiquette, safety expectations, and field participation basics before departure.",
      imageUrl: null,
      href: "/academy",
      ctaLabel: "Open Academy"
    },
    reviewCategories: [
      { label: "Conservation experience", value: "Excellent" },
      { label: "Field-team quality", value: "Excellent" },
      { label: "Safety", value: "Excellent" },
      { label: "Accommodation", value: "Excellent" },
      { label: "Value", value: "Excellent" }
    ],
    reviews: [
      {
        name: "Raka A.",
        joinedAs: "First-time conservation traveler",
        rating: 5,
        date: "June 2026",
        body: "The field team explained what we could safely help with and what should be left to trained restorers. It felt purposeful and careful."
      },
      {
        name: "Maya S.",
        joinedAs: "Student participant",
        rating: 5,
        date: "May 2026",
        body: "The best part was reviewing monitoring photos and understanding how evidence becomes part of the campaign record."
      }
    ],
    tripUpdates: input.tripUpdates,
    cancellationPolicy: [
      { label: "More than 30 days before departure", refund: "90%" },
      { label: "15-30 days before departure", refund: "50%" },
      { label: "Fewer than 15 days", refund: "Non-refundable" },
      { label: "Operator cancellation", refund: "Full refund or reschedule" }
    ],
    faqs: [
      { question: "Do I need conservation experience?", answer: "No. Field activities are supervised and designed for beginners." },
      { question: "Do I need to be able to dive?", answer: "No. Snorkeling ability is required; diving certification is only needed for optional diving activities." },
      { question: "Are flights included?", answer: `Flights to ${input.region} are not included unless the partner adds them to the included list.` },
      { question: "How is my booking contribution used?", answer: "The booking contribution supports field conservation activity connected to the associated campaign." },
      { question: "Will this appear in my Impact Passport?", answer: "Confirmed participants receive a verified expedition record after completion." }
    ],
    finalCta: {
      eyebrow: "Final call",
      title: `Join the ${input.title}`,
      body: "Learn from local conservation teams, contribute to active field work, and bring the experience into your Impact Passport.",
      primaryLabel: "Check Available Dates",
      secondaryLabel: "Ask the Expedition Team"
    },
    weatherAdvisory: {
      title: "Weather advisory",
      body: "Boat schedules may shift for sea conditions. Confirmed participants receive operational updates before departure."
    },
    bookingTrustIndicators: ["Secure payment", "Verified partner", "Insurance included", "Transparent pricing"]
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
  const preparationCourse = record(source.preparationCourse);
  const finalCta = record(source.finalCta);
  const weatherAdvisory = record(source.weatherAdvisory);

  return {
    categoryLabel: text(source.categoryLabel, defaults.categoryLabel),
    activitySummary: text(source.activitySummary, defaults.activitySummary),
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
