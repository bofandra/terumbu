import assert from "node:assert/strict";
import test from "node:test";

import {
  campaignBudgetUtilization,
  campaignContentCompleteness,
  normalizeCampaignMediaType,
  normalizeCampaignTimelinePhaseStatus
} from "../src/lib/campaign-content";

test("campaign content fields normalize defensively", () => {
  assert.equal(normalizeCampaignMediaType("video"), "video");
  assert.equal(normalizeCampaignMediaType("unexpected"), "image");
  assert.equal(normalizeCampaignMediaType(null), "image");

  assert.equal(normalizeCampaignTimelinePhaseStatus("in_progress"), "in_progress");
  assert.equal(normalizeCampaignTimelinePhaseStatus("surprise"), "planned");
  assert.equal(normalizeCampaignTimelinePhaseStatus(undefined), "planned");
});

test("campaign content completeness reports missing public content areas", () => {
  assert.deepEqual(campaignContentCompleteness({ media: 1, budget: 1, timeline: 1, team: 1 }), {
    score: 100,
    completeCount: 4,
    totalCount: 4,
    missingLabels: [],
    checks: [
      { key: "media", label: "Media gallery", complete: true },
      { key: "budget", label: "Budget line items", complete: true },
      { key: "timeline", label: "Timeline phases", complete: true },
      { key: "team", label: "Public team members", complete: true }
    ]
  });

  const partial = campaignContentCompleteness({ media: 2, budget: 0, timeline: 1, team: 0 });

  assert.equal(partial.score, 50);
  assert.deepEqual(partial.missingLabels, ["Budget line items", "Public team members"]);
});

test("campaign budget utilization clamps invalid negative values", () => {
  assert.deepEqual(
    campaignBudgetUtilization([
      { amount: 100, spentAmount: 50 },
      { amount: 50, spentAmount: 75 },
      { amount: -100, spentAmount: -10 }
    ]),
    {
      planned: 150,
      spent: 125,
      remaining: 25,
      percent: 83
    }
  );
});
