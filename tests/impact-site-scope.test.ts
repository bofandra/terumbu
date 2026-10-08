import assert from "node:assert/strict";
import test from "node:test";

import { impactSiteCampaignScopeKey } from "../src/lib/impact-site-scope";

test("the same impact site has distinct evidence scopes for separate campaigns", () => {
  const siteId = "site-shared";
  const first = impactSiteCampaignScopeKey("campaign-a", siteId);
  const second = impactSiteCampaignScopeKey("campaign-b", siteId);
  assert.notEqual(first, second);

  const evidenceByScope = new Map([[first, ["campaign-a-evidence"]], [second, ["campaign-b-evidence"]]]);
  assert.deepEqual(evidenceByScope.get(first), ["campaign-a-evidence"]);
  assert.deepEqual(evidenceByScope.get(second), ["campaign-b-evidence"]);
});
