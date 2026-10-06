import assert from "node:assert/strict";
import test from "node:test";

import {
  authRateLimitKey,
  authRateLimitStatus,
  clearAuthRateLimit,
  consumeAuthRateLimit,
  hashAuthRateLimitIdentifier,
  recordAuthRateLimitHit
} from "../src/lib/auth-rate-limit";

test("auth limiter blocks after the configured number of hits and resets with the window", () => {
  const key = authRateLimitKey("login-pair", "account-a", "client-a");
  const policy = { limit: 2, windowMs: 1_000 };
  const start = 10_000;

  clearAuthRateLimit(key);
  assert.equal(consumeAuthRateLimit(key, policy, start).allowed, true);
  assert.equal(consumeAuthRateLimit(key, policy, start + 1).allowed, true);
  assert.equal(authRateLimitStatus(key, policy, start + 2).allowed, false);
  assert.equal(consumeAuthRateLimit(key, policy, start + 3).allowed, false);
  assert.equal(authRateLimitStatus(key, policy, start + 1_001).allowed, true);
});

test("login failure accounting can be checked before recording a hit", () => {
  const key = authRateLimitKey("login-client", "client-b");
  const policy = { limit: 1, windowMs: 60_000 };

  clearAuthRateLimit(key);
  assert.equal(authRateLimitStatus(key, policy, 20_000).allowed, true);
  assert.equal(recordAuthRateLimitHit(key, policy, 20_000).allowed, true);
  assert.equal(authRateLimitStatus(key, policy, 20_001).allowed, false);
});

test("rate-limit identifiers are normalized and do not expose raw account or client values", () => {
  const first = hashAuthRateLimitIdentifier(" USER@example.com ");
  const second = hashAuthRateLimitIdentifier("user@example.com");
  const key = authRateLimitKey("password-reset", first, "203.0.113.5");

  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.equal(key.length, 64);
  assert.equal(key.includes("user@example.com"), false);
});
