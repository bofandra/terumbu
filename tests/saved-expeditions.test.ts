import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSavedExpeditionStatus } from "../src/lib/saved-expeditions";

test("saved expedition statuses normalize defensively", () => {
  assert.equal(normalizeSavedExpeditionStatus("ACTIVE"), "active");
  assert.equal(normalizeSavedExpeditionStatus("removed"), "removed");
  assert.equal(normalizeSavedExpeditionStatus("archived"), "removed");
});
