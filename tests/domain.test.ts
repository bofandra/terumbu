import assert from "node:assert/strict";
import test from "node:test";

import { daysUntil, getMetadataNumber, initialsForName, toCampaignCard, toExpeditionCard, verificationLabel } from "../src/lib/domain";

test("campaign rows map to card data", () => {
  const card = toCampaignCard(
    {
      slug: "restore-raja-ampat-reefs",
      title: "Restore Raja Ampat Reefs",
      category: "Coral Restoration",
      region: "Raja Ampat",
      summary: "Restore coral fragments.",
      imageUrl: "https://example.com/reef.jpg",
      raisedAmount: "250000000.00",
      goalAmount: "350000000.00",
      donorCount: 2350,
      impactUnit: "coral fragments",
      impactTarget: 10000,
      endsAt: new Date("2026-07-01T00:00:00.000Z"),
      partner: "Yayasan Bahari Lestari",
      verification: "field"
    },
    new Date("2026-06-20T00:00:00.000Z")
  );

  assert.equal(card.raised, 250000000);
  assert.equal(card.goal, 350000000);
  assert.equal(card.daysLeft, 11);
  assert.equal(card.verification, "Field verified");
});

test("expedition rows map duration and price", () => {
  const card = toExpeditionCard({
    slug: "raja-ampat-coral-restoration",
    title: "Raja Ampat Coral Restoration Expedition",
    region: "Raja Ampat",
    durationDays: 4,
    basePrice: "2500000.00",
    imageUrl: null,
    summary: "Plant corals."
  });

  assert.equal(card.duration, "4 days / 3 nights");
  assert.equal(card.price, 2500000);
});

test("metadata and label helpers are defensive", () => {
  assert.equal(getMetadataNumber({ fragments: 25 }, "fragments"), 25);
  assert.equal(getMetadataNumber({ fragments: "25" }, "fragments", 7), 7);
  assert.equal(verificationLabel("document"), "Document verified");
  assert.equal(initialsForName("Raka Demo"), "RD");
  assert.equal(daysUntil(null), 0);
});
