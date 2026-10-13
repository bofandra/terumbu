import assert from "node:assert/strict";
import test from "node:test";

import {
  midtransNeedsOperatorAttention,
  midtransReconciliationDue,
  MIDTRANS_RECONCILIATION_ATTENTION_MINUTES,
  MIDTRANS_RECONCILIATION_INTERVAL_MINUTES
} from "../src/lib/midtrans-reconciliation";

test("due check uses a rolling five-minute last-checked cursor", () => {
  const now = new Date("2026-10-12T08:00:00.000Z");
  assert.equal(MIDTRANS_RECONCILIATION_INTERVAL_MINUTES, 5);
  assert.equal(midtransReconciliationDue(null, now), true);
  assert.equal(midtransReconciliationDue(new Date("2026-10-12T07:54:59Z"), now), true);
  assert.equal(midtransReconciliationDue(new Date("2026-10-12T07:58:30Z"), now), false);
});

test("provider uncertainty never implies failed payment; escalates after an hour", () => {
  assert.equal(MIDTRANS_RECONCILIATION_ATTENTION_MINUTES, 60);
  assert.equal(midtransNeedsOperatorAttention({ ageMs: 30 * 60_000, failed: true }), false);
  assert.equal(midtransNeedsOperatorAttention({ ageMs: 60 * 60_000, failed: true }), true);
  assert.equal(midtransNeedsOperatorAttention({ ageMs: 60 * 60_000, failed: false }), false);
  for (const status of ["manual_review", "mismatch", "unknown"] as const) {
    assert.equal(midtransNeedsOperatorAttention({ ageMs: 0, status }), true);
  }
  assert.equal(midtransNeedsOperatorAttention({ ageMs: 60 * 60_000, status: "unchanged" }), false);
  assert.equal(midtransNeedsOperatorAttention({ ageMs: 60 * 60_000, status: "updated" }), false);
});
