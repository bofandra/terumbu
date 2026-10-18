import assert from "node:assert/strict";
import test from "node:test";

import { buildDefaultExpeditionDetailMetadata } from "../src/lib/expedition-metadata";
import { expeditionPublicationReadiness } from "../src/lib/expedition-publication-readiness";

const metadata = buildDefaultExpeditionDetailMetadata({
  title: "Reef observation",
  region: "Raja Ampat",
  durationLabel: "3 days",
  price: 300,
  currency: "USD",
  maxCapacity: 10,
  galleryImages: [],
  tripUpdates: []
});

const readyMetadata = {
  ...metadata,
  languages: ["English"],
  requirements: ["Age 16+"],
  safety: ["Guided snorkeling"],
  emergencyPlanSummary: "Call local response team.",
  itinerary: [{ day: "Day 1", title: "Orientation", meals: "Dinner", physicalLevel: "Light", activities: ["Welcome"] }],
  accommodation: { name: "Partner lodge", type: "Lodge", details: ["Twin room"], mealNote: "Breakfast" },
  travelInfo: {
    meetingPoint: "Sorong harbor",
    nearestAirport: "SOQ",
    airportTransfer: "Own arrangement",
    arrivalGuidance: "Meet the guide at 09:00",
    visaGuidance: "Check requirements for your passport.",
    insuranceGuidance: "Arrange appropriate travel cover.",
    connectivity: "Variable",
    localTimeZone: "WIT",
    supportContact: "Provided after booking",
    packingHighlights: ["Reusable bottle"]
  },
  cancellationPolicy: [{ label: "Before departure", refund: "Published refund terms" }]
};

test("publication checklist explains missing fields without fabricating facts", () => {
  const r = expeditionPublicationReadiness({
    metadata,
    imageUrl: null,
    destinationStatus: "draft",
    relatedCampaignStatus: "draft",
    departures: []
  });
  assert.equal(r.ready, false);
  assert.equal(r.completed, 0);
  assert.ok(r.missing.some((item) => item.id === "internationalTravel" && item.tab === "content"));
  assert.ok(r.missing.some((item) => item.id === "departure" && item.tab === "departures"));
  assert.equal(r.total, 13);
});

test("publication checklist passes only with all managed traveler and operational facts", () => {
  const r = expeditionPublicationReadiness({
    metadata: readyMetadata,
    imageUrl: "/media/trip.jpg",
    destinationStatus: "published",
    relatedCampaignStatus: "funded",
    departures: [{ startsAt: new Date("2026-11-20T01:00:00.000Z"), endsAt: new Date("2026-11-23T01:00:00.000Z"), status: "open", capacity: 8, seatsBooked: 1 }],
    now: new Date("2026-10-18T00:00:00.000Z")
  });
  assert.equal(r.ready, true);
  assert.equal(r.completed, r.total);
  assert.deepEqual(r.missing, []);
  assert.equal(expeditionPublicationReadiness({
    metadata: readyMetadata,
    imageUrl: "/media/trip.jpg",
    destinationStatus: "published",
    relatedCampaignStatus: "funded",
    departures: []
  }).ready, false);
});

test("past, cancelled, full, waitlisted and invalid departures cannot pass publication", () => {
  const now = new Date("2026-10-18T00:00:00.000Z");
  const future = { startsAt: new Date("2026-11-20T01:00:00.000Z"), endsAt: new Date("2026-11-22T01:00:00.000Z"), status: "open", capacity: 8, seatsBooked: 0 };
  const scenarios = [
    { ...future, startsAt: new Date("2026-09-20T01:00:00.000Z"), endsAt: new Date("2026-09-22T01:00:00.000Z") },
    { ...future, status: "cancelled" },
    { ...future, status: "waitlist" },
    { ...future, status: "full" },
    { ...future, seatsBooked: 8 },
    { ...future, endsAt: new Date("2026-11-19T01:00:00.000Z") }
  ];
  for (const departure of scenarios) {
    const result = expeditionPublicationReadiness({ metadata: readyMetadata, imageUrl: "/media/trip.jpg", destinationStatus: "published", relatedCampaignStatus: "published", departures: [departure], now });
    assert.equal(result.ready, false, `Should reject ${departure.status} departure ${departure.startsAt}`);
    assert.ok(result.missing.some((item) => item.id === "departure"));
  }
  assert.equal(expeditionPublicationReadiness({
    metadata: readyMetadata,
    imageUrl: "/media/trip.jpg",
    destinationStatus: "published",
    relatedCampaignStatus: "published",
    departures: [{ ...future, seatsBooked: 7 }],
    now
  }).ready, true);
  assert.equal(expeditionPublicationReadiness({
    metadata: readyMetadata,
    imageUrl: "/media/trip.jpg",
    destinationStatus: "published",
    relatedCampaignStatus: "published",
    departures: [{ ...future, heldSeats: 8 }],
    now
  }).ready, false);
});
