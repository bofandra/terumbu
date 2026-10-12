import { randomUUID } from "node:crypto";

import { eq, inArray } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import {
  expeditionBookingPayments, expeditionBookings, expeditionDepartures,
  expeditions, paymentOperations
} from "../../src/db/schema";
import { applyVerifiedMidtransStatus } from "../../src/lib/midtrans-settlement";

test("simultaneous verified settlements compete for one seat without overselling or stale-status reversal", async () => {
  test.setTimeout(120_000);
  const previousFlag = process.env.MIDTRANS_PAYMENT_ENABLED;
  // Use synthetic verified provider observations; explicitly disable external
  // Midtrans compensation GET/refund calls for deterministic CI.
  process.env.MIDTRANS_PAYMENT_ENABLED = "false";

  let departureId: string | null = null;
  const ids: string[] = [];
  const providerReferences: string[] = [];
  try {
    const [expedition] = await db.select({ id: expeditions.id })
      .from(expeditions).where(eq(expeditions.slug, "raja-ampat-coral-restoration")).limit(1);
    expect(expedition).toBeTruthy();
    const startsAt = new Date(Date.now() + 90 * 86400_000);
    const [departure] = await db.insert(expeditionDepartures).values({
      expeditionId: expedition.id,
      startsAt, endsAt: new Date(startsAt.getTime() + 3 * 86400_000),
      capacity: 1, seatsBooked: 0, status: "open"
    }).returning({ id: expeditionDepartures.id });
    departureId = departure.id;

    // Provider delivery can be delayed until both inventory holds have expired.
    // The durable compensating case must then protect the losing payment.
    for (let i = 0; i < 2; i++) {
      const providerReference = "TRB-EXP-" + randomUUID();
      const [booking] = await db.insert(expeditionBookings).values({
        expeditionId: expedition.id, departureId: departure.id,
        bookingCode: "E2E-SETTLE-" + randomUUID(),
        contactName: "Simultaneous traveler",
        contactEmail: "concurrent@example.org",
        participantsCount: 1, totalAmount: "100000.00", currency: "IDR",
        status: "pending_payment", paymentStatus: "pending",
        bookedAt: new Date(Date.now() - 40 * 60_000),
        holdExpiresAt: new Date(Date.now() - 10 * 60_000)
      }).returning({ id: expeditionBookings.id });
      ids.push(booking.id);
      providerReferences.push(providerReference);
      await db.insert(expeditionBookingPayments).values({
        bookingId: booking.id, provider: "midtrans",
        providerReference, status: "pending"
      });
    }

    const providerStatus = (orderId: string, transactionStatus: string) => ({
      order_id: orderId,
      gross_amount: "100000.00",
      currency: "IDR",
      payment_type: "gopay",
      transaction_status: transactionStatus
    });

    const settled = await Promise.all(providerReferences.map(orderId =>
      applyVerifiedMidtransStatus(orderId, providerStatus(orderId, "settlement"))
    ));
    expect(settled.map(x => x.status).sort())
      .toEqual(["capacity_unavailable", "updated"]);

    const bookings = await db.select({
      id: expeditionBookings.id,
      status: expeditionBookings.status,
      paymentStatus: expeditionBookings.paymentStatus
    }).from(expeditionBookings).where(inArray(expeditionBookings.id, ids));
    const winners = bookings.filter(x => x.status === "confirmed" && x.paymentStatus === "paid");
    const losers = bookings.filter(x => x.status === "pending_payment" && x.paymentStatus === "pending");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    const winnerOrder = providerReferences[ids.indexOf(winners[0].id)];
    const loserOrder = providerReferences[ids.indexOf(losers[0].id)];

    const cases = await db.select({
      id: paymentOperations.id, bookingId: paymentOperations.bookingId,
      status: paymentOperations.status
    }).from(paymentOperations)
      .where(eq(paymentOperations.operationType, "midtrans_capacity_conflict"));
    const currentCases = cases.filter(x => x.bookingId === losers[0].id);
    expect(currentCases).toHaveLength(1);
    expect(currentCases[0].status).toBe("pending");

    // Duplicate provider deliveries and stale out-of-order terminal / pending
    // statuses must not roll a paid seat backward or mint a second incident.
    for (const state of ["pending", "deny", "expire", "settlement"]) {
      const observed = await applyVerifiedMidtransStatus(winnerOrder, providerStatus(winnerOrder, state));
      expect(observed.status).toBe("unchanged");
    }
    for (let retry = 0; retry < 2; retry++) {
      const repeat = await applyVerifiedMidtransStatus(loserOrder, providerStatus(loserOrder, "settlement"));
      expect(repeat.status).toBe("capacity_unavailable");
    }

    const [departureAfter] = await db.select({
      booked: expeditionDepartures.seatsBooked, status: expeditionDepartures.status
    }).from(expeditionDepartures).where(eq(expeditionDepartures.id, departure.id));
    expect(departureAfter.booked).toBe(1);
    expect(departureAfter.status).toBe("full");

    const [winnerAfter] = await db.select({
      status: expeditionBookings.status, paymentStatus: expeditionBookings.paymentStatus
    }).from(expeditionBookings).where(eq(expeditionBookings.id, winners[0].id));
    expect(winnerAfter).toEqual({ status: "confirmed", paymentStatus: "paid" });
    const unresolved = await db.select({ id: paymentOperations.id })
      .from(paymentOperations).where(eq(paymentOperations.bookingId, losers[0].id));
    expect(unresolved.filter(x => x.id === currentCases[0].id)).toHaveLength(1);
  } finally {
    if (ids.length) {
      await db.delete(paymentOperations).where(inArray(paymentOperations.bookingId, ids));
      await db.delete(expeditionBookings).where(inArray(expeditionBookings.id, ids));
    }
    if (departureId) {
      await db.delete(expeditionDepartures).where(eq(expeditionDepartures.id, departureId));
    }
    if (previousFlag === undefined) delete process.env.MIDTRANS_PAYMENT_ENABLED;
    else process.env.MIDTRANS_PAYMENT_ENABLED = previousFlag;
  }
});
