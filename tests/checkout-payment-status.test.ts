import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizedCheckoutStatusToken, checkoutStatusTokenHash,
  mayReadCheckoutStatus, newCheckoutStatusToken
} from "../src/lib/checkout-status-access";
import { customerPaymentResolution } from "../src/lib/checkout-payment-status";

test("guest status access requires the original 256-bit cookie, not knowledge of checkout UUID or email", () => {
  const token = newCheckoutStatusToken();
  const other = newCheckoutStatusToken();
  assert.match(token, /^[0-9a-f]{64}$/);
  assert.notEqual(token, other);
  const hash = checkoutStatusTokenHash(token);
  assert.equal(authorizedCheckoutStatusToken(token, hash), true);
  assert.equal(authorizedCheckoutStatusToken(other, hash), false);
  assert.equal(authorizedCheckoutStatusToken("invalid", hash), false);
  assert.equal(authorizedCheckoutStatusToken(null, hash), false);
  assert.equal(mayReadCheckoutStatus({ ownerId: null, currentUserId: null, guestToken: token, storedHash: hash }), true);
  assert.equal(mayReadCheckoutStatus({ ownerId: null, currentUserId: null, guestToken: other, storedHash: hash }), false);
  assert.equal(mayReadCheckoutStatus({ ownerId: "owner", currentUserId: "attacker", guestToken: token, storedHash: hash }), false);
  assert.equal(mayReadCheckoutStatus({ ownerId: "owner", currentUserId: "owner", guestToken: null, storedHash: null }), true);
});

test("checkout status never falsely confirms pending payments or promises bank-settled refunds", () => {
  assert.deepEqual(customerPaymentResolution({ paymentStatus: "pending" }).stage, "pending");
  assert.deepEqual(customerPaymentResolution({ paymentStatus: "paid", bookingStatus: "pending_payment" }).stage, "operator_review");
  assert.deepEqual(customerPaymentResolution({ paymentStatus: "paid", bookingStatus: "confirmed" }).stage, "confirmed");
  assert.equal(customerPaymentResolution({ paymentStatus: "paid", compensationStatus: "refund_submitted" }).stage, "refund_requested");
  assert.equal(customerPaymentResolution({ paymentStatus: "pending", compensationStatus: "manual_review" }).stage, "operator_review");
  const refunded = customerPaymentResolution({ paymentStatus: "refunded" });
  assert.equal(refunded.stage, "refunded");
  assert.match(refunded.message, /bank/i);
});
