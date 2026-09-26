import assert from "node:assert/strict";
import test from "node:test";

import { buildDefaultExpeditionDetailMetadata, expeditionTravelerReadiness } from "../src/lib/expedition-metadata";

const defaults = buildDefaultExpeditionDetailMetadata({
  title: "Raja Ampat Reef Expedition",
  region: "Raja Ampat",
  durationLabel: "7 days",
  price: 1200,
  currency: "USD",
  maxCapacity: 12,
  galleryImages: [],
  tripUpdates: []
});

test("traveler readiness reports missing international trip essentials", () => {
  const readiness = expeditionTravelerReadiness(defaults);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.missing.includes("arrival"));
  assert.ok(readiness.missing.includes("internationalTravel"));
  assert.ok(readiness.missing.includes("cancellation"));
});

test("traveler readiness passes when operational travel information is complete", () => {
  const readiness = expeditionTravelerReadiness({
    ...defaults,
    languages: ["English", "Bahasa Indonesia"],
    requirements: ["Minimum age 16"],
    safety: ["Follow field leader instructions"],
    emergencyPlanSummary: "Field lead coordinates emergency evacuation.",
    itinerary: [{ day: "Day 1", title: "Arrival", meals: "Dinner", physicalLevel: "Light", activities: ["Briefing"] }],
    accommodation: { name: "Partner eco-lodge", type: "Eco-lodge", details: ["Shared twin room"], mealNote: "Breakfast included" },
    travelInfo: {
      meetingPoint: "Sorong Airport",
      nearestAirport: "SOQ",
      airportTransfer: "Partner transfer available",
      arrivalGuidance: "Arrive before 12:00 local time",
      visaGuidance: "Check current Indonesian entry requirements for your nationality.",
      insuranceGuidance: "Travel insurance covering field activities is required.",
      connectivity: "Mobile coverage varies",
      localTimeZone: "WIT (UTC+9)",
      supportContact: "Provided after booking",
      packingHighlights: ["Reef-safe sunscreen"]
    },
    cancellationPolicy: [{ label: "30+ days", refund: "Refund according to published policy" }]
  });

  assert.equal(readiness.ready, true);
  assert.deepEqual(readiness.missing, []);
});
