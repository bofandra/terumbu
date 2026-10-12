import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import { expeditionBookingPayments, expeditionBookings, expeditionDepartures, expeditions, midtransRefundBankConfirmations, paymentOperations } from "../../src/db/schema";
import { queueMidtransCapacityConflict, reconcileMidtransCompensation } from "../../src/lib/midtrans-compensations";
import { midtransRefundKey } from "../../src/lib/midtrans-refunds";

test("duplicate capacity conflicts generate one case; refund POST once, then reconcile provider", async () => {
  test.setTimeout(120_000);
  const previousFetch = globalThis.fetch;
  const originalEnv = {
    MIDTRANS_PAYMENT_ENABLED: process.env.MIDTRANS_PAYMENT_ENABLED,
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
    MIDTRANS_ENV: process.env.MIDTRANS_ENV,
    MIDTRANS_AUTO_REFUND_ENABLED: process.env.MIDTRANS_AUTO_REFUND_ENABLED,
    MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED: process.env.MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED
  };
  let bookingId: string | null = null;
  let departureId: string | null = null;
  let providerReference: string | null = null;
  try {
    const [expedition] = await db.select({ id: expeditions.id }).from(expeditions)
      .where(eq(expeditions.slug, "raja-ampat-coral-restoration")).limit(1);
    expect(expedition).toBeTruthy();
    const startsAt = new Date(Date.now() + 90 * 86400_000);
    const [departure] = await db.insert(expeditionDepartures).values({
      expeditionId: expedition.id, startsAt,
      endsAt: new Date(startsAt.getTime() + 3 * 86400_000),
      capacity: 1, seatsBooked: 1, status: "full"
    }).returning({ id: expeditionDepartures.id });
    departureId = departure.id;
    providerReference = "TRB-EXP-" + randomUUID();
    const [booking] = await db.insert(expeditionBookings).values({
      expeditionId: expedition.id, departureId: departure.id,
      bookingCode: "E2E-COMP-" + randomUUID(),
      contactName: "Capacity conflict", contactEmail: "conflict@example.org",
      participantsCount: 1, totalAmount: "100000.00", currency: "IDR",
      status: "pending_payment", paymentStatus: "pending",
      holdExpiresAt: new Date(Date.now() - 30_000)
    }).returning({ id: expeditionBookings.id });
    bookingId = booking.id;
    await db.insert(expeditionBookingPayments).values({
      bookingId: booking.id, provider: "midtrans", providerReference, status: "pending"
    });
    const first = await queueMidtransCapacityConflict({
      bookingId, providerReference, amount: 100000, providerPaymentType: "gopay"
    });
    const second = await queueMidtransCapacityConflict({
      bookingId, providerReference, amount: 100000, providerPaymentType: "gopay"
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(first.operationId).toBe(second.operationId);
    const [caseRow] = await db.select({ status: paymentOperations.status, metadata: paymentOperations.metadata })
      .from(paymentOperations).where(and(eq(paymentOperations.bookingId, bookingId),
        eq(paymentOperations.operationType, "midtrans_capacity_conflict"))).limit(1);
    expect(caseRow.status).toBe("pending");
    expect((caseRow.metadata as Record<string, unknown>).refundKey).toBe(midtransRefundKey(bookingId));

    process.env.MIDTRANS_PAYMENT_ENABLED = "true";
    process.env.MIDTRANS_SERVER_KEY = "SB-Mid-e2e-only";
    process.env.MIDTRANS_ENV = "sandbox";
    process.env.MIDTRANS_AUTO_REFUND_ENABLED = "true";
    delete process.env.MIDTRANS_AUTO_REFUND_PRODUCTION_ENABLED;

    let stage: "settlement" | "refund" = "settlement";
    let bankConfirmed = false;
    let refundRequests = 0;
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/status")) {
        return new Response(JSON.stringify({
          order_id: providerReference, gross_amount: "100000.00", currency: "IDR",
          payment_type: "gopay", transaction_status: stage,
          ...(stage === "refund" ? {
            refunds: [{ refund_key: midtransRefundKey(bookingId!),
              refund_amount: "100000.00",
              ...(bankConfirmed ? { bank_confirmed_at: "2026-10-10 08:15:00" } : {})
            }]
          } : {})
        }), { status: 200 });
      }
      if (url.endsWith("/refund")) {
        refundRequests += 1;
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
        assert.equal(payload.amount, 100000);
        assert.equal(payload.refund_key, midtransRefundKey(bookingId!));
        return new Response(JSON.stringify({
          order_id: providerReference, refund_key: payload.refund_key,
          refund_amount: "100000.00", transaction_status: "refund", status_code: "200"
        }), { status: 200 });
      }
      throw new Error("Unexpected network request in compensation test.");
    }) as typeof fetch;

    expect(await reconcileMidtransCompensation(bookingId)).toBe("submitted");
    expect(await reconcileMidtransCompensation(bookingId)).toBe("submitted");
    expect(refundRequests).toBe(1);
    stage = "refund";
    expect(await reconcileMidtransCompensation(bookingId)).toBe("provider_refunded");
    const [updatedBooking] = await db.select({
      status: expeditionBookings.status, paymentStatus: expeditionBookings.paymentStatus
    }).from(expeditionBookings).where(eq(expeditionBookings.id, bookingId)).limit(1);
    expect(updatedBooking.status).toBe("cancelled");
    expect(updatedBooking.paymentStatus).toBe("refunded");
    const [updatedOperation] = await db.select({ status: paymentOperations.status }).from(paymentOperations)
      .where(eq(paymentOperations.id, first.operationId!)).limit(1);
    expect(updatedOperation.status).toBe("provider_refunded");
    const [bankBefore] = await db.select({ id: midtransRefundBankConfirmations.operationId })
      .from(midtransRefundBankConfirmations).where(eq(midtransRefundBankConfirmations.operationId, first.operationId!));
    expect(bankBefore).toBeUndefined();

    bankConfirmed = true;
    expect(await reconcileMidtransCompensation(bookingId)).toBe("bank_confirmed");
    expect(await reconcileMidtransCompensation(bookingId)).toBe("bank_confirmed");

    const bankRows = await db.select({
      bankConfirmedAt: midtransRefundBankConfirmations.bankConfirmedAt,
      amount: midtransRefundBankConfirmations.refundAmount
    }).from(midtransRefundBankConfirmations)
      .where(eq(midtransRefundBankConfirmations.operationId, first.operationId!));
    expect(bankRows).toHaveLength(1);
    expect(bankRows[0].bankConfirmedAt.toISOString()).toBe("2026-10-10T01:15:00.000Z");
    expect(Number(bankRows[0].amount)).toBe(100000);
    expect(refundRequests).toBe(1);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (bookingId) {
      if (providerReference) await db.delete(midtransRefundBankConfirmations).where(eq(midtransRefundBankConfirmations.providerReference, providerReference));
      await db.delete(paymentOperations).where(eq(paymentOperations.bookingId, bookingId));
      await db.delete(expeditionBookings).where(eq(expeditionBookings.id, bookingId));
    }
    if (departureId) await db.delete(expeditionDepartures).where(eq(expeditionDepartures.id, departureId));
  }
});
