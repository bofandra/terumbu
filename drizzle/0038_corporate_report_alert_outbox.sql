ALTER TABLE "email_logs" ADD COLUMN "delivery_key" varchar(180);
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN "next_retry_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN "claimed_until" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN "provider_message_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN "delivery_error" varchar(120);
--> statement-breakpoint
ALTER TABLE "email_logs" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "email_logs_delivery_key_idx" ON "email_logs" USING btree ("delivery_key");
--> statement-breakpoint
CREATE INDEX "email_logs_outbox_queue_idx" ON "email_logs" USING btree ("template","status","next_retry_at");
