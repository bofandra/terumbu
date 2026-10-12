import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import { donations, expeditionBookingPayments, expeditionBookings, paymentOperations, paymentTransactions } from "@/db/schema";
import {
  fetchMidtransTransactionStatus,
  midtransConfiguration,
  midtransIdrAmount,
  midtransPaymentState,
  verifyMidtransSignature,
  type MidtransStatusPayload
} from "@/lib/midtrans";
import { recordPaymentOperation, transitionDonationPayment, transitionExpeditionBookingPayment } from "@/lib/payment-workflows";
import { verifiedExpeditionGrossMatches } from "@/lib/midtrans-expedition";
import { readBoundedRequestBody, RequestBodyTooLargeError } from "@/lib/read-bounded-request-body";

/**
 * An authenticated, bounded, fail-closed notification endpoint for IDR
 * donations created by Terumbu. No client redirect can mark payments as paid.
 */
export async function POST(request: NextRequest) {
  const config = midtransConfiguration();
  if (!config) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  let input: MidtransStatusPayload;
  try {
    const body = await readBoundedRequestBody(request.body, 16 * 1024);
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
    }
    input = parsed as MidtransStatusPayload;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof RequestBodyTooLargeError ? "Payload too large." : "Invalid notification." },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 }
    );
  }

  if (!verifyMidtransSignature(input, config.serverKey)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  const orderId = input.order_id as string;
  const requestedAmount = midtransIdrAmount(input.gross_amount);
  if (requestedAmount == null) return NextResponse.json({ error: "Invalid amount." }, { status: 422 });

  const [payment] = await db.select({ donationId: paymentTransactions.donationId })
    .from(paymentTransactions)
    .where(and(eq(paymentTransactions.provider, "midtrans"), eq(paymentTransactions.providerReference, orderId)))
    .limit(1);
  const [expeditionPayment] = payment?.donationId ? [] : await db.select({ bookingId: expeditionBookingPayments.bookingId })
    .from(expeditionBookingPayments)
    .where(and(eq(expeditionBookingPayments.provider, "midtrans"), eq(expeditionBookingPayments.providerReference, orderId)))
    .limit(1);
  if (!payment?.donationId && !expeditionPayment?.bookingId) {
    return NextResponse.json({ error: "Unknown order." }, { status: 404 });
  }

  // Authenticated GET Status provides the current authoritative state, avoiding
  // stale notifications moving a settled donation back to pending.
  let current: MidtransStatusPayload;
  try {
    current = await fetchMidtransTransactionStatus(config, orderId);
  } catch {
    console.error("Midtrans status confirmation unavailable.");
    return NextResponse.json({ error: "Status confirmation unavailable." }, { status: 503 });
  }
  const currentAmount = midtransIdrAmount(current.gross_amount);
  if (currentAmount !== requestedAmount || current.order_id !== orderId) {
    return NextResponse.json({ error: "Provider order mismatch." }, { status: 422 });
  }
  const status = midtransPaymentState(current);
  if (!status) {
    // Partial refunds and unrecognized states require explicit reconciliation.
    console.warn("Unmapped Midtrans transaction state requires manual review.");
    return NextResponse.json({ ok: true, manualReview: true });
  }

  if (expeditionPayment?.bookingId) {
    const bookingId = expeditionPayment.bookingId;
    let result: "mismatch" | "unchanged" | "updated" | "capacity_unavailable";
    try {
      result = await db.transaction(async (tx) => {
        const [booking] = await tx.select({
          id: expeditionBookings.id,
          amount: expeditionBookings.totalAmount,
          currency: expeditionBookings.currency,
          status: expeditionBookings.status,
          paymentStatus: expeditionBookings.paymentStatus
        }).from(expeditionBookings).where(eq(expeditionBookings.id, bookingId)).limit(1).for("update");
        if (!booking || !verifiedExpeditionGrossMatches(booking.currency, Number(booking.amount), requestedAmount)) return "mismatch" as const;
        if (booking.paymentStatus === status || booking.paymentStatus === "refunded" && status !== "refunded") return "unchanged" as const;
        if (status === "paid" && booking.status === "cancelled") return "capacity_unavailable" as const;
        const updated = await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
          bookingId, nextStatus: status, providerReference: orderId,
          providerPayload: {
            method: "midtrans_snap",
            providerTransactionId: typeof current.transaction_id === "string" ? current.transaction_id : null,
            providerStatus: current.transaction_status,
            verifiedAt: new Date().toISOString()
          },
          operationType: "midtrans_webhook"
        });
        return updated ? "updated" as const : "mismatch" as const;
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "EXPEDITION_CAPACITY_UNAVAILABLE") throw error;
      result = "capacity_unavailable";
    }
    if (result === "capacity_unavailable") {
      // Payment may be settled but no seats remain. Keep the booking unconfirmed,
      // and create a durable, operator-visible exception. Never overbook.
      await db.transaction(async (tx) => {
        const [booking] = await tx.select({ id: expeditionBookings.id })
          .from(expeditionBookings).where(eq(expeditionBookings.id, bookingId)).limit(1).for("update");
        if (!booking) return;
        const [existing] = await tx.select({ id: paymentOperations.id }).from(paymentOperations)
          .where(and(eq(paymentOperations.bookingId, bookingId), eq(paymentOperations.operationType, "midtrans_capacity_conflict")))
          .limit(1);
        if (!existing) {
          await recordPaymentOperation(tx as unknown as typeof db, {
            operationType: "midtrans_capacity_conflict", entityType: "expedition_booking",
            bookingId, provider: "midtrans", providerReference: orderId,
            status: "failed", reason: "Verified payment cannot be allocated to available expedition seats; manual reconciliation/refund required.",
            amount: requestedAmount, currency: "IDR", processedAt: new Date()
          });
        }
      });
      console.error("Midtrans expedition paid but capacity unavailable; operator reconciliation required.");
      return NextResponse.json({ error: "Capacity conflict; manual reconciliation required." }, { status: 503 });
    }
    if (result === "mismatch") return NextResponse.json({ error: "Booking amount mismatch." }, { status: 422 });
    return NextResponse.json({ ok: true, type: "expedition", status: result });
  }

  const result = await db.transaction(async (tx) => {
    const [donation] = await tx.select({
      id: donations.id,
      amount: donations.amount,
      currency: donations.currency,
      status: donations.status
    }).from(donations).where(eq(donations.id, payment.donationId!)).limit(1).for("update");

    if (!donation || donation.currency !== "IDR" || Number(donation.amount) !== requestedAmount) {
      return "mismatch" as const;
    }
    if (donation.status === status) return "unchanged" as const;
    if (donation.status === "refunded" && status !== "refunded") return "unchanged" as const;
    const updated = await transitionDonationPayment(tx as unknown as typeof db, {
      donationId: donation.id,
      nextStatus: status,
      providerReference: orderId,
      providerPayload: {
        method: "midtrans_snap",
        providerTransactionId: typeof current.transaction_id === "string" ? current.transaction_id : null,
        providerStatus: current.transaction_status,
        providerFraudStatus: typeof current.fraud_status === "string" ? current.fraud_status : null,
        providerPaymentType: typeof current.payment_type === "string" ? current.payment_type : null,
        verifiedAt: new Date().toISOString()
      },
      operationType: "midtrans_webhook"
    });
    return updated ? "updated" as const : "mismatch" as const;
  });
  if (result === "mismatch") return NextResponse.json({ error: "Donation mismatch." }, { status: 422 });
  return NextResponse.json({ ok: true, status: result });
}
