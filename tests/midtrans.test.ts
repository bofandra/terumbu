import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  createMidtransSnapPayment,
  fetchMidtransTransactionStatus,
  midtransConfiguration,
  midtransIdrAmount,
  midtransPaymentState,
  verifyMidtransSignature
} from "../src/lib/midtrans";

const config = { serverKey: "SB-Mid-server-test-only", mode: "sandbox" as const };

function signedNotification(overrides: Record<string, string> = {}) {
  const fields = {
    order_id: "TRB-DON-abc123",
    status_code: "200",
    gross_amount: "10000.00",
    transaction_status: "settlement",
    ...overrides
  };
  const signature_key = createHash("sha512")
    .update(fields.order_id + fields.status_code + fields.gross_amount + config.serverKey)
    .digest("hex");
  return { ...fields, signature_key };
}

test("Midtrans remains disabled without explicit enablement and a server key", () => {
  assert.equal(midtransConfiguration({ MIDTRANS_SERVER_KEY: "server" }), null);
  assert.equal(midtransConfiguration({ MIDTRANS_PAYMENT_ENABLED: "true" }), null);
  assert.equal(midtransConfiguration({ MIDTRANS_PAYMENT_ENABLED: "true", MIDTRANS_SERVER_KEY: "server", MIDTRANS_ENV: "unknown" }), null);
  assert.deepEqual(midtransConfiguration({
    MIDTRANS_PAYMENT_ENABLED: "true",
    MIDTRANS_SERVER_KEY: "server",
    MIDTRANS_ENV: "sandbox"
  }), { serverKey: "server", mode: "sandbox" });
});

test("Midtrans signature covers the order ID, status code and exact gross amount", () => {
  const notification = signedNotification();
  assert.equal(verifyMidtransSignature(notification, config.serverKey), true);
  assert.equal(verifyMidtransSignature({ ...notification, gross_amount: "10001.00" }, config.serverKey), false);
  assert.equal(verifyMidtransSignature({ ...notification, status_code: "201" }, config.serverKey), false);
  assert.equal(verifyMidtransSignature({ ...notification, signature_key: "f".repeat(128) }, config.serverKey), false);
  assert.equal(verifyMidtransSignature({ ...notification, signature_key: "not-a-signature" }, config.serverKey), false);
  assert.equal(verifyMidtransSignature(notification, ""), false);
});

test("IDR amounts are positive safe integers, never partial or scientific notation", () => {
  assert.equal(midtransIdrAmount("10000.00"), 10000);
  assert.equal(midtransIdrAmount("10000"), 10000);
  assert.equal(midtransIdrAmount("0.00"), null);
  assert.equal(midtransIdrAmount("10000.50"), null);
  assert.equal(midtransIdrAmount("1e5"), null);
  assert.equal(midtransIdrAmount("9007199254740993"), null);
});

test("Midtrans states require accepted captures and do not treat partial refunds as full", () => {
  assert.equal(midtransPaymentState({ transaction_status: "capture", fraud_status: "challenge" }), "pending");
  assert.equal(midtransPaymentState({ transaction_status: "capture", fraud_status: "accept" }), "paid");
  assert.equal(midtransPaymentState({ transaction_status: "settlement", currency: "USD" }), null);
  assert.equal(midtransPaymentState({ transaction_status: "settlement" }), "paid");
  assert.equal(midtransPaymentState({ transaction_status: "deny" }), "failed");
  assert.equal(midtransPaymentState({ transaction_status: "expire" }), "expired");
  assert.equal(midtransPaymentState({ transaction_status: "refund" }), "refunded");
  assert.equal(midtransPaymentState({ transaction_status: "partial_refund" }), null);
  assert.equal(midtransPaymentState({ transaction_status: "pending" }), "pending");
});

test("Snap creation uses sandbox endpoint and never forwards server key in request body", async () => {
  let called = "";
  let auth = "";
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    called = String(input);
    auth = new Headers(init?.headers).get("Authorization") ?? "";
    const request = JSON.parse(String(init?.body));
    assert.deepEqual(request.transaction_details, { order_id: "TRB-DON-123", gross_amount: 10000 });
    assert.equal(String(init?.body).includes(config.serverKey), false);
    return new Response(JSON.stringify({ redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/abc" }), { status: 201 });
  }) as typeof fetch;
  const url = await createMidtransSnapPayment(config, {
    orderId: "TRB-DON-123", amount: 10000, donorName: "Test", donorEmail: "test@example.org"
  }, fetcher);
  assert.equal(called, "https://app.sandbox.midtrans.com/snap/v1/transactions");
  assert.equal(auth, "Basic " + Buffer.from(config.serverKey + ":").toString("base64"));
  assert.equal(url, "https://app.sandbox.midtrans.com/snap/v2/vtweb/abc");
});

test("Snap creation refuses a provider redirect to an attacker origin", async () => {
  const fetcher = (async () => new Response(JSON.stringify({
    redirect_url: "https://app.sandbox.midtrans.com.evil.invalid/steal"
  }), { status: 201 })) as typeof fetch;
  await assert.rejects(createMidtransSnapPayment(config, {
    orderId: "TRB-DON-123", amount: 10000, donorName: "Test", donorEmail: "test@example.org"
  }, fetcher), /invalid redirect destination/);
});

test("GET status uses authenticated provider API and validates returned order", async () => {
  const fetcher = (async (input: string | URL | Request) => {
    assert.equal(input, "https://api.sandbox.midtrans.com/v2/TRB-DON-123/status");
    return new Response(JSON.stringify({
      order_id: "TRB-DON-123", gross_amount: "10000.00", transaction_status: "settlement"
    }), { status: 200 });
  }) as typeof fetch;
  const result = await fetchMidtransTransactionStatus(config, "TRB-DON-123", fetcher);
  assert.equal(midtransPaymentState(result), "paid");

  const tampered = (async () => new Response(JSON.stringify({
    order_id: "someone-else", gross_amount: "10000.00", transaction_status: "settlement"
  }), { status: 200 })) as typeof fetch;
  await assert.rejects(fetchMidtransTransactionStatus(config, "TRB-DON-123", tampered), /Invalid Midtrans order/);
});

test("expedition Snap sessions enforce a fixed server-side payment and page expiry", async () => {
  let payload: Record<string, unknown> = {};
  const fetcher = (async (_input: string | URL | Request, init?: RequestInit) => {
    payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/exp" }), { status: 201 });
  }) as typeof fetch;

  await createMidtransSnapPayment(config, {
    orderId: "TRB-EXP-123",
    amount: 100000,
    donorName: "Traveler",
    donorEmail: "traveler@example.org",
    expiry: { startTime: "2026-10-12 07:00:00 +0700", durationMinutes: 15 }
  }, fetcher);

  assert.deepEqual(payload.expiry, {
    start_time: "2026-10-12 07:00:00 +0700", duration: 15, unit: "minute"
  });
  assert.deepEqual(payload.page_expiry, { duration: 15, unit: "minute" });
  await assert.rejects(createMidtransSnapPayment(config, {
    orderId: "TRB-EXP-123", amount: 100000, donorName: "Traveler",
    donorEmail: "traveler@example.org",
    expiry: { startTime: "malformed", durationMinutes: 15 }
  }, fetcher), /Invalid Snap payment expiry/);
});
