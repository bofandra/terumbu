import assert from "node:assert/strict";
import test from "node:test";

import { hydrateCorporatePublicSnapshot } from "../src/lib/corporate-report-snapshot";

test("published corporate snapshot restores dates without querying mutable report data", () => {
  const persisted = {
    snapshotVersion: 1,
    reportContext: {
      accountName: "Ocean Partner",
      programName: "Coastal Impact",
      currency: "USD",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: null
    },
    portfolio: [
      { campaignSlug: "reef-campaign", campaignTitle: "Verified Reef", impactTarget: 125 }
    ],
    evidence: [
      {
        evidenceCode: "EVIDENCE-001",
        verifiedAt: "2026-06-01T12:30:00.000Z",
        addedAt: "not-a-date",
        sourceHref: "/campaigns/reef-campaign#evidence"
      }
    ],
    metrics: {
      committedFunding: 4000,
      projectCount: 1,
      verifiedEvidence: 1
    }
  };
  const hydrated = hydrateCorporatePublicSnapshot(persisted);

  assert.ok(hydrated);
  assert.equal(hydrated.reportContext.accountName, "Ocean Partner");
  assert.deepEqual(hydrated.reportContext.startsAt, new Date("2026-01-01T00:00:00.000Z"));
  assert.equal(hydrated.reportContext.endsAt, null);
  assert.deepEqual(hydrated.evidence[0].verifiedAt, new Date("2026-06-01T12:30:00.000Z"));
  assert.equal(hydrated.evidence[0].addedAt, null);
  assert.equal(hydrated.metrics.committedFunding, 4000);
  assert.equal(hydrated.portfolio[0].campaignSlug, "reef-campaign");

  // Hydration must not rewrite the immutable JSONB-origin data.
  assert.equal(persisted.evidence[0].verifiedAt, "2026-06-01T12:30:00.000Z");
  assert.equal(persisted.reportContext.startsAt, "2026-01-01T00:00:00.000Z");
});

test("malformed and incomplete corporate snapshots fall back to legacy live reads", () => {
  assert.equal(hydrateCorporatePublicSnapshot(null), null);
  assert.equal(hydrateCorporatePublicSnapshot({}), null);
  assert.equal(hydrateCorporatePublicSnapshot([]), null);
  assert.equal(hydrateCorporatePublicSnapshot({
    snapshotVersion: 1,
    reportContext: { programName: "Coastal Impact" },
    evidence: [],
    metrics: { verifiedEvidence: 0 }
  }), null);
  assert.equal(hydrateCorporatePublicSnapshot({
    snapshotVersion: 2,
    reportContext: {},
    portfolio: [],
    evidence: [],
    metrics: {}
  }), null);
});
