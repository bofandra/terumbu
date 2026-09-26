import assert from "node:assert/strict";
import test from "node:test";

import { buildDefaultExpeditionDetailMetadata, normalizeExpeditionDetailMetadata } from "../src/lib/expedition-metadata";
import { buildDefaultExpeditionMarketplaceMetadata, normalizeExpeditionMarketplaceMetadata } from "../src/lib/expedition-marketplace";
import { buildExpeditionBenefitFacts, buildExpeditionOfferFacts, buildExpeditionSdgFacts } from "../src/lib/expedition-detail-view";

function detailDefaults() {
  return buildDefaultExpeditionDetailMetadata({
    title: "Test Expedition",
    region: "Test Region",
    durationLabel: "4 days",
    price: 250,
    currency: "USD",
    maxCapacity: 12,
    galleryImages: [],
    tripUpdates: []
  });
}

test("public expedition defaults do not invent operational facts", () => {
  const d = detailDefaults();
  assert.deepEqual(d.galleryImages, []);
  assert.deepEqual(d.itinerary, []);
  assert.deepEqual(d.team, []);
  assert.deepEqual(d.cancellationPolicy, []);
  assert.deepEqual(d.faqs, []);
  assert.deepEqual(d.bookingTrustIndicators, []);
  assert.equal(d.route.mapEmbedUrl, "");
  assert.equal(d.travelInfo.visaGuidance, "");
  assert.equal(d.travelInfo.insuranceGuidance, "");
  assert.equal(d.accommodation.name, "");
  assert.equal(d.emergencyPlanSummary, "");
});

test("explicit host metadata survives normalization", () => {
  const n = normalizeExpeditionDetailMetadata({
    travelInfo: { nearestAirport: "Example Airport", visaGuidance: "Check entry requirements." },
    itinerary: [{ day: "Day 1", title: "Orientation", meals: "Dinner", physicalLevel: "Light", activities: ["Briefing"] }]
  }, detailDefaults());
  assert.equal(n.travelInfo.nearestAirport, "Example Airport");
  assert.equal(n.itinerary[0]?.title, "Orientation");
});

test("obsolete marketplace labels are removed", () => {
  const d = buildDefaultExpeditionMarketplaceMetadata({ region: "Raja Ampat", durationDays: 4, summary: "Test" });
  const n = normalizeExpeditionMarketplaceMetadata({
    marketplace: {
      highlights: ["Higher chance of approval", "Small group"],
      badges: ["Sustainable project", "Top Host", "Higher approval"]
    }
  }, d);
  assert.deepEqual(n.highlights, ["Small group"]);
  assert.deepEqual(n.badges, ["Top Host"]);
});

test("empty marketplace does not create unsupported facts", () => {
  const m = buildDefaultExpeditionMarketplaceMetadata({ region: "Test Region", durationDays: 4, summary: "Test" });
  assert.deepEqual(buildExpeditionOfferFacts(m), []);
  assert.deepEqual(buildExpeditionBenefitFacts({ marketplace: m, durationDays: 4, included: [], hostVerificationLabel: "" }).map((x) => x.kind), ["stay"]);
  assert.deepEqual(buildExpeditionSdgFacts({ tags: [], sustainability: [], impactTargets: [] }), []);
});
