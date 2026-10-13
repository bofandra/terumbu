import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import {
  expeditionBookingPayments, expeditionBookings, expeditionDepartures, expeditions,
  midtransReconciliationChecks, paymentOperations
} from "../../src/db/schema";
import { processMissingMidtransWebhooks } from "../../src/lib/midtrans-reconciliation";

test("webhook-free settlement recovers and ten-day-old provider failure alerts once", async ({ request }) => {
  test.setTimeout(120_000);
  expect((await request.post("/api/cron/midtrans-reconciliation")).status()).toBe(401);
  const [expedition] = await db.select({ id: expeditions.id }).from(expeditions)
    .where(eq(expeditions.slug, "raja-ampat-coral-restoration")).limit(1);
  expect(expedition).toBeTruthy();

  let departureId: string | null = null;
  const successfulOrderId = "TRB-EXP-" + randomUUID();
  const missingOrderId = "TRB-EXP-" + randomUUID();
  const bookingIds: string[] = [];
  try {
    const starts = new Date(Date.now() + 90 * 86400_000);
    const [departure] = await db.insert(expeditionDepartures).values({
      expeditionId: expedition.id, startsAt: starts,
      endsAt: new Date(starts.getTime() + 3 * 86400_000),
      capacity: 2, seatsBooked: 0, status: "open"
    }).returning({ id: expeditionDepartures.id });
    departureId = departure.id;

    for (const orderId of [successfulOrderId, missingOrderId]) {
      const submittedAt = new Date(Date.now() - (orderId === missingOrderId ? 10 * 24 * 60 : 12) * 60_000);
      const [booking] = await db.insert(expeditionBookings).values({
        expeditionId: expedition.id, departureId,
        bookingCode: "E2E-RECON-" + randomUUID(),
        contactName: "Reconciled payment",
        contactEmail: "reconciliation@example.org",
        participantsCount: 1, totalAmount: "100000.00", currency: "IDR",
        status: "pending_payment", paymentStatus: "pending",
        bookedAt: submittedAt,
        holdExpiresAt: new Date(submittedAt.getTime() + 20 * 60_000)
      }).returning({ id: expeditionBookings.id });
      bookingIds.push(booking.id);
      await db.insert(expeditionBookingPayments).values({
        bookingId: booking.id, provider: "midtrans", providerReference: orderId,
        status: "pending", createdAt: submittedAt
      });
    }

    let providerFetches = 0;
    const mockFetch = (async (input: string | URL | Request) => {
      providerFetches++;
      if (!String(input).endsWith("/" + successfulOrderId + "/status")) {
        throw new Error("Simulated missing provider response.");
      }
      return new Response(JSON.stringify({
        order_id: successfulOrderId,
        transaction_status: "settlement",
        gross_amount: "100000.00",
        payment_type: "gopay",
        currency: "IDR"
      }), { status: 200 });
    }) as typeof fetch;
    const config = { mode: "sandbox" as const, serverKey: "SB-Mid-e2e" };
    const first = await processMissingMidtransWebhooks(new Date(), { config, fetcher: mockFetch });
    expect(first.scanned).toBeGreaterThanOrEqual(2);
    expect(first.updated).toBeGreaterThanOrEqual(1);
    expect(first.failed).toBeGreaterThanOrEqual(1);
    expect(first.attention).toBeGreaterThanOrEqual(1);
    expect(providerFetches).toBeGreaterThanOrEqual(2);

    const [confirmed] = await db.select({
      status: expeditionBookings.status, paymentStatus: expeditionBookings.paymentStatus
    }).from(expeditionBookings).where(eq(expeditionBookings.id, bookingIds[0])).limit(1);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.paymentStatus).toBe("paid");
    const [seats] = await db.select({ booked: expeditionDepartures.seatsBooked })
      .from(expeditionDepartures).where(eq(expeditionDepartures.id, departure.id)).limit(1);
    expect(seats.booked).toBe(1);

    const [problem] = await db.select({ status: expeditionBookings.paymentStatus })
      .from(expeditionBookings).where(eq(expeditionBookings.id, bookingIds[1])).limit(1);
    expect(problem.status).toBe("pending");
    const cases = await db.select({ id: paymentOperations.id })
      .from(paymentOperations).where(and(
        eq(paymentOperations.operationType, "midtrans_reconciliation_attention"),
        eq(paymentOperations.providerReference, missingOrderId)
      ));
    expect(cases).toHaveLength(1);

    // A retry can see the same pending payment; case creation must stay unique.
    await db.update(midtransReconciliationChecks)
      .set({ lastCheckedAt: new Date(Date.now() - 25 * 60 * 60_000) })
      .where(eq(midtransReconciliationChecks.providerReference, missingOrderId));
    await processMissingMidtransWebhooks(new Date(), { config, fetcher: mockFetch });
    const repeatedCases = await db.select({ id: paymentOperations.id })
      .from(paymentOperations).where(eq(paymentOperations.providerReference, missingOrderId));
    expect(repeatedCases.filter((item) => item.id === cases[0].id)).toHaveLength(1);
    const [sameSeats] = await db.select({ booked: expeditionDepartures.seatsBooked })
      .from(expeditionDepartures).where(eq(expeditionDepartures.id, departure.id)).limit(1);
    expect(sameSeats.booked).toBe(1);
  } finally {
    await db.delete(midtransReconciliationChecks)
      .where(inArray(midtransReconciliationChecks.providerReference, [successfulOrderId, missingOrderId]));
    await db.delete(paymentOperations)
      .where(inArray(paymentOperations.providerReference, [successfulOrderId, missingOrderId]));
    if (bookingIds.length) {
      await db.delete(expeditionBookings).where(inArray(expeditionBookings.id, bookingIds));
    }
    if (departureId) await db.delete(expeditionDepartures).where(eq(expeditionDepartures.id, departureId));
  }
});
