import assert from "node:assert/strict";
import test from "node:test";

import {
  canArchivePaymentMethod,
  canCancelSubscription,
  canUsePaymentMethodForSubscription,
  isPaymentMethodExpired,
  isSubscriptionDue,
  monthlySubscriptionCycleKey,
  nextFailedSubscriptionRetryDate,
  normalizePaymentMethodStatus,
  normalizeSubscriptionStatus,
  parseExpiryMonth,
  parseExpiryYear
} from "../src/lib/billing-lifecycle";
import {
  demoGatewayChargeSubscription,
  demoGatewaySettleRefund,
  paymentStatusFromProviderStatus
} from "../src/lib/payment-provider";

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

test("subscription scheduler helpers identify due cycles and retry dates", () => {
  assert.equal(isSubscriptionDue({ status: "active", nextBillingAt: new Date("2026-07-10T00:00:00.000Z") }, now), true);
  assert.equal(isSubscriptionDue({ status: "past_due", nextBillingAt: new Date("2026-07-11T00:00:00.000Z") }, now), true);
  assert.equal(isSubscriptionDue({ status: "cancelled", nextBillingAt: new Date("2026-07-10T00:00:00.000Z") }, now), false);
  assert.equal(isSubscriptionDue({ status: "active", nextBillingAt: new Date("2026-07-12T00:00:00.000Z") }, now), false);
  assert.equal(monthlySubscriptionCycleKey("sub_123", new Date("2026-07-05T00:00:00.000Z")), "monthly:sub_123:2026-07");
  assert.equal(nextFailedSubscriptionRetryDate(now).toISOString(), "2026-07-14T00:00:00.000Z");
});

test("demo payment provider maps charge and refund outcomes into managed statuses", () => {
  assert.equal(paymentStatusFromProviderStatus("succeeded"), "paid");
  assert.equal(paymentStatusFromProviderStatus("refunded"), "refunded");
  assert.equal(paymentStatusFromProviderStatus("declined"), "failed");

  const paid = demoGatewayChargeSubscription({
    idempotencyKey: "cycle-1",
    amount: 100_000,
    currency: "IDR",
    paymentMethod: { status: "active", last4: "4242" },
    now
  });
  const failed = demoGatewayChargeSubscription({
    idempotencyKey: "cycle-2",
    amount: 100_000,
    currency: "IDR",
    paymentMethod: { status: "active", last4: "0000" },
    now
  });
  const refund = demoGatewaySettleRefund({
    idempotencyKey: "refund-1",
    amount: 100_000,
    currency: "IDR",
    now
  });

  assert.equal(paid.status, "paid");
  assert.equal(failed.status, "failed");
  assert.equal(refund.status, "refunded");
});
