import assert from "node:assert/strict";
import test from "node:test";

import type { ManagedPaymentStatus } from "../src/lib/payment-workflows";
import { canApplyVerifiedMidtransState } from "../src/lib/midtrans-state-guard";

const states: ManagedPaymentStatus[] = [
  "created", "pending", "paid", "failed", "expired", "refunded"
];

test("a verified paid order can never be downgraded by delayed provider responses", () => {
  for (const late of ["created", "pending", "failed", "expired"] as const) {
    assert.equal(canApplyVerifiedMidtransState("paid", late), false, late);
  }
  assert.equal(canApplyVerifiedMidtransState("paid", "paid"), true);
  assert.equal(canApplyVerifiedMidtransState("paid", "refunded"), true);
});

test("full provider refund is terminal and cannot be undone by an old settlement", () => {
  for (const incoming of states) {
    assert.equal(
      canApplyVerifiedMidtransState("refunded", incoming),
      incoming === "refunded",
      incoming
    );
  }
});

test("expired and failed checkouts remain closed unless money was subsequently collected", () => {
  for (const current of ["expired", "failed"] as const) {
    for (const next of states) {
      assert.equal(
        canApplyVerifiedMidtransState(current, next),
        next === current || next === "paid" || next === "refunded",
        current + " => " + next
      );
    }
  }
});

test("pending orders can progress to independently confirmed terminal states", () => {
  for (const next of states) {
    assert.equal(canApplyVerifiedMidtransState("pending", next), true, next);
    assert.equal(canApplyVerifiedMidtransState("created", next), true, next);
  }
});
