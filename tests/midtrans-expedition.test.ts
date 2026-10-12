import assert from "node:assert/strict";
import test from "node:test";

import {
  midtransExpeditionEnabled,
  validMidtransExpeditionTotal,
  verifiedExpeditionGrossMatches
} from "../src/lib/midtrans-expedition";

test("expedition gateway is separately disabled until merchant rollout approval", () => {
  const base = {
    MIDTRANS_PAYMENT_ENABLED: "true",
    MIDTRANS_SERVER_KEY: "SB-Mid-test",
    MIDTRANS_ENV: "sandbox"
  };
  assert.equal(midtransExpeditionEnabled(base), false);
  assert.equal(midtransExpeditionEnabled({ ...base, MIDTRANS_EXPEDITION_ENABLED: "false" }), false);
  assert.equal(midtransExpeditionEnabled({ ...base, MIDTRANS_EXPEDITION_ENABLED: "true" }), true);
  assert.equal(midtransExpeditionEnabled({ ...base, MIDTRANS_PAYMENT_ENABLED: "false", MIDTRANS_EXPEDITION_ENABLED: "true" }), false);
  assert.equal(midtransExpeditionEnabled({ ...base, MIDTRANS_SERVER_KEY: "", MIDTRANS_EXPEDITION_ENABLED: "true" }), false);
});

test("only exact positive integer rupiah amount may be submitted for expedition payment", () => {
  assert.equal(validMidtransExpeditionTotal("IDR", 750000), true);
  assert.equal(validMidtransExpeditionTotal("idr", 2500000), true);
  assert.equal(validMidtransExpeditionTotal("USD", 750000), false);
  assert.equal(validMidtransExpeditionTotal("IDR", 750000.25), false);
  assert.equal(validMidtransExpeditionTotal("IDR", 0), false);
  assert.equal(validMidtransExpeditionTotal("IDR", 1_000_000_000_000), false);
  assert.equal(validMidtransExpeditionTotal("IDR", Number.NaN), false);
});

test("verified booking status must match original IDR gross exactly, never converted display price", () => {
  assert.equal(verifiedExpeditionGrossMatches("IDR", 500000, 500000), true);
  assert.equal(verifiedExpeditionGrossMatches("IDR", 500000, 499999), false);
  assert.equal(verifiedExpeditionGrossMatches("USD", 500000, 500000), false);
  assert.equal(verifiedExpeditionGrossMatches("IDR", 500000, null), false);
});
