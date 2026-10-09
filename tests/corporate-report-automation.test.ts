import assert from "node:assert/strict";
import test from "node:test";

import {
  corporateReportFailureAlertCode,
  corporateReportRetryDelayMinutes,
  dueReportRetryEligible,
  shouldAlertCorporateReportFailure
} from "../src/lib/corporate-report-automation";

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

test("failure alerts are rate-limited to initial failure and escalation milestones", () => {
  const alerted = Array.from({ length: 20 }, (_, index) => index + 1)
    .filter(shouldAlertCorporateReportFailure);
  assert.deepEqual(alerted, [1, 3, 6, 12, 18]);
  for (const bad of [-1, 0, 1.5, Number.NaN, Infinity]) {
    assert.equal(shouldAlertCorporateReportFailure(bad), false);
  }
});

test("notification identity is stable per report and escalation attempt", () => {
  const reportId = "89c28a26-1124-49fa-838d-67c5dfcb3456";
  const initial = corporateReportFailureAlertCode(reportId, 1);
  assert.equal(initial, `corporate-report-failure-${reportId}-1`);
  assert.equal(corporateReportFailureAlertCode(reportId, 1), initial);
  assert.notEqual(corporateReportFailureAlertCode(reportId, 3), initial);
  assert.ok(initial.length <= 180);
});
