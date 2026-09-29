import assert from "node:assert/strict";
import test from "node:test";
import { completedExpeditionPassportMetadata } from "../src/lib/payment-workflows";

test("completed expedition passport metadata snapshots destination, campaign, and impact sites", () => {
  const completedAt = new Date("2026-09-29T10:00:00.000Z");
  const metadata = completedExpeditionPassportMetadata({
    expeditionSlug: "reef-expedition",
    participantsCount: 2,
    completedAt,
    completionSource: "partner_portal",
    completedByUserId: "partner-user",
    context: {
      destinationId: "destination-1",
      destinationSlug: "raja-ampat",
      destinationName: "Raja Ampat",
      campaignId: "campaign-1",
      campaignSlug: "restore-reef",
      campaignTitle: "Restore the Reef",
      impactSites: [
        { id: "site-1", name: "Reef A", region: "Raja Ampat", isPrimary: true },
        { id: "site-2", name: "Reef B", region: "Raja Ampat", isPrimary: false }
      ]
    }
  });

  assert.equal(metadata.destinationSlug, "raja-ampat");
  assert.equal(metadata.campaignSlug, "restore-reef");
  assert.deepEqual(metadata.impactSiteIds, ["site-1", "site-2"]);
  assert.equal(metadata.impactSites[0]?.isPrimary, true);
  assert.equal(metadata.completedAt, completedAt.toISOString());
});

test("completed expedition passport metadata remains compatible when context is unavailable", () => {
  const metadata = completedExpeditionPassportMetadata({
    expeditionSlug: "legacy-expedition",
    participantsCount: 1,
    completedAt: new Date("2026-09-29T10:00:00.000Z")
  });

  assert.equal(metadata.destinationId, null);
  assert.equal(metadata.campaignId, null);
  assert.deepEqual(metadata.impactSiteIds, []);
  assert.deepEqual(metadata.impactSites, []);
});
