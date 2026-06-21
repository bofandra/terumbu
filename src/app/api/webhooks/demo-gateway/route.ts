import { createHmac, timingSafeEqual } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import {
  campaigns,
  donationReceipts,
  donations,
  expeditionBookingPayments,
  expeditionBookings,
  expeditionDepartures,
  paymentTransactions
} from "@/db/schema";
import { buildReceiptNumber } from "@/lib/checkout";

type WebhookPayload = {
  providerReference?: string;
  status?: "paid" | "failed" | "expired" | "refunded";
};

function isValidSignature(body: string, signature: string | null) {
  const secret = process.env.DEMO_GATEWAY_WEBHOOK_SECRET;

  if (!secret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-terumbu-signature");

  if (!isValidSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let payload: WebhookPayload | null = null;

  try {
    payload = JSON.parse(body || "null") as WebhookPayload | null;
  } catch {
    return NextResponse.json({ error: "Invalid demo webhook payload." }, { status: 400 });
  }

  if (!payload?.providerReference || !payload.status) {
    return NextResponse.json({ error: "Invalid demo webhook payload." }, { status: 400 });
  }

  const providerReference = payload.providerReference;
  const status = payload.status;
  const now = new Date();

  const [donationTransaction] = await db
    .select({
      id: paymentTransactions.id,
      donationId: paymentTransactions.donationId,
      previousStatus: paymentTransactions.status,
      campaignId: donations.campaignId,
      amount: donations.amount
    })
    .from(paymentTransactions)
    .innerJoin(donations, eq(paymentTransactions.donationId, donations.id))
    .where(eq(paymentTransactions.providerReference, providerReference))
    .limit(1);

  if (donationTransaction?.donationId) {
    const donationId = donationTransaction.donationId;

    await db.transaction(async (tx) => {
      await tx
        .update(paymentTransactions)
        .set({
          status,
          payload,
          updatedAt: now
        })
        .where(eq(paymentTransactions.id, donationTransaction.id));

      await tx.update(donations).set({ status }).where(eq(donations.id, donationId));

      if (status === "paid" && donationTransaction.previousStatus !== "paid") {
        await tx
          .update(campaigns)
          .set({
            raisedAmount: sql`${campaigns.raisedAmount} + ${donationTransaction.amount}`,
            donorCount: sql`${campaigns.donorCount} + 1`,
            updatedAt: now
          })
          .where(eq(campaigns.id, donationTransaction.campaignId));

        await tx
          .insert(donationReceipts)
          .values({
            donationId,
            receiptNumber: buildReceiptNumber(providerReference, now),
            issuedAt: now,
            payload
          })
          .onConflictDoNothing({
            target: donationReceipts.donationId
          });
      }
    });

    return NextResponse.json({ ok: true, type: "donation" });
  }

  const [bookingTransaction] = await db
    .select({
      id: expeditionBookingPayments.id,
      bookingId: expeditionBookingPayments.bookingId,
      previousStatus: expeditionBookingPayments.status,
      departureId: expeditionBookings.departureId,
      participantsCount: expeditionBookings.participantsCount
    })
    .from(expeditionBookingPayments)
    .innerJoin(expeditionBookings, eq(expeditionBookingPayments.bookingId, expeditionBookings.id))
    .where(eq(expeditionBookingPayments.providerReference, providerReference))
    .limit(1);

  if (bookingTransaction) {
    await db.transaction(async (tx) => {
      await tx
        .update(expeditionBookingPayments)
        .set({
          status,
          payload,
          updatedAt: now
        })
        .where(eq(expeditionBookingPayments.id, bookingTransaction.id));

      await tx
        .update(expeditionBookings)
        .set({
          paymentStatus: status,
          status: status === "paid" ? "confirmed" : "pending_payment",
          confirmedAt: status === "paid" ? now : null
        })
        .where(eq(expeditionBookings.id, bookingTransaction.bookingId));

      if (status === "paid" && bookingTransaction.previousStatus !== "paid") {
        await tx
          .update(expeditionDepartures)
          .set({
            seatsBooked: sql`${expeditionDepartures.seatsBooked} + ${bookingTransaction.participantsCount}`
          })
          .where(eq(expeditionDepartures.id, bookingTransaction.departureId));
      }
    });

    return NextResponse.json({ ok: true, type: "expedition" });
  }

  return NextResponse.json({ error: "Reference not found." }, { status: 404 });
}
