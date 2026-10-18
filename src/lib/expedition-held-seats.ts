import { sql } from "drizzle-orm";

/**
 * Temporary seats held by pending-payment bookings that have not expired.
 * Applied consistently to marketplace discovery and publication readiness.
 * Explicitly qualify the outer expedition_departures.id in the correlated query.
 */
export const pendingPaymentHeldSeats = sql<number>`coalesce((select sum(b.participants_count) from expedition_bookings b where b.departure_id = expedition_departures.id and b.status = 'pending_payment' and b.payment_status in ('created', 'pending') and b.hold_expires_at > now()), 0)::int`;
