-- Pending Midtrans bookings hold capacity until the deadline.
ALTER TABLE "expedition_bookings"
  ADD COLUMN "hold_expires_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "expedition_bookings_active_holds_idx"
  ON "expedition_bookings" ("departure_id", "hold_expires_at")
  WHERE "hold_expires_at" IS NOT NULL AND "payment_status" IN ('created','pending');
