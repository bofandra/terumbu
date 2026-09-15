import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDefaultExpeditionMarketplaceMetadata,
  expeditionMatchesMarketplaceFilters,
  normalizeExpeditionMarketplaceMetadata,
  parseExpeditionSearchFilters,
  sortExpeditionMarketplaceItems
} from "../src/lib/expedition-marketplace";

const defaults = buildDefaultExpeditionMarketplaceMetadata({
  title: "Raja Ampat Coral Restoration",
  region: "Raja Ampat",
  durationDays: 7,
  summary: "Plant corals and monitor reefs."
});

test("marketplace metadata normalizes defensively", () => {
  const metadata = normalizeExpeditionMarketplaceMetadata(
    {
      marketplace: {
        typeLabel: "Eco Village",
        programTypes: ["Eco Program", "", "Eco Program"],
        collaborationHoursPerWeek: 72,
        accommodations: ["Shared Dorm"],
        mealsIncluded: "3 meals",
        additionalFee: {
          amount: "10",
          currency: "USD",
          period: "per day",
          paysFor: ["Meals"]
        }
      }
    },
    defaults
  );

  assert.equal(metadata.typeLabel, "Eco Village");
  assert.deepEqual(metadata.programTypes, ["Eco Program"]);
  assert.equal(metadata.collaborationHoursPerWeek, 60);
  assert.equal(metadata.additionalFee?.amount, 10);
});

test("search filters parse URL params and match marketplace cards", () => {
  const filters = parseExpeditionSearchFilters({
    q: "reef",
    destination: "raja",
    programType: "Eco Program",
    hoursMax: "20",
    accommodation: "Shared Dorm"
  });
  const card = {
    title: "Raja Ampat Reef Monitoring",
    summary: "Help monitor reef recovery.",
    region: "Raja Ampat",
    availabilityLabel: "8 seats available",
    marketplace: {
      ...defaults,
      programTypes: ["Eco Program"],
      collaborationHoursPerWeek: 16,
      accommodations: ["Shared Dorm"]
    }
  };

  assert.equal(expeditionMatchesMarketplaceFilters(card, filters), true);
  assert.equal(expeditionMatchesMarketplaceFilters(card, { ...filters, hoursMax: 8 }), false);
});

test("marketplace sorting keeps top hosts recommended first", () => {
  const base = {
    marketplace: defaults,
    nextDepartureStartsAt: null
  };
  const sorted = sortExpeditionMarketplaceItems([
    { ...base, title: "B", price: 100 },
    { ...base, title: "A", price: 200, marketplace: { ...defaults, badges: ["Top Host"] } }
  ]);

  assert.equal(sorted[0].title, "A");
  assert.equal(sortExpeditionMarketplaceItems(sorted, "price_asc")[0].title, "B");
});
