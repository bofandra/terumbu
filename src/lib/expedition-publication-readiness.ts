import { expeditionTravelerReadiness, type ExpeditionDetailMetadata } from "@/lib/expedition-metadata";
import { expeditionDepartureMatchesSearch } from "@/lib/expedition-marketplace";

type PublicationTab = "content" | "departures";

export type PublicationDeparture = {
  startsAt: Date;
  endsAt: Date;
  status: string;
  capacity: number;
  seatsBooked: number;
  heldSeats?: number;
};

/** Only an upcoming, valid, open departure with at least one free seat qualifies. */
export function hasBookablePublicationDeparture(departures: PublicationDeparture[], now = new Date()) {
  return departures.some((departure) =>
    departure.startsAt instanceof Date &&
    departure.endsAt instanceof Date &&
    !Number.isNaN(departure.startsAt.getTime()) &&
    !Number.isNaN(departure.endsAt.getTime()) &&
    departure.endsAt > departure.startsAt &&
    expeditionDepartureMatchesSearch(departure, { participants: 1 }, now)
  );
}

export type ExpeditionPublicationCheck = {
  id: string;
  label: string;
  guidance: string;
  tab: PublicationTab;
  ready: boolean;
};

export function expeditionPublicationReadiness(input: {
  metadata: ExpeditionDetailMetadata;
  imageUrl: string | null | undefined;
  destinationStatus: string | null | undefined;
  relatedCampaignStatus: string | null | undefined;
  departures: PublicationDeparture[];
  now?: Date;
}) {
  const traveler = expeditionTravelerReadiness(input.metadata);
  const checks: ExpeditionPublicationCheck[] = [
    {
      id: "destination", label: "Published destination", tab: "content",
      guidance: "Select a destination already published by the platform admin.",
      ready: input.destinationStatus === "published"
    },
    {
      id: "campaign", label: "Public conservation campaign", tab: "content",
      guidance: "Link a published, funded, or completed campaign managed by your organization.",
      ready: ["published", "funded", "completed"].includes(input.relatedCampaignStatus ?? "")
    },
    {
      id: "image", label: "Expedition hero image", tab: "content",
      guidance: "Upload a genuine image for this expedition. No generic stock photo is substituted.",
      ready: Boolean(input.imageUrl?.trim())
    },
    {
      id: "departure", label: "Upcoming bookable departure", tab: "departures",
      guidance: "Add a future departure with a valid date range, Open status and at least one available seat. Past, full, cancelled and waitlist-only departures do not qualify.",
      ready: hasBookablePublicationDeparture(input.departures, input.now)
    },
    {
      id: "languages", label: "Guide languages", tab: "content",
      guidance: "Specify the languages travelers can actually use with the host.",
      ready: traveler.checks.languages
    },
    {
      id: "requirements", label: "Participant requirements", tab: "content",
      guidance: "Describe prerequisites, access limitations, and participant requirements.",
      ready: traveler.checks.requirements
    },
    {
      id: "safety", label: "Safety and emergency plan", tab: "content",
      guidance: "Document risks, safety procedures, and the emergency response plan.",
      ready: traveler.checks.safety
    },
    {
      id: "itinerary", label: "Day-by-day itinerary", tab: "content",
      guidance: "Provide a realistic itinerary using the structured day editor.",
      ready: traveler.checks.itinerary
    },
    {
      id: "accommodation", label: "Accommodation information", tab: "content",
      guidance: "Select or describe the actual accommodation and what is provided.",
      ready: traveler.checks.accommodation
    },
    {
      id: "arrival", label: "Meeting point and arrival", tab: "content",
      guidance: "Provide a meeting point, nearest airport, and arrival guidance.",
      ready: traveler.checks.arrival
    },
    {
      id: "internationalTravel", label: "International travel guidance", tab: "content",
      guidance: "Add visa guidance, travel-insurance expectations, and local time zone.",
      ready: traveler.checks.internationalTravel
    },
    {
      id: "packing", label: "Packing essentials", tab: "content",
      guidance: "List the packing items participants should prepare.",
      ready: traveler.checks.packing
    },
    {
      id: "cancellation", label: "Cancellation policy", tab: "content",
      guidance: "Specify the actual cancellation terms before requesting publication.",
      ready: traveler.checks.cancellation
    }
  ];

  const missing = checks.filter((check) => !check.ready);
  return {
    ready: missing.length === 0,
    completed: checks.length - missing.length,
    total: checks.length,
    checks,
    missing
  };
}
