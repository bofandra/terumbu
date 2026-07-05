CREATE TABLE "expedition_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expedition_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"user_id" uuid,
	"rating" integer NOT NULL,
	"title" varchar(160),
	"body" text NOT NULL,
	"status" varchar(80) DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expedition_reviews" ADD CONSTRAINT "expedition_reviews_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_reviews" ADD CONSTRAINT "expedition_reviews_booking_id_expedition_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."expedition_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_reviews" ADD CONSTRAINT "expedition_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_reviews_booking_idx" ON "expedition_reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "expedition_reviews_expedition_idx" ON "expedition_reviews" USING btree ("expedition_id");--> statement-breakpoint
CREATE INDEX "expedition_reviews_user_idx" ON "expedition_reviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expedition_reviews_status_idx" ON "expedition_reviews" USING btree ("status");