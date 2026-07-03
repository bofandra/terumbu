import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import {
  expeditionBookingPayments,
  paymentTransactions
} from "@/db/schema";
import { transitionDonationPayment, transitionExpeditionBookingPayment } from "@/lib/payment-workflows";

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
      donationId: paymentTransactions.donationId
    })
    .from(paymentTransactions)
    .where(eq(paymentTransactions.providerReference, providerReference))
    .limit(1);

  if (donationTransaction?.donationId) {
    const donationId = donationTransaction.donationId;

    await db.transaction(async (tx) => {
      await transitionDonationPayment(tx as unknown as typeof db, {
        donationId,
        nextStatus: status,
        providerReference,
        providerPayload: payload,
        operationType: "webhook",
        now
      });
    });

    return NextResponse.json({ ok: true, type: "donation" });
  }

  const [bookingTransaction] = await db
    .select({
      bookingId: expeditionBookingPayments.bookingId
    })
    .from(expeditionBookingPayments)
    .where(eq(expeditionBookingPayments.providerReference, providerReference))
    .limit(1);

  if (bookingTransaction) {
    await db.transaction(async (tx) => {
      await transitionExpeditionBookingPayment(tx as unknown as typeof db, {
        bookingId: bookingTransaction.bookingId,
        nextStatus: status,
        providerReference,
        providerPayload: payload,
        operationType: "webhook",
        now
      });
    });

    return NextResponse.json({ ok: true, type: "expedition" });
  }

  return NextResponse.json({ error: "Reference not found." }, { status: 404 });
}
