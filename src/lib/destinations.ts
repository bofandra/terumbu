export type DestinationProfile = {
  slug: string;
  name: string;
  regionMatchers: string[];
  eyebrow: string;
  headline: string;
  summary: string;
  conservationFocus: string[];
  travelNotes: string[];
};

export const destinationProfiles: DestinationProfile[] = [
  {
    slug: "raja-ampat",
    name: "Raja Ampat",
    regionMatchers: ["raja ampat", "sorong"],
    eyebrow: "West Papua conservation travel",
    headline: "Conservation expeditions in Raja Ampat",
    summary: "Explore one of Indonesia's most biodiverse marine regions while learning from local conservation teams and supporting verified field programs.",
    conservationFocus: ["Coral restoration", "Reef monitoring", "Community-led marine conservation", "Responsible snorkeling and diving"],
    travelNotes: ["Most routes begin through Sorong", "Island transfers depend on weather and sea conditions", "Plan extra travel buffer for remote departures"]
  },
  {
    slug: "bali",
    name: "Bali",
    regionMatchers: ["bali", "nusa penida", "nusa lembongan"],
    eyebrow: "Bali conservation travel",
    headline: "Conservation expeditions in Bali",
    summary: "Combine accessible island travel with reef, coastal, community, and marine conservation experiences linked to measurable field activity.",
    conservationFocus: ["Reef restoration", "Marine debris reduction", "Coastal education", "Community conservation"],
    travelNotes: ["International access through Bali makes short conservation trips easier to plan", "Confirm transfer time to island or coastal project sites", "Peak seasons can affect local transport"]
  },
  {
    slug: "komodo",
    name: "Komodo",
    regionMatchers: ["komodo", "labuan bajo", "flores"],
    eyebrow: "Flores and Komodo conservation travel",
    headline: "Conservation expeditions around Komodo",
    summary: "Discover marine and coastal ecosystems around Flores and Komodo through small-group experiences designed around responsible access and local stewardship.",
    conservationFocus: ["Marine monitoring", "Coastal conservation", "Community stewardship", "Responsible wildlife tourism"],
    travelNotes: ["Labuan Bajo is the common arrival hub", "Boat routes may change for weather and safety", "Protected-area rules take priority over itinerary convenience"]
  },
  {
    slug: "wakatobi",
    name: "Wakatobi",
    regionMatchers: ["wakatobi"],
    eyebrow: "Southeast Sulawesi conservation travel",
    headline: "Conservation expeditions in Wakatobi",
    summary: "Join marine conservation experiences in a globally significant reef landscape while supporting local knowledge, monitoring, and restoration work.",
    conservationFocus: ["Coral reef monitoring", "Restoration support", "Marine education", "Local guide participation"],
    travelNotes: ["Remote transport requires additional planning", "Connectivity can be limited", "Allow schedule buffer around sea and air connections"]
  },
  {
    slug: "lombok",
    name: "Lombok",
    regionMatchers: ["lombok", "gili"],
    eyebrow: "Lombok conservation travel",
    headline: "Conservation expeditions in Lombok",
    summary: "Explore reef and coastal conservation opportunities around Lombok and the Gilis with clear impact links and local field partners.",
    conservationFocus: ["Reef restoration", "Marine monitoring", "Waste reduction", "Community conservation"],
    travelNotes: ["Access is available by air and fast boat depending on origin", "Check seasonal sea conditions", "Confirm exact meeting point before booking onward transport"]
  }
];

export function destinationBySlug(slug: string) {
  return destinationProfiles.find((destination) => destination.slug === slug) ?? null;
}

export function expeditionMatchesDestination(region: string, destination: DestinationProfile) {
  const normalized = region.toLowerCase();
  return destination.regionMatchers.some((matcher) => normalized.includes(matcher));
}
