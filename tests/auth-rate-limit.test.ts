import assert from "node:assert/strict";
import test from "node:test";

import {
  authRateLimitKey,
  hashAuthRateLimitIdentifier
} from "../src/lib/auth-rate-limit";

test("SHA-256 throttling identifiers are normalized without exposing PII", () => {
  const first = hashAuthRateLimitIdentifier(" USER@example.com ");
  const second = hashAuthRateLimitIdentifier("user@example.com");
  const key = authRateLimitKey("login:account", first);

  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.equal(key.length, 64);
  assert.equal(key.includes("user@example.com"), false);
});

test("independent account, pair and client scopes cannot collide", () => {
  const user = hashAuthRateLimitIdentifier("person@example.invalid");
  const clientA = hashAuthRateLimitIdentifier("ip:203.0.113.50");
  const clientB = hashAuthRateLimitIdentifier("ip:203.0.113.51");
  const account = authRateLimitKey("login:account", user);
  const pairA = authRateLimitKey("login:pair", user, clientA);
  const pairB = authRateLimitKey("login:pair", user, clientB);
  const globalClient = authRateLimitKey("login:client", clientA);

  assert.equal(account, authRateLimitKey("login:account", user));
  assert.notEqual(pairA, pairB);
  assert.notEqual(pairA, account);
  assert.notEqual(pairA, globalClient);
  assert.notEqual(account, authRateLimitKey("recovery:account", user));
  assert.match(pairA, /^[a-f0-9]{64}$/);
});
