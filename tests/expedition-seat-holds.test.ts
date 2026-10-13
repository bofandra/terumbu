import assert from "node:assert/strict";
import test from "node:test";

import {
  expeditionHoldExpiresAt,
  midtransJakartaStartTime,
  MIDTRANS_EXPEDITION_HOLD_MINUTES,
  MIDTRANS_EXPEDITION_PAYMENT_MINUTES
} from "../src/lib/expedition-seat-holds";

test("seat holds exceed the payment window to absorb provider notification latency", () => {
  const start = new Date("2026-10-12T07:00:00.000Z");
  const expiry = expeditionHoldExpiresAt(start);
  assert.equal(MIDTRANS_EXPEDITION_PAYMENT_MINUTES, 15);
  assert.equal(MIDTRANS_EXPEDITION_HOLD_MINUTES, 20);
  assert.equal(expiry.toISOString(), "2026-10-12T07:20:00.000Z");
  assert.ok(expiry.getTime() > start.getTime() + MIDTRANS_EXPEDITION_PAYMENT_MINUTES * 60_000);
});

test("Snap expiry starts at the absolute booking timestamp in WIB", () => {
  assert.equal(midtransJakartaStartTime(new Date("2026-10-12T00:00:00Z")), "2026-10-12 07:00:00 +0700");
  assert.equal(midtransJakartaStartTime(new Date("2026-12-31T19:10:09Z")), "2027-01-01 02:10:09 +0700");
});
