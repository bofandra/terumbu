import assert from "node:assert/strict";
import test from "node:test";

import { convertDisplayAmount, secondaryPriceLabel } from "../src/lib/currency-display";
import { referralCodeForUser, referralRewardProgress } from "../src/lib/referrals";

test("display currency conversion preserves canonical amount when currency matches", () => {
  assert.equal(convertDisplayAmount(125, "USD", "USD"), 125);
  assert.equal(secondaryPriceLabel(125, "USD", "USD"), null);
});

test("display currency conversion returns an approximate alternate display", () => {
  const idr = convertDisplayAmount(10, "USD", "IDR");

  assert.ok(idr > 100000);
  assert.match(secondaryPriceLabel(10, "USD", "IDR") ?? "", /IDR/);
});

test("referral codes are deterministic and do not expose the raw user id", () => {
  const code = referralCodeForUser("123e4567-e89b-12d3-a456-426614174000");

  assert.equal(code, referralCodeForUser("123e4567-e89b-12d3-a456-426614174000"));
  assert.equal(code.length, 12);
  assert.equal(code.includes("123e4567"), false);
});

test("referral recognition unlocks progressively", () => {
  const zero = referralRewardProgress(0);
  const three = referralRewardProgress(3);
  const five = referralRewardProgress(5);

  assert.equal(zero.unlocked.length, 0);
  assert.equal(zero.next?.label, "Ocean Connector");
  assert.deepEqual(three.unlocked.map((item) => item.label), ["Ocean Connector", "Reef Ambassador"]);
  assert.equal(three.next?.label, "Impact Guide");
  assert.equal(five.next, null);
});
