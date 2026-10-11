import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import { donations, paymentTransactions } from "@/db/schema";
import {
  fetchMidtransTransactionStatus,
  midtransConfiguration,
  midtransIdrAmount,
  midtransPaymentState,
  verifyMidtransSignature,
  type MidtransStatusPayload
} from "@/lib/midtrans";
import { transitionDonationPayment } from "@/lib/payment-workflows";
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
  if (!payment?.donationId) return NextResponse.json({ error: "Unknown order." }, { status: 404 });

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
