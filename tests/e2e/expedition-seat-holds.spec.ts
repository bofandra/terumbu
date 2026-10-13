import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";

import { db } from "../../src/db/client";
import { expeditionBookings, expeditionBookingPayments, expeditionDepartures, expeditions } from "../../src/db/schema";
import {
  activeExpeditionHeldSeats,
  canAcquireExpeditionHold,
  expeditionHoldExpiresAt
} from "../../src/lib/expedition-seat-holds";
import { transitionExpeditionBookingPayment } from "../../src/lib/payment-workflows";

test("concurrent holds serialize and prevent manual confirmation until expiration", async () => {
  test.setTimeout(120_000);
  let departureId: string | null = null;
  try {
    const [expedition] = await db.select({ id: expeditions.id })
      .from(expeditions).where(eq(expeditions.slug, "raja-ampat-coral-restoration")).limit(1);
    expect(expedition?.id).toBeTruthy();
    const starts = new Date(Date.now() + 90 * 86400_000);
    const ends = new Date(starts.getTime() + 3 * 86400_000);
    const [departure] = await db.insert(expeditionDepartures).values({
      expeditionId: expedition.id,
      startsAt: starts, endsAt: ends, capacity: 1, seatsBooked: 0, status: "open"
    }).returning({ id: expeditionDepartures.id });
    departureId = departure.id;

    const createHold = () => db.transaction(async (tx) => {
      const now = new Date();
      const canHold = await canAcquireExpeditionHold(tx as unknown as typeof db, {
        departureId: departure.id, participantsCount: 1, now
      });
      if (!canHold) return null;
      const [booking] = await tx.insert(expeditionBookings).values({
        expeditionId: expedition.id, departureId: departure.id,
        bookingCode: "E2E-HOLD-" + randomUUID(),
        contactName: "Held seat", contactEmail: "test@example.org",
        participantsCount: 1, totalAmount: "100000.00", currency: "IDR",
        status: "pending_payment", paymentStatus: "created",
        bookedAt: now, holdExpiresAt: expeditionHoldExpiresAt(now)
      }).returning({ id: expeditionBookings.id });
      return booking.id;
    });

    const [one, two] = await Promise.all([createHold(), createHold()]);
    expect([one, two].filter(Boolean)).toHaveLength(1);
    expect(await activeExpeditionHeldSeats(db, departure.id, new Date())).toBe(1);

    const code = "E2E-MANUAL-" + randomUUID();
    const [manual] = await db.insert(expeditionBookings).values({
      expeditionId: expedition.id, departureId: departure.id,
      bookingCode: code,
      contactName: "Manual traveler", contactEmail: "test@example.org",
      participantsCount: 1, totalAmount: "100000.00", currency: "IDR",
      status: "pending_payment", paymentStatus: "pending", bookedAt: new Date()
    }).returning({ id: expeditionBookings.id });
    await db.insert(expeditionBookingPayments).values({
      bookingId: manual.id, provider: "manual_external", providerReference: code, status: "pending"
    });

    await assert.rejects(
      db.transaction((tx) => transitionExpeditionBookingPayment(tx as unknown as typeof db, {
        bookingId: manual.id, nextStatus: "paid", providerReference: code
      })),
      /EXPEDITION_CAPACITY_UNAVAILABLE/
    );
    const [before] = await db.select({ seats: expeditionDepartures.seatsBooked })
      .from(expeditionDepartures).where(eq(expeditionDepartures.id, departure.id)).limit(1);
    expect(before.seats).toBe(0);

    const heldId = one ?? two!;
    await db.update(expeditionBookings).set({ holdExpiresAt: new Date(0) })
      .where(eq(expeditionBookings.id, heldId));
    expect(await activeExpeditionHeldSeats(db, departure.id, new Date())).toBe(0);

    await db.transaction((tx) => transitionExpeditionBookingPayment(tx as unknown as typeof db, {
      bookingId: manual.id, nextStatus: "paid", providerReference: code
    }));
    const [after] = await db.select({ seats: expeditionDepartures.seatsBooked })
      .from(expeditionDepartures).where(eq(expeditionDepartures.id, departure.id)).limit(1);
    expect(after.seats).toBe(1);
    expect(await db.transaction((tx) => canAcquireExpeditionHold(tx as unknown as typeof db, {
      departureId: departure.id, participantsCount: 1, now: new Date()
    }))).toBe(false);
  } finally {
    if (departureId) {
      await db.delete(expeditionBookings).where(eq(expeditionBookings.departureId, departureId));
      await db.delete(expeditionDepartures).where(eq(expeditionDepartures.id, departureId));
    }
  }
});
