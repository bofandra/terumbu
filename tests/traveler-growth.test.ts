import assert from "node:assert/strict";
import test from "node:test";

import { convertDisplayAmount, secondaryPriceLabel, validateDisplayFxSnapshot } from "../src/lib/currency-display";
import { referralCodeForUser, referralRewardProgress } from "../src/lib/referrals";

test("display currency conversion preserves canonical amount when currency matches", () => {
  assert.equal(convertDisplayAmount(125, "USD", "USD"), 125);
  assert.equal(secondaryPriceLabel(125, "USD", "USD"), null);
});

test("display currency conversion never invents an estimate without a current sourced quote", () => {
  const snapshot = Object.fromEntries(["NEXT_PUBLIC_FX_SOURCE", "NEXT_PUBLIC_FX_AS_OF", "NEXT_PUBLIC_FX_USD_EUR", "NEXT_PUBLIC_FX_USD_IDR", "NEXT_PUBLIC_FX_USD_JPY"].map((key) => [key, process.env[key]]));
  try {
    delete process.env.NEXT_PUBLIC_FX_SOURCE;
    delete process.env.NEXT_PUBLIC_FX_AS_OF;
    delete process.env.NEXT_PUBLIC_FX_USD_EUR;
    delete process.env.NEXT_PUBLIC_FX_USD_IDR;
    delete process.env.NEXT_PUBLIC_FX_USD_JPY;
    assert.equal(validateDisplayFxSnapshot({ asOf: "", source: "", usdRates: { USD: 1, EUR: 0, IDR: 0, JPY: 0 } }), null);
    // An incomplete explicit override must fail closed even when a reviewed file exists.
    process.env.NEXT_PUBLIC_FX_SOURCE = "Incomplete provider configuration";
    assert.equal(convertDisplayAmount(10, "USD", "IDR"), null);
    assert.equal(secondaryPriceLabel(10, "USD", "IDR"), null);

    process.env.NEXT_PUBLIC_FX_SOURCE = "Example rate provider";
    process.env.NEXT_PUBLIC_FX_AS_OF = new Date().toISOString().slice(0, 10);
    process.env.NEXT_PUBLIC_FX_USD_EUR = "0.85";
    process.env.NEXT_PUBLIC_FX_USD_IDR = "16750";
    process.env.NEXT_PUBLIC_FX_USD_JPY = "149";
    assert.equal(convertDisplayAmount(10, "USD", "IDR"), 167500);
    assert.match(secondaryPriceLabel(10, "USD", "IDR") ?? "", /IDR.*FX/);

    process.env.NEXT_PUBLIC_FX_AS_OF = "2020-01-01";
    assert.equal(convertDisplayAmount(10, "USD", "IDR"), null);
    process.env.NEXT_PUBLIC_FX_AS_OF = "2026-02-30";
    assert.equal(convertDisplayAmount(10, "USD", "IDR"), null);
    assert.equal(convertDisplayAmount(10, "UNKNOWN", "USD"), null);
  } finally {
    for (const [key, value] of Object.entries(snapshot)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
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
