import assert from "node:assert/strict";
import test from "node:test";

import {
  corporateReportExecutionState,
  corporateReportFailureDescription,
  summarizeCorporateReportEmailStatuses
} from "../src/lib/corporate-report-execution-monitor";

const now = new Date("2026-10-09T09:00:00.000Z");
const past = new Date("2026-10-09T08:00:00.000Z");
const future = new Date("2026-10-09T10:00:00.000Z");

function report(status: string, metadata: unknown, scheduledFor: Date | null = past) {
  return { id: "r1", status, metadata, scheduledFor };
}

test("upcoming reports are scheduled, overdue reports wait for worker generation", () => {
  const planned = corporateReportExecutionState(report("scheduled", null, future), now);
  assert.equal(planned.statusLabel, "Scheduled");
  assert.equal(planned.due, false);
  assert.equal(planned.needsAttention, false);
  assert.equal(corporateReportExecutionState(report("scheduled", {}), now).statusLabel, "Awaiting generation");
});

test("failed automated reports display a safe reason, retry date and attempt count", () => {
  const state = corporateReportExecutionState(report("scheduled", {
    scheduleFailureCount: 2,
    scheduleLastFailure: "requester_not_authorized",
    scheduleLastFailedAt: past.toISOString(),
    nextRetryAt: future.toISOString()
  }), now);
  assert.equal(state.statusLabel, "Waiting for retry");
  assert.equal(state.failureCount, 2);
  assert.equal(state.needsAttention, true);
  assert.equal(state.lastFailedAt?.toISOString(), past.toISOString());
  assert.equal(state.nextRetryAt?.toISOString(), future.toISOString());
  assert.match(state.lastFailure ?? "", /original requester no longer has permission/);
  const ready = corporateReportExecutionState(report("scheduled", {
    scheduleFailureCount: 3,
    scheduleLastFailure: "generation_failed",
    nextRetryAt: past.toISOString()
  }), now);
  assert.equal(ready.statusLabel, "Retry eligible");
});

test("generated scheduled reports are not labeled as pending retries", () => {
  const state = corporateReportExecutionState(report("generated", {
    generatedFromSchedule: true,
    scheduleFailureCount: 1,
    nextRetryAt: future.toISOString()
  }), now);
  assert.equal(state.statusLabel, "Generated from schedule");
  assert.equal(state.needsAttention, false);
  assert.equal(state.nextRetryAt, null);
});

test("malformed metadata is handled without disclosing arbitrary error text", () => {
  const state = corporateReportExecutionState(report("scheduled", {
    scheduleFailureCount: "many",
    scheduleLastFailure: "<untrusted stack trace>",
    scheduleLastFailedAt: "not-a-date",
    nextRetryAt: "invalid"
  }), now);
  assert.equal(state.failureCount, 0);
  assert.equal(state.lastFailedAt, null);
  assert.equal(state.nextRetryAt, null);
  assert.equal(corporateReportFailureDescription("<untrusted stack trace>"), "The scheduled report could not be generated.");
  assert.equal(corporateReportExecutionState(report("scheduled", []), now).failureCount, 0);
});

test("alert email summary distinguishes provider acceptance, retries and terminal failures", () => {
  assert.deepEqual(summarizeCorporateReportEmailStatuses([
    { status: "queued", count: 2 },
    { status: "sending", count: 1 },
    { status: "retry", count: 3 },
    { status: "sent", count: 4 },
    { status: "delivered", count: 6 },
    { status: "delivery_delayed", count: 1 },
    { status: "bounced", count: 2 },
    { status: "complained", count: 1 },
    { status: "provider_failed", count: 2 },
    { status: "suppressed", count: 1 },
    { status: "failed", count: 1 },
    { status: "cancelled", count: 2 },
    { status: "unexpected", count: 10 },
    { status: "failed", count: -1 }
  ]), {
    queued: 2, sending: 1, retry: 3, accepted: 4, delivered: 6, delayed: 1,
    bounced: 2, complained: 1, providerFailed: 2, suppressed: 1, failed: 1, cancelled: 2, total: 26
  });
  assert.equal(corporateReportExecutionState(report("scheduled", null), now).alertEmails.total, 0);
});
