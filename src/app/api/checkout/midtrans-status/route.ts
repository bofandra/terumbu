import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import { donations, expeditionBookingPayments, expeditionBookings, paymentOperations, paymentTransactions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { checkoutStatusPayload, mayReadCheckoutStatus, readCheckoutStatusCookie } from "@/lib/checkout-status-access";
import { customerPaymentResolution } from "@/lib/checkout-payment-status";
import { hasRecoveredCheckoutAccess } from "@/lib/checkout-status-recovery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex" };
const uuidFormat = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const authorized = record && (
      mayReadCheckoutStatus({
        ownerId: record.ownerId,
        currentUserId: user?.id ?? null,
        guestToken,
        storedHash: checkoutStatusPayload(record.payload).checkoutAccessHash
      }) || (record.ownerId === null && await hasRecoveredCheckoutAccess({ token: guestToken, checkoutId: id, type: "donation" }))
    );
    if (!authorized) return NextResponse.json({ error: "Not found." }, { status: 404, headers: noStore });

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

  const authorized = record && (
    mayReadCheckoutStatus({
      ownerId: record.ownerId,
      currentUserId: user?.id ?? null,
      guestToken,
      storedHash: checkoutStatusPayload(record.payload).checkoutAccessHash
    }) || (record.ownerId === null && await hasRecoveredCheckoutAccess({ token: guestToken, checkoutId: id, type: "expedition" }))
  );
  if (!authorized) return NextResponse.json({ error: "Not found." }, { status: 404, headers: noStore });

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
