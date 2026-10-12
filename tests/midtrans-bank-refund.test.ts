import assert from "node:assert/strict";
import test from "node:test";

import { midtransBankConfirmedRefund } from "../src/lib/midtrans-bank-refund";

const orderId = "TRB-EXP-test";
const refundKey = "TRB-COMP-11111111222243338444555555555555";
const fullAmount = 100000;

const status = {
  order_id: orderId,
  transaction_status: "refund",
  gross_amount: "100000.00",
  currency: "IDR",
  refunds: [{
    refund_key: refundKey,
    refund_amount: "100000.00",
    bank_confirmed_at: "2026-10-10 08:15:00",
    refund_method: "online"
  }]
};

test("match Midtrans GET full-refund evidence by order, amount and stable refund key", () => {
  const found = midtransBankConfirmedRefund({ status, orderId, refundKey, fullAmount });
  assert.equal(found?.toISOString(), "2026-10-10T01:15:00.000Z");
});

test("never infer acquiring-bank confirmation from a provider refund status alone", () => {
  assert.equal(midtransBankConfirmedRefund({
    status: { ...status, refunds: [{ refund_key: refundKey, refund_amount: "100000.00" }] },
    orderId, refundKey, fullAmount
  }), null);
  assert.equal(midtransBankConfirmedRefund({
    status: { ...status, transaction_status: "partial_refund" }, orderId, refundKey, fullAmount
  }), null);
  assert.equal(midtransBankConfirmedRefund({
    status: { ...status, transaction_status: "chargeback" }, orderId, refundKey, fullAmount
  }), null);
});

test("reject mismatched keys, order IDs, partial amounts, forged bank dates and duplicate refunds", () => {
  for (const input of [
    { status, orderId: "wrong", refundKey, fullAmount },
    { status, orderId, refundKey: "different", fullAmount },
    { status, orderId, refundKey, fullAmount: 99999 },
    { status: { ...status, refunds: [...status.refunds, ...status.refunds] }, orderId, refundKey, fullAmount },
    { status: { ...status, currency: "USD" }, orderId, refundKey, fullAmount },
    { status: { ...status, refunds: [{ ...status.refunds[0], bank_confirmed_at: "2026-02-31 12:00:00" }] }, orderId, refundKey, fullAmount },
    { status: { ...status, refunds: [{ ...status.refunds[0], bank_confirmed_at: "not-a-timestamp" }] }, orderId, refundKey, fullAmount },
    { status: { ...status, refunds: [{ ...status.refunds[0], refund_amount: "50000.00" }] }, orderId, refundKey, fullAmount }
  ]) {
    assert.equal(midtransBankConfirmedRefund(input), null);
  }
});
