import assert from "node:assert/strict";
import test from "node:test";

import {
  canArchivePaymentMethod,
  canCancelSubscription,
  canUsePaymentMethodForSubscription,
  isPaymentMethodExpired,
  normalizePaymentMethodStatus,
  normalizeSubscriptionStatus,
  parseExpiryMonth,
  parseExpiryYear
} from "../src/lib/billing-lifecycle";

const now = new Date("2026-07-11T00:00:00.000Z");

test("billing lifecycle status helpers normalize defensively", () => {
  assert.equal(normalizePaymentMethodStatus("archived"), "archived");
  assert.equal(normalizePaymentMethodStatus("unknown"), "active");
  assert.equal(normalizeSubscriptionStatus("past_due"), "past_due");
  assert.equal(normalizeSubscriptionStatus("unknown"), "incomplete");
});

test("payment method expiry parsing and checks are bounded", () => {
  assert.equal(parseExpiryMonth("12"), 12);
  assert.equal(parseExpiryMonth("99"), null);
  assert.equal(parseExpiryYear("2029", now), 2029);
  assert.equal(parseExpiryYear("2020", now), null);
  assert.equal(isPaymentMethodExpired(6, 2026, now), true);
  assert.equal(isPaymentMethodExpired(7, 2026, now), false);
  assert.equal(isPaymentMethodExpired(1, 2027, now), false);
});

test("payment methods cannot be used or archived when lifecycle rules block them", () => {
  assert.equal(canUsePaymentMethodForSubscription({ status: "active", expMonth: 12, expYear: 2027 }, now), true);
  assert.equal(canUsePaymentMethodForSubscription({ status: "archived", expMonth: 12, expYear: 2027 }, now), false);
  assert.equal(canUsePaymentMethodForSubscription({ status: "active", expMonth: 6, expYear: 2026 }, now), false);
  assert.equal(canArchivePaymentMethod({ status: "active", activeSubscriptionCount: 0 }), true);
  assert.equal(canArchivePaymentMethod({ status: "active", activeSubscriptionCount: 1 }), false);
  assert.equal(canArchivePaymentMethod({ status: "archived", activeSubscriptionCount: 0 }), false);
});

test("only active subscription states are dashboard-cancellable", () => {
  assert.equal(canCancelSubscription("active"), true);
  assert.equal(canCancelSubscription("past_due"), true);
  assert.equal(canCancelSubscription("cancelled"), false);
  assert.equal(canCancelSubscription("incomplete"), false);
});
