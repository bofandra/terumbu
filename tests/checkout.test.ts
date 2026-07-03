import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBookingCode,
  buildPaymentMethodReference,
  buildPaymentOperationCode,
  buildReceiptNumber,
  buildSponsoredEcosystemCode,
  buildSubscriptionReference,
  calculateBookingTotal,
  nextMonthlyBillingDate,
  normalizeCardLast4,
  parseDonationAmount,
  parseParticipantCount,
  splitParticipantNames
} from "../src/lib/checkout";

test("donation amount parsing keeps numeric currency input", () => {
  assert.equal(parseDonationAmount("Rp100.000"), 100000);
  assert.equal(parseDonationAmount("50000"), 50000);
  assert.equal(parseDonationAmount("oops"), 0);
});

test("booking totals and participant counts are bounded", () => {
  assert.equal(parseParticipantCount("0"), 1);
  assert.equal(parseParticipantCount("99"), 12);
  assert.equal(calculateBookingTotal("2500000.00", 2), 5000000);
});

test("checkout identifiers are deterministic for a sequence", () => {
  const date = new Date("2026-06-20T00:00:00.000Z");

  assert.equal(buildReceiptNumber("abc123", date), "TRB-RCP-2026-ABC123");
  assert.equal(buildBookingCode("42", date), "TRB-EXP-2026-0042");
  assert.equal(buildSponsoredEcosystemCode("coral-7", date), "TRB-CORAL-2026-CORAL7");
  assert.equal(buildSubscriptionReference("sub-9", date), "TRB-SUB-2026-SUB9");
  assert.equal(buildPaymentMethodReference("pm-9", date), "TRB-PM-2026-0PM9");
  assert.equal(buildPaymentOperationCode("ops-9", date), "TRB-OPS-2026-OPS9");
});

test("participant names fill missing entries", () => {
  assert.deepEqual(splitParticipantNames("Raka\nDewi", "Raka", 3), ["Raka", "Dewi", "Raka 3"]);
});

test("billing helpers normalize dates and card labels", () => {
  assert.equal(normalizeCardLast4("4242"), "4242");
  assert.equal(normalizeCardLast4("42"), "0042");
  assert.equal(nextMonthlyBillingDate(new Date("2026-01-15T00:00:00.000Z")).toISOString(), "2026-02-15T00:00:00.000Z");
});
