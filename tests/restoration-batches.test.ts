import assert from "node:assert/strict";
import test from "node:test";
import {
  canAllocateSponsorshipToRestorationBatch,
  canTransitionRestorationBatch,
  restorationAllocationMatchesBatch,
  restorationBatchTransitionRequiresEvidence,
  restorationTransitionPrerequisiteSatisfied,
  validRestorationAllocationUnits
} from "../src/lib/restoration-batches";

test("restoration batches progress sequentially", () => {
  assert.equal(canTransitionRestorationBatch("planned", "planted"), true);
  assert.equal(canTransitionRestorationBatch("planted", "monitored"), true);
  assert.equal(canTransitionRestorationBatch("planned", "monitored"), false);
  assert.equal(canTransitionRestorationBatch("monitored", "planted"), false);
});

test("allocation cannot exceed sponsored units", () => {
  assert.equal(validRestorationAllocationUnits(5, 10), true);
  assert.equal(validRestorationAllocationUnits(10, 10), true);
  assert.equal(validRestorationAllocationUnits(11, 10), false);
  assert.equal(validRestorationAllocationUnits(0, 10), false);
});

test("allocation must stay within the same campaign and impact site", () => {
  assert.equal(
    restorationAllocationMatchesBatch(
      { campaignId: "campaign-a", impactSiteId: "site-a" },
      { campaignId: "campaign-a", impactSiteId: "site-a" }
    ),
    true
  );
  assert.equal(
    restorationAllocationMatchesBatch(
      { campaignId: "campaign-a", impactSiteId: "site-a" },
      { campaignId: "campaign-b", impactSiteId: "site-a" }
    ),
    false
  );
  assert.equal(
    restorationAllocationMatchesBatch(
      { campaignId: "campaign-a", impactSiteId: "site-a" },
      { campaignId: "campaign-a", impactSiteId: "site-b" }
    ),
    false
  );
  assert.equal(
    restorationAllocationMatchesBatch(
      { campaignId: "campaign-a", impactSiteId: "site-a" },
      { campaignId: "campaign-a", impactSiteId: null }
    ),
    false
  );
});

test("only an unallocated active sponsorship can enter a planned matching batch", () => {
  const base = {
    batchStatus: "planned",
    sponsorshipStatus: "growing",
    batchCampaignId: "campaign-a",
    batchImpactSiteId: "site-a",
    sponsorshipCampaignId: "campaign-a",
    sponsorshipImpactSiteId: "site-a",
    alreadyAllocated: false
  };

  assert.equal(canAllocateSponsorshipToRestorationBatch(base), true);
  assert.equal(canAllocateSponsorshipToRestorationBatch({ ...base, batchStatus: "planted" }), false);
  assert.equal(canAllocateSponsorshipToRestorationBatch({ ...base, sponsorshipStatus: "reversed" }), false);
  assert.equal(canAllocateSponsorshipToRestorationBatch({ ...base, alreadyAllocated: true }), false);
  assert.equal(canAllocateSponsorshipToRestorationBatch({ ...base, sponsorshipCampaignId: "campaign-b" }), false);
  assert.equal(canAllocateSponsorshipToRestorationBatch({ ...base, sponsorshipImpactSiteId: "site-b" }), false);
});

test("planting requires an allocation", () => {
  assert.equal(restorationTransitionPrerequisiteSatisfied("planted", { hasAllocation: true, hasVerifiedEvidence: false }), true);
  assert.equal(restorationTransitionPrerequisiteSatisfied("planted", { hasAllocation: false, hasVerifiedEvidence: true }), false);
});

test("monitoring requires verified evidence", () => {
  assert.equal(restorationBatchTransitionRequiresEvidence("monitored"), true);
  assert.equal(restorationTransitionPrerequisiteSatisfied("monitored", { hasAllocation: true, hasVerifiedEvidence: true }), true);
  assert.equal(restorationTransitionPrerequisiteSatisfied("monitored", { hasAllocation: true, hasVerifiedEvidence: false }), false);
});

test("happy path planned to planted to monitored satisfies lifecycle guards", () => {
  assert.equal(canTransitionRestorationBatch("planned", "planted"), true);
  assert.equal(restorationTransitionPrerequisiteSatisfied("planted", { hasAllocation: true, hasVerifiedEvidence: false }), true);
  assert.equal(canTransitionRestorationBatch("planted", "monitored"), true);
  assert.equal(restorationTransitionPrerequisiteSatisfied("monitored", { hasAllocation: true, hasVerifiedEvidence: true }), true);
});
