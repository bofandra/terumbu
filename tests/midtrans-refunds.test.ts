import assert from "node:assert/strict";
import test from "node:test";

import {
  midtransAutoRefundEnabled,
  midtransRefundEligible,
  midtransRefundKey,
  requestMidtransFullRefund
} from "../src/lib/midtrans-refunds";

const sandbox = { mode: "sandbox" as const, serverKey: "SB-Mid-test" };
const production = { mode: "production" as const, serverKey: "Mid-test" };

test("refund automation is disabled by default, with separate production approval", () => {
  assert.equal(midtransAutoRefundEnabled(sandbox, {}), false);
  assert.equal(midtransAutoRefundEnabled(sandbox, { MIDTRANS_AUTO_REFUND_ENABLED: "true" }), true);
  assert.equal(midtransAutoRefundEnabled(production, { MIDTRANS_AUTO_REFUND_ENABLED: "true" }), false);
  assert.equal(midtransAutoRefundEnabled(production, {
    MIDTRANS_AUTO_REFUND_ENABLED: "true",
    MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED: "true"
  }), true);
  assert.equal(midtransAutoRefundEnabled(null, { MIDTRANS_AUTO_REFUND_ENABLED: "true" }), false);
});

test("refund reference is unique and stable for each booking", () => {
  const booking = "11111111-2222-4333-8444-555555555555";
  const key = midtransRefundKey(booking);
  assert.equal(key, "TRB-COMP-11111111222243338444555555555555");
  assert.equal(midtransRefundKey(booking), key);
  assert.throws(() => midtransRefundKey("invalid"), /Invalid compensation/);
});

test("settled refundable channel and exact full IDR gross are mandatory", () => {
  const settlement = { transaction_status: "settlement", payment_type: "gopay", gross_amount: "100000.00", currency: "IDR" };
  assert.equal(midtransRefundEligible(settlement, 100000), true);
  assert.equal(midtransRefundEligible({ ...settlement, transaction_status: "pending" }, 100000), false);
  assert.equal(midtransRefundEligible({ ...settlement, payment_type: "bank_transfer" }, 100000), false);
  assert.equal(midtransRefundEligible({ ...settlement, payment_type: "unknown" }, 100000), false);
  assert.equal(midtransRefundEligible({ ...settlement, currency: "USD" }, 100000), false);
  assert.equal(midtransRefundEligible({ ...settlement, gross_amount: "99999.00" }, 100000), false);
});

test("refund POST sends stable key, full amount and never exposes server key in body", async () => {
  const refundKey = midtransRefundKey("11111111-2222-4333-8444-555555555555");
  let calls = 0;
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    calls += 1;
    assert.equal(input, "https://api.sandbox.midtrans.com/v2/TRB-EXP-123/refund");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Basic " + Buffer.from(sandbox.serverKey + ":").toString("base64"));
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.refund_key, refundKey);
    assert.equal(payload.amount, 100000);
    assert.equal(String(init?.body).includes(sandbox.serverKey), false);
    return new Response(JSON.stringify({
      order_id: "TRB-EXP-123", refund_key: refundKey,
      refund_amount: "100000.00", transaction_status: "refund", status_code: "200"
    }), { status: 200 });
  }) as typeof fetch;
  await requestMidtransFullRefund(sandbox, { orderId: "TRB-EXP-123", refundKey, amount: 100000 }, fetcher);
  assert.equal(calls, 1);
});

test("refund cannot be falsely accepted from an unrelated or partial provider response", async () => {
  const refundKey = midtransRefundKey("11111111-2222-4333-8444-555555555555");
  const partial = (async () => new Response(JSON.stringify({
    order_id: "TRB-EXP-123", refund_key: refundKey,
    refund_amount: "50000.00", transaction_status: "partial_refund", status_code: "200"
  }), { status: 200 })) as typeof fetch;
  await assert.rejects(
    requestMidtransFullRefund(sandbox, { orderId: "TRB-EXP-123", refundKey, amount: 100000 }, partial),
    /not verified as a full refund/
  );
});
