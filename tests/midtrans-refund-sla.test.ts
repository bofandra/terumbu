import assert from "node:assert/strict";
import test from "node:test";

import {
  MIDTRANS_REFUND_BANK_ACK_HOURS,
  MIDTRANS_REFUND_FIRST_CONTACT_HOURS,
  MIDTRANS_REFUND_UNRESOLVED_HOURS,
  midtransRefundSlaBreached
} from "../src/lib/midtrans-refund-sla";
import {
  workerHeartbeatHealth, workerStaleAfterMinutes
} from "../src/lib/worker-heartbeat";

test("refund review windows are explicit internal escalation policy, not financial proof", () => {
  assert.equal(MIDTRANS_REFUND_FIRST_CONTACT_HOURS, 1);
  assert.equal(MIDTRANS_REFUND_UNRESOLVED_HOURS, 24);
  assert.equal(MIDTRANS_REFUND_BANK_ACK_HOURS, 72);
  const clear = {
    incidents: 1, awaitingResolution: 1, missingBankEvidence: 0,
    firstContactOverdue: 0, resolutionOverdue: 0, bankAcknowledgementOverdue: 0
  };
  assert.equal(midtransRefundSlaBreached(clear), false);
  for (const key of ["firstContactOverdue", "resolutionOverdue", "bankAcknowledgementOverdue"] as const) {
    assert.equal(midtransRefundSlaBreached({ ...clear, [key]: 1 }), true);
  }
});

test("five-minute reconciliation worker cannot stay undetected for 150 minutes", () => {
  assert.equal(workerStaleAfterMinutes("midtrans_reconciliation"), 20);
  assert.equal(workerStaleAfterMinutes("midtrans_compensations"), 150);
  assert.equal(workerStaleAfterMinutes("corporate_reports"), 150);
  assert.equal(workerStaleAfterMinutes("expedition_reminders"), 150);
  const now = new Date("2026-10-13T04:00:00.000Z");
  const shared = {
    lastStatus: "success",
    lastFinishedAt: now,
    lastSucceededAt: now,
    lastFailedAt: null,
    consecutiveFailures: 0
  };
  assert.equal(workerHeartbeatHealth({
    ...shared, workerName: "midtrans_reconciliation",
    lastStartedAt: new Date(now.getTime() - 19 * 60_000)
  }, now), "healthy");
  assert.equal(workerHeartbeatHealth({
    ...shared, workerName: "midtrans_reconciliation",
    lastStartedAt: new Date(now.getTime() - 21 * 60_000)
  }, now), "stale");
  assert.equal(workerHeartbeatHealth({
    ...shared, workerName: "midtrans_compensations",
    lastStartedAt: new Date(now.getTime() - 21 * 60_000)
  }, now), "healthy");
});
