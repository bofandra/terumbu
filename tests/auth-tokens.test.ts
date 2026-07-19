import assert from "node:assert/strict";
import test from "node:test";

import {
  authActionUrl,
  authAppBaseUrl,
  authTokenExpiresAt,
  authTokenIdentifier,
  hashAuthEmail,
  hashAuthToken,
  normalizeAuthEmail,
  parseAuthTokenIdentifier
} from "../src/lib/auth-tokens";

const userId = "123e4567-e89b-42d3-a456-426614174000";

test("auth token identifiers include purpose, user id, and normalized email hash", () => {
  const identifier = authTokenIdentifier("account_setup", userId, " USER@example.COM ");
  const parsed = parseAuthTokenIdentifier(identifier);

  assert.deepEqual(parsed, {
    purpose: "account_setup",
    userId,
    emailHash: hashAuthEmail("user@example.com")
  });
  assert.equal(parseAuthTokenIdentifier(`auth:unknown:${userId}:${hashAuthEmail("user@example.com")}`), null);
  assert.equal(parseAuthTokenIdentifier("not-an-auth-token"), null);
});

test("auth token hashing is deterministic and does not store raw tokens", () => {
  const hash = hashAuthToken("raw-email-token");

  assert.equal(hash.length, 64);
  assert.equal(hash, hashAuthToken("raw-email-token"));
  assert.notEqual(hash, "raw-email-token");
});

test("auth email hashing normalizes casing and surrounding whitespace", () => {
  assert.equal(normalizeAuthEmail(" USER@example.COM "), "user@example.com");
  assert.equal(hashAuthEmail(" USER@example.COM "), hashAuthEmail("user@example.com"));
});

test("auth token expiry defaults match setup, verification, and reset windows", () => {
  const now = new Date("2026-07-19T00:00:00.000Z");

  assert.equal(authTokenExpiresAt("account_setup", now).toISOString(), "2026-07-20T00:00:00.000Z");
  assert.equal(authTokenExpiresAt("email_verification", now).toISOString(), "2026-07-20T00:00:00.000Z");
  assert.equal(authTokenExpiresAt("password_reset", now).toISOString(), "2026-07-19T01:00:00.000Z");
});

test("auth URLs use a safe application base URL", () => {
  assert.equal(authAppBaseUrl("http://localhost:3000/"), "http://localhost:3000");
  assert.equal(authAppBaseUrl("ftp://terumbu.eco"), "https://terumbu.eco");
  assert.equal(authAppBaseUrl("not a url"), "https://terumbu.eco");
  assert.equal(authActionUrl("/reset-password", "abc123", "https://terumbu.eco"), "https://terumbu.eco/reset-password?token=abc123");
});
