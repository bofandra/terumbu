import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCorporateContributionReference,
  campaignRaisedDelta,
  contributionCountsTowardPublicGoal,
  normalizeCorporateContributionStatus,
  normalizeCorporateContributionType,
  publicCampaignContributionValue
} from "../src/lib/corporate-contributions";

test("corporate contribution status and type normalization are defensive", () => {
  assert.equal(normalizeCorporateContributionStatus("verified"), "verified");
  assert.equal(normalizeCorporateContributionStatus("unknown"), "committed");
  assert.equal(normalizeCorporateContributionType("grant"), "grant");
  assert.equal(normalizeCorporateContributionType("other"), "csr");
});

test("only committed, disbursed, and verified corporate contributions can count toward public campaign goal", () => {
  assert.equal(contributionCountsTowardPublicGoal("pledged"), false);
  assert.equal(contributionCountsTowardPublicGoal("committed"), true);
  assert.equal(contributionCountsTowardPublicGoal("disbursed"), true);
  assert.equal(contributionCountsTowardPublicGoal("verified"), true);
  assert.equal(contributionCountsTowardPublicGoal("cancelled"), false);
});

test("campaign raised delta respects countsTowardCampaignGoal and status transitions", () => {
  assert.equal(publicCampaignContributionValue({ amount: 100_000_000, status: "pledged", countsTowardCampaignGoal: true }), 0);
  assert.equal(publicCampaignContributionValue({ amount: 100_000_000, status: "committed", countsTowardCampaignGoal: true }), 100_000_000);
  assert.equal(publicCampaignContributionValue({ amount: 100_000_000, status: "committed", countsTowardCampaignGoal: false }), 0);

  assert.equal(
    campaignRaisedDelta(
      { amount: 100_000_000, status: "committed", countsTowardCampaignGoal: true },
      { amount: 150_000_000, status: "verified", countsTowardCampaignGoal: true }
    ),
    50_000_000
  );

  assert.equal(
    campaignRaisedDelta(
      { amount: 100_000_000, status: "committed", countsTowardCampaignGoal: true },
      { amount: 100_000_000, status: "cancelled", countsTowardCampaignGoal: true }
    ),
    -100_000_000
  );
});

test("corporate contribution references are deterministic for account, campaign, type, and year", () => {
  assert.equal(
    buildCorporateContributionReference({
      accountSlug: "blue-carbon-inc",
      campaignSlug: "restore-raja-ampat-reefs",
      contributionType: "csr",
      date: new Date("2026-07-05T00:00:00.000Z")
    }),
    "TRB-CORP-2026-BLUECARBONIN-RESTORERAJAA-CSR"
  );
});
