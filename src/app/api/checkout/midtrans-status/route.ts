import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import { donations, expeditionBookingPayments, expeditionBookings, paymentOperations, paymentTransactions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { checkoutStatusPayload, mayReadCheckoutStatus, readCheckoutStatusCookie } from "@/lib/checkout-status-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex" };
const uuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function customerPaymentResolution(input: {
  paymentStatus: string; bookingStatus?: string; compensationStatus?: string | null
}) {
  if (input.compensationStatus === "provider_refunded") {
    return { stage: "refunded", message: "Midtrans reports a refund or chargeback. Bank or issuer completion may take additional time.", final: true };
  }
  if (input.compensationStatus === "refund_submitted") {
    return { stage: "refund_requested", message: "A refund request was accepted for processing by Midtrans. Funds are not yet confirmed received.", final: false };
  }
  if (input.compensationStatus) {
    return { stage: "operator_review", message: "Payment is under specialist review because seats are unavailable. Do not pay again; our support team is handling resolution.", final: false };
  }
  if (input.paymentStatus === "refunded") {
    return { stage: "refunded", message: "The payment provider reports a refund or chargeback. Bank completion can take additional time.", final: true };
  }
  if (input.paymentStatus === "paid" && (!input.bookingStatus || input.bookingStatus === "confirmed")) {
    return { stage: "confirmed", message: input.bookingStatus === "confirmed"
      ? "Payment verified and your expedition booking is confirmed."
      : "Your donation payment is verified.", final: true };
  }
  if (input.paymentStatus === "paid") {
    return { stage: "operator_review", message: "Payment was verified, but the booking has not been confirmed. Our team will review this.", final: false };
  }
  if (input.paymentStatus === "expired" || input.paymentStatus === "failed") {
    return { stage: "not_completed", message: "This payment was not completed according to the latest verified record. Contact support before paying again.", final: true };
  }
  return { stage: "pending", message: "Your checkout was recorded. Payment awaits verified provider confirmation; please do not pay twice.", final: false };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const type = request.nextUrl.searchParams.get("type") ?? "";
  if (!uuidFormat.test(id) || (type !== "donation" && type !== "expedition")) {
    return NextResponse.json({ error: "Not found." }, { status: 404, headers: noStore });
  }
  const [user, guestToken] = await Promise.all([getSessionUser(), readCheckoutStatusCookie(id)]);
  if (type === "donation") {
    const [record] = await db.select({
      ownerId: donations.userId,
      paymentStatus: donations.status,
      payload: paymentTransactions.payload
    }).from(donations)
      .innerJoin(paymentTransactions, eq(paymentTransactions.donationId, donations.id))
      .where(and(eq(donations.id, id), eq(paymentTransactions.provider, "midtrans")))
      .limit(1);
    if (!record || !mayReadCheckoutStatus({
      ownerId: record.ownerId,
      currentUserId: user?.id ?? null,
      guestToken,
      storedHash: checkoutStatusPayload(record.payload).checkoutAccessHash
    })) return NextResponse.json({ error: "Not found." }, { status: 404, headers: noStore });

    const resolution = customerPaymentResolution({ paymentStatus: record.paymentStatus });
    return NextResponse.json({ type, ...resolution, asOf: new Date().toISOString() }, { headers: noStore });
  }

  const [record] = await db.select({
    ownerId: expeditionBookings.userId,
    paymentStatus: expeditionBookings.paymentStatus,
    bookingStatus: expeditionBookings.status,
    payload: expeditionBookingPayments.payload
  }).from(expeditionBookings)
    .innerJoin(expeditionBookingPayments, eq(expeditionBookingPayments.bookingId, expeditionBookings.id))
    .where(and(eq(expeditionBookings.id, id), eq(expeditionBookingPayments.provider, "midtrans")))
    .limit(1);

  if (!record || !mayReadCheckoutStatus({
    ownerId: record.ownerId,
    currentUserId: user?.id ?? null,
    guestToken,
    storedHash: checkoutStatusPayload(record.payload).checkoutAccessHash
  })) return NextResponse.json({ error: "Not found." }, { status: 404, headers: noStore });

  const [compensation] = await db.select({ status: paymentOperations.status })
    .from(paymentOperations)
    .where(and(eq(paymentOperations.bookingId, id),
      eq(paymentOperations.operationType, "midtrans_capacity_conflict")))
    .limit(1);
  const resolution = customerPaymentResolution({
    paymentStatus: record.paymentStatus,
    bookingStatus: record.bookingStatus,
    compensationStatus: compensation?.status
  });
  return NextResponse.json({ type, ...resolution, asOf: new Date().toISOString() }, { headers: noStore });
}
