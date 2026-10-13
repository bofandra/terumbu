import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { expeditionBookings, expeditionDepartures } from "@/db/schema";

export const MIDTRANS_EXPEDITION_PAYMENT_MINUTES = 15;
export const MIDTRANS_EXPEDITION_HOLD_BUFFER_MINUTES = 5;
export const MIDTRANS_EXPEDITION_HOLD_MINUTES =
  MIDTRANS_EXPEDITION_PAYMENT_MINUTES + MIDTRANS_EXPEDITION_HOLD_BUFFER_MINUTES;

/**
 * The expiry is persisted per booking. Expired holds no longer consume inventory
 * even if the payment provider never delivers an expiry webhook.
 */
export function expeditionHoldExpiresAt(now = new Date()) {
  return new Date(now.getTime() + MIDTRANS_EXPEDITION_HOLD_MINUTES * 60_000);
}

export function midtransJakartaStartTime(now = new Date()) {
  // Indonesia's WIB zone is UTC+07:00 all year; Snap expects this exact format.
  return new Date(now.getTime() + 7 * 60 * 60_000).toISOString().slice(0, 19).replace("T", " ") + " +0700";
}

export async function activeExpeditionHeldSeats(
  database: typeof db,
  departureId: string,
  now: Date,
  excludeBookingId?: string
) {
  const [row] = await database
    .select({ seats: sql<string>`coalesce(sum(${expeditionBookings.participantsCount}), 0)::text` })
    .from(expeditionBookings)
    .where(and(
      eq(expeditionBookings.departureId, departureId),
      gt(expeditionBookings.holdExpiresAt, now),
      inArray(expeditionBookings.paymentStatus, ["created", "pending"]),
      eq(expeditionBookings.status, "pending_payment"),
      ...(excludeBookingId ? [ne(expeditionBookings.id, excludeBookingId)] : [])
    ));
  return Number(row?.seats ?? 0);
}

/**
 * Must be called INSIDE the same transaction that creates the booking hold.
 * The shared departure row lock serializes both hold creation and confirmed
 * seat allocation (which also obtains the lock before counting other holds).
 */
export async function canAcquireExpeditionHold(
  database: typeof db,
  input: { departureId: string; participantsCount: number; now: Date }
) {
  const [departure] = await database.select({
    capacity: expeditionDepartures.capacity,
    seatsBooked: expeditionDepartures.seatsBooked,
    status: expeditionDepartures.status,
    startsAt: expeditionDepartures.startsAt
  }).from(expeditionDepartures)
    .where(eq(expeditionDepartures.id, input.departureId))
    .limit(1).for("update");

  if (!departure || departure.status !== "open" || departure.startsAt <= input.now ||
      !Number.isInteger(input.participantsCount) || input.participantsCount < 1) {
    return false;
  }

  const holds = await activeExpeditionHeldSeats(database, input.departureId, input.now);
  return departure.seatsBooked + holds + input.participantsCount <= departure.capacity;
}
