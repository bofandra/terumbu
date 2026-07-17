CREATE TABLE "corporate_employee_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "corporate_account_id" uuid NOT NULL,
  "program_id" uuid NOT NULL,
  "created_by_user_id" uuid,
  "title" varchar(220) NOT NULL,
  "event_type" varchar(80) DEFAULT 'volunteer' NOT NULL,
  "status" varchar(80) DEFAULT 'draft' NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "location" varchar(220),
  "capacity" integer DEFAULT 40 NOT NULL,
  "waitlist_enabled" boolean DEFAULT true NOT NULL,
  "description" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corporate_employee_events" ADD CONSTRAINT "corporate_employee_events_account_fk" FOREIGN KEY ("corporate_account_id") REFERENCES "public"."corporate_accounts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "corporate_employee_events" ADD CONSTRAINT "corporate_employee_events_program_id_corporate_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."corporate_programs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "corporate_employee_events" ADD CONSTRAINT "corporate_employee_events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "corporate_employee_events_account_idx" ON "corporate_employee_events" USING btree ("corporate_account_id");
--> statement-breakpoint
CREATE INDEX "corporate_employee_events_program_idx" ON "corporate_employee_events" USING btree ("program_id");
--> statement-breakpoint
CREATE INDEX "corporate_employee_events_starts_at_idx" ON "corporate_employee_events" USING btree ("starts_at");
--> statement-breakpoint
CREATE INDEX "corporate_employee_events_status_idx" ON "corporate_employee_events" USING btree ("status");
--> statement-breakpoint
CREATE TABLE "corporate_employee_event_registrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "registered_by_user_id" uuid,
  "status" varchar(80) DEFAULT 'registered' NOT NULL,
  "checked_in_at" timestamp with time zone,
  "attendance_hours" numeric(8, 2) DEFAULT '0' NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "corporate_employee_event_registrations" ADD CONSTRAINT "corporate_employee_event_registrations_event_id_corporate_employee_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."corporate_employee_events"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "corporate_employee_event_registrations" ADD CONSTRAINT "corporate_employee_event_registrations_employee_id_corporate_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."corporate_employees"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "corporate_employee_event_registrations" ADD CONSTRAINT "corporate_employee_event_registrations_registered_by_user_id_users_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_event_registrations_event_employee_idx" ON "corporate_employee_event_registrations" USING btree ("event_id","employee_id");
--> statement-breakpoint
CREATE INDEX "corporate_event_registrations_event_status_idx" ON "corporate_employee_event_registrations" USING btree ("event_id","status");
--> statement-breakpoint
CREATE INDEX "corporate_event_registrations_employee_idx" ON "corporate_employee_event_registrations" USING btree ("employee_id");
