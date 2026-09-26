import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExpeditionBenefitFacts,
  buildExpeditionMonthAvailability,
  buildExpeditionOfferFacts,
  buildExpeditionSdgFacts,
  buildExpeditionStayRange
} from "../src/lib/expedition-detail-view";
import { buildDefaultExpeditionMarketplaceMetadata } from "../src/lib/expedition-marketplace";

const marketplace = buildDefaultExpeditionMarketplaceMetadata({
  title: "Raja Ampat Reef Monitoring",
  region: "Raja Ampat",
  durationDays: 7,
  summary: "Help monitor reef restoration with the local community."
});

test("detail view maps marketplace metadata into offer and benefit facts", () => {
  const offerFacts = buildExpeditionOfferFacts({
    ...marketplace,
    collaborationHoursPerWeek: 20,
    helpActivities: ["Social Work", "Farming", "Gardening"],
    additionalFee: {
      amount: 10,
      currency: "USD",
      period: "per day",
      description: "Donation to project.",
      paysFor: ["Donation to project"]
    }
  });
  const benefitFacts = buildExpeditionBenefitFacts({
    marketplace: {
      ...marketplace,
      collaborationHoursPerWeek: 20,
      accommodations: ["Private Room"],
      mealsIncluded: "Breakfast, lunch, dinner",
      digitalNomadAmenities: ["Basic Internet Access"]
    },
    durationDays: 4,
    included: ["Digital participation certificate"],
    hostVerificationLabel: "Field verified Expedition Partner"
  });

  assert.equal(offerFacts[0].value, "20h");
  assert.equal(offerFacts.at(-1)?.label, "Additional Fee");
  assert.equal(benefitFacts[0].value, "4 days");
  assert.equal(benefitFacts.some((fact) => fact.label === "Private Room"), true);
  assert.equal(benefitFacts.some((fact) => fact.label === "Digital participation certificate"), true);
});

test("detail view builds compact month availability from departures", () => {
  const months = buildExpeditionMonthAvailability([
    { startsAt: new Date("2026-09-10T00:00:00.000Z"), endsAt: new Date("2026-09-14T00:00:00.000Z"), status: "open", availableSeats: 2 },
    { startsAt: new Date("2026-10-10T00:00:00.000Z"), endsAt: new Date("2026-10-14T00:00:00.000Z"), status: "open", availableSeats: 8 },
    { startsAt: new Date("2026-11-10T00:00:00.000Z"), endsAt: new Date("2026-11-14T00:00:00.000Z"), status: "full", availableSeats: 0 }
  ]);

  assert.deepEqual(
    months.map((month) => [month.label, month.status, month.seats]),
    [
      ["Sep", "limited", 2],
      ["Oct", "available", 8],
      ["Nov", "closed", 0]
    ]
  );
});

test("detail view handles sparse metadata defaults", () => {
  const sparse = {
    ...marketplace,
    helpActivities: [],
    accommodations: [],
    digitalNomadAmenities: [],
    benefits: [],
    additionalFee: null
  };
  const offerFacts = buildExpeditionOfferFacts(sparse);
  const benefitFacts = buildExpeditionBenefitFacts({
    marketplace: sparse,
    durationDays: 9,
    included: [],
    hostVerificationLabel: "Verified host"
  });
  const stayRange = buildExpeditionStayRange(9, "Medium Term Stay");

  assert.deepEqual(offerFacts, []);
  assert.equal(benefitFacts.some((fact) => fact.label === "Accommodation"), false);
  assert.equal(benefitFacts.some((fact) => fact.label === "Verified host"), false);
  assert.equal(benefitFacts[0]?.value, "9 days");
  assert.equal(stayRange.stayUpTo, "4 weeks");
});

test("detail view derives only supported SDG facts", () => {
  const reefFacts = buildExpeditionSdgFacts({
    tags: ["SDG 14", "Reef monitoring"],
    sustainability: ["Local procurement"],
    impactTargets: [{ value: "12", label: "Local workdays supported" }]
  });
  const fallbackFacts = buildExpeditionSdgFacts({
    tags: [],
    sustainability: [],
    impactTargets: []
  });

  assert.equal(reefFacts.some((fact) => fact.code === "14"), true);
  assert.equal(reefFacts.some((fact) => fact.code === "8"), true);
  assert.deepEqual(fallbackFacts, []);
});

