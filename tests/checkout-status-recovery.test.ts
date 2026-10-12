import assert from "node:assert/strict";
import test from "node:test";

import {
  checkoutDeviceExpiry, checkoutRecoveryExpiry,
  checkoutRecoveryThrottleKey, normalizeCheckoutRecoveryEmail,
  validCheckoutRecoveryEmail, CHECKOUT_DEVICE_DAYS, CHECKOUT_RECOVERY_MINUTES
} from "../src/lib/checkout-status-recovery";

test("guest status recovery links are short lived and device grants expire", () => {
  const now = new Date("2026-10-12T07:00:00.000Z");
  assert.equal(CHECKOUT_RECOVERY_MINUTES, 15);
  assert.equal(checkoutRecoveryExpiry(now).toISOString(), "2026-10-12T07:15:00.000Z");
  assert.equal(CHECKOUT_DEVICE_DAYS, 30);
  assert.equal(checkoutDeviceExpiry(now).toISOString(), "2026-11-11T07:00:00.000Z");
});

test("email lookup normalizes addresses and never uses raw identifiers as rate keys", () => {
  assert.equal(normalizeCheckoutRecoveryEmail(" Customer@Example.org "), "customer@example.org");
  assert.equal(validCheckoutRecoveryEmail("customer@example.org"), true);
  assert.equal(validCheckoutRecoveryEmail("invalid"), false);
  assert.equal(validCheckoutRecoveryEmail("a".repeat(260) + "@example.org"), false);
  const key = checkoutRecoveryThrottleKey("checkout-email", "customer@example.org");
  assert.match(key, /^[0-9a-f]{64}$/);
  assert.equal(key.includes("@"), false);
  assert.notEqual(key, checkoutRecoveryThrottleKey("checkout-client", "customer@example.org"));
});
