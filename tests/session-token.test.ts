import assert from "node:assert/strict";
import test from "node:test";

import {
  hashSessionToken,
  sessionTokenIsStoredHash,
  sessionTokenLookupCandidates,
  storedSessionToken
} from "../src/lib/session-token";

test("newly persisted sessions store only a prefixed hash", () => {
  const raw = "a".repeat(64);
  const stored = storedSessionToken(raw);

  assert.equal(stored, `sha256:${hashSessionToken(raw)}`);
  assert.equal(sessionTokenIsStoredHash(stored), true);
  assert.notEqual(stored, raw);
});

test("raw legacy 64-char session tokens remain lookup-compatible", () => {
  const raw = "b".repeat(64);

  assert.deepEqual(sessionTokenLookupCandidates(raw), [storedSessionToken(raw), raw]);
});

test("a leaked stored hash cannot be replayed directly as a cookie", () => {
  const stored = storedSessionToken("c".repeat(64));
  const candidates = sessionTokenLookupCandidates(stored);

  assert.deepEqual(candidates, [storedSessionToken(stored)]);
  assert.equal(candidates.includes(stored), false);
});

test("empty session cookies produce no database lookup candidates", () => {
  assert.deepEqual(sessionTokenLookupCandidates("   "), []);
});
