CREATE TABLE "donation_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid,
	"payment_method_id" uuid,
	"donor_name" varchar(160) NOT NULL,
	"donor_email" varchar(255) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"interval" varchar(40) DEFAULT 'month' NOT NULL,
	"status" varchar(80) DEFAULT 'incomplete' NOT NULL,
	"provider" varchar(80) DEFAULT 'demo_gateway' NOT NULL,
	"provider_subscription_reference" varchar(255) NOT NULL,
	"started_at" timestamp with time zone,
	"next_billing_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_code" varchar(120) NOT NULL,
	"operation_type" varchar(80) NOT NULL,
	"entity_type" varchar(80) NOT NULL,
	"donation_id" uuid,
	"booking_id" uuid,
	"subscription_id" uuid,
	"requested_by_user_id" uuid,
	"processed_by_user_id" uuid,
	"status" varchar(80) DEFAULT 'pending' NOT NULL,
	"amount" numeric(14, 2),
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"provider" varchar(80) DEFAULT 'demo_gateway' NOT NULL,
	"provider_reference" varchar(255),
	"reason" text,
	"metadata" jsonb,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(80) DEFAULT 'demo_gateway' NOT NULL,
	"provider_payment_method_id" varchar(255) NOT NULL,
	"label" varchar(160) NOT NULL,
	"brand" varchar(80) DEFAULT 'Demo Card' NOT NULL,
	"last4" varchar(4) NOT NULL,
	"exp_month" integer,
	"exp_year" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" varchar(80) DEFAULT 'active' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "idempotency_key" varchar(160);--> statement-breakpoint
ALTER TABLE "expedition_booking_payments" ADD COLUMN "payment_method_id" uuid;--> statement-breakpoint
ALTER TABLE "expedition_bookings" ADD COLUMN "idempotency_key" varchar(160);--> statement-breakpoint
ALTER TABLE "impact_passport_items" ADD COLUMN "source_type" varchar(80);--> statement-breakpoint
ALTER TABLE "impact_passport_items" ADD COLUMN "source_id" uuid;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD COLUMN "payment_method_id" uuid;--> statement-breakpoint
ALTER TABLE "sponsored_ecosystems" ADD COLUMN "donation_id" uuid;--> statement-breakpoint
ALTER TABLE "donation_subscriptions" ADD CONSTRAINT "donation_subscriptions_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_subscriptions" ADD CONSTRAINT "donation_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_subscriptions" ADD CONSTRAINT "donation_subscriptions_payment_method_id_user_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."user_payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_operations" ADD CONSTRAINT "payment_operations_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_operations" ADD CONSTRAINT "payment_operations_booking_id_expedition_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."expedition_bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_operations" ADD CONSTRAINT "payment_operations_subscription_id_donation_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."donation_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_operations" ADD CONSTRAINT "payment_operations_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_operations" ADD CONSTRAINT "payment_operations_processed_by_user_id_users_id_fk" FOREIGN KEY ("processed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_payment_methods" ADD CONSTRAINT "user_payment_methods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "donation_subscriptions_campaign_idx" ON "donation_subscriptions" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "donation_subscriptions_user_idx" ON "donation_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "donation_subscriptions_provider_idx" ON "donation_subscriptions" USING btree ("provider","provider_subscription_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_operations_code_idx" ON "payment_operations" USING btree ("operation_code");--> statement-breakpoint
CREATE INDEX "payment_operations_donation_idx" ON "payment_operations" USING btree ("donation_id");--> statement-breakpoint
CREATE INDEX "payment_operations_booking_idx" ON "payment_operations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payment_operations_subscription_idx" ON "payment_operations" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "payment_operations_status_idx" ON "payment_operations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_payment_methods_user_idx" ON "user_payment_methods" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_payment_methods_provider_idx" ON "user_payment_methods" USING btree ("provider","provider_payment_method_id");--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_subscription_id_donation_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."donation_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_booking_payments" ADD CONSTRAINT "expedition_booking_payments_payment_method_id_user_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."user_payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_payment_method_id_user_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."user_payment_methods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsored_ecosystems" ADD CONSTRAINT "sponsored_ecosystems_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "donations_idempotency_idx" ON "donations" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_bookings_idempotency_idx" ON "expedition_bookings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "impact_passport_items_source_idx" ON "impact_passport_items" USING btree ("passport_id","source_type","source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sponsored_ecosystems_donation_idx" ON "sponsored_ecosystems" USING btree ("donation_id");