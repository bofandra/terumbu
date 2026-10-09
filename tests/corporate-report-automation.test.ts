import assert from "node:assert/strict";
import test from "node:test";

import { corporateReportRetryDelayMinutes, dueReportRetryEligible } from "../src/lib/corporate-report-automation";

test("automated reports back off exponentially with a 24-hour ceiling", () => {
  assert.equal(corporateReportRetryDelayMinutes(1), 60);
  assert.equal(corporateReportRetryDelayMinutes(2), 120);
  assert.equal(corporateReportRetryDelayMinutes(3), 240);
  assert.equal(corporateReportRetryDelayMinutes(5), 960);
  assert.equal(corporateReportRetryDelayMinutes(6), 1440);
  assert.equal(corporateReportRetryDelayMinutes(100), 1440);
});

test("a retryable report becomes eligible only after its next retry timestamp", () => {
  const now = new Date("2026-10-09T05:00:00.000Z");
  assert.equal(dueReportRetryEligible(null, now), true);
  assert.equal(dueReportRetryEligible({}, now), true);
  assert.equal(dueReportRetryEligible({ nextRetryAt: "2026-10-09T04:00:00.000Z" }, now), true);
  assert.equal(dueReportRetryEligible({ nextRetryAt: now.toISOString() }, now), true);
  assert.equal(dueReportRetryEligible({ nextRetryAt: "2026-10-09T06:00:00.000Z" }, now), false);
  assert.equal(dueReportRetryEligible({ nextRetryAt: "invalid" }, now), false);
});
