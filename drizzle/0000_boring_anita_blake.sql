CREATE TYPE "public"."booking_status" AS ENUM('draft', 'pending_payment', 'confirmed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'review', 'published', 'funded', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('active', 'completed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('submitted', 'in_review', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('created', 'pending', 'paid', 'failed', 'expired', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."verification_level" AS ENUM('basic', 'document', 'field');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(160) NOT NULL,
	"entity_type" varchar(120) NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"status" varchar(80) NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "campaign_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"title" varchar(220) NOT NULL,
	"body" text NOT NULL,
	"image_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" varchar(220) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"summary" text NOT NULL,
	"story" text,
	"category" varchar(80) NOT NULL,
	"region" varchar(120) NOT NULL,
	"image_url" text,
	"goal_amount" numeric(14, 2) NOT NULL,
	"raised_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"donor_count" integer DEFAULT 0 NOT NULL,
	"impact_unit" varchar(120) NOT NULL,
	"impact_target" integer NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corporate_account_id" uuid NOT NULL,
	"user_id" uuid,
	"email" varchar(255) NOT NULL,
	"name" varchar(160) NOT NULL,
	"department" varchar(120),
	"role" varchar(120) DEFAULT 'member' NOT NULL,
	"status" varchar(80) DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_evidence_center" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"evidence_id" uuid NOT NULL,
	"visibility" varchar(80) DEFAULT 'internal' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corporate_account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" varchar(120) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_program_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"category" varchar(120) NOT NULL,
	"allocated_amount" numeric(14, 2) NOT NULL,
	"spent_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "corporate_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corporate_account_id" uuid NOT NULL,
	"name" varchar(220) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"budget_amount" numeric(14, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"status" varchar(80) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_project_portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"allocation_amount" numeric(14, 2) NOT NULL,
	"status" varchar(80) DEFAULT 'funded' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_report_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"requested_by_user_id" uuid,
	"export_code" varchar(120) NOT NULL,
	"status" varchar(80) DEFAULT 'queued' NOT NULL,
	"file_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" varchar(220) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"passing_score" integer DEFAULT 80 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"enrollment_id" uuid,
	"certificate_number" varchar(120) NOT NULL,
	"public_slug" varchar(180) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" "enrollment_status" DEFAULT 'active' NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "course_lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" varchar(220) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"position" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(220) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"level" varchar(80) NOT NULL,
	"duration_minutes" integer NOT NULL,
	"summary" text NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donation_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donation_id" uuid NOT NULL,
	"receipt_number" varchar(120) NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"emailed_at" timestamp with time zone,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid,
	"donor_name" varchar(160),
	"donor_email" varchar(255),
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"recipient_email" varchar(255) NOT NULL,
	"subject" varchar(220) NOT NULL,
	"template" varchar(120) NOT NULL,
	"status" varchar(80) DEFAULT 'queued' NOT NULL,
	"payload" jsonb,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedition_booking_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" varchar(80) NOT NULL,
	"provider_reference" varchar(255) NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedition_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expedition_id" uuid NOT NULL,
	"departure_id" uuid NOT NULL,
	"user_id" uuid,
	"booking_code" varchar(120) NOT NULL,
	"contact_name" varchar(160) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"participants_count" integer NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'IDR' NOT NULL,
	"status" "booking_status" DEFAULT 'pending_payment' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'created' NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "expedition_departures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"expedition_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"seats_booked" integer DEFAULT 0 NOT NULL,
	"status" varchar(80) DEFAULT 'open' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expedition_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"full_name" varchar(160) NOT NULL,
	"email" varchar(255),
	"phone" varchar(80),
	"emergency_contact" varchar(220),
	"dietary_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expeditions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(220) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"region" varchar(120) NOT NULL,
	"duration_days" integer NOT NULL,
	"base_price" numeric(14, 2) NOT NULL,
	"summary" text NOT NULL,
	"image_url" text,
	"related_campaign_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_passport_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"passport_id" uuid NOT NULL,
	"item_type" varchar(80) NOT NULL,
	"title" varchar(220) NOT NULL,
	"description" text,
	"evidence_url" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "impact_passports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"public_slug" varchar(180) NOT NULL,
	"visibility" varchar(40) DEFAULT 'private' NOT NULL,
	"story" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "impact_sites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"name" varchar(180) NOT NULL,
	"ecosystem_type" varchar(80) NOT NULL,
	"region" varchar(120) NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"lesson_id" uuid NOT NULL,
	"status" varchar(80) DEFAULT 'not_started' NOT NULL,
	"completed_at" timestamp with time zone,
	"score" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"type" varchar(80) NOT NULL,
	"logo_url" text,
	"website_url" text,
	"description" text,
	"verification" "verification_level" DEFAULT 'basic' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"donation_id" uuid,
	"provider" varchar(80) NOT NULL,
	"provider_reference" varchar(255) NOT NULL,
	"status" "payment_status" DEFAULT 'created' NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"location" varchar(160),
	"bio" text,
	"hero_level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"impact_site_id" uuid,
	"uploaded_by_user_id" uuid,
	"evidence_code" varchar(120) NOT NULL,
	"title" varchar(220) NOT NULL,
	"evidence_type" varchar(80) NOT NULL,
	"file_url" text NOT NULL,
	"storage_provider" varchar(80) DEFAULT 'local_demo' NOT NULL,
	"verification_status" "evidence_status" DEFAULT 'submitted' NOT NULL,
	"verified_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsored_ecosystems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"campaign_id" uuid NOT NULL,
	"impact_site_id" uuid,
	"code" varchar(80) NOT NULL,
	"label" varchar(160) NOT NULL,
	"status" varchar(80) DEFAULT 'growing' NOT NULL,
	"planted_at" timestamp with time zone,
	"last_updated_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(160),
	"password_hash" text,
	"image_url" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_course_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."course_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_updates" ADD CONSTRAINT "campaign_updates_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_corporate_account_id_corporate_accounts_id_fk" FOREIGN KEY ("corporate_account_id") REFERENCES "public"."corporate_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_employees" ADD CONSTRAINT "corporate_employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_evidence_center" ADD CONSTRAINT "corporate_evidence_center_program_id_corporate_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."corporate_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_evidence_center" ADD CONSTRAINT "corporate_evidence_center_evidence_id_project_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."project_evidence"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_permissions" ADD CONSTRAINT "corporate_permissions_corporate_account_id_corporate_accounts_id_fk" FOREIGN KEY ("corporate_account_id") REFERENCES "public"."corporate_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_permissions" ADD CONSTRAINT "corporate_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_program_budgets" ADD CONSTRAINT "corporate_program_budgets_program_id_corporate_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."corporate_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_programs" ADD CONSTRAINT "corporate_programs_corporate_account_id_corporate_accounts_id_fk" FOREIGN KEY ("corporate_account_id") REFERENCES "public"."corporate_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_project_portfolio" ADD CONSTRAINT "corporate_project_portfolio_program_id_corporate_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."corporate_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_project_portfolio" ADD CONSTRAINT "corporate_project_portfolio_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD CONSTRAINT "corporate_report_exports_program_id_corporate_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."corporate_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_report_exports" ADD CONSTRAINT "corporate_report_exports_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_assessments" ADD CONSTRAINT "course_assessments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_certificates" ADD CONSTRAINT "course_certificates_enrollment_id_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_receipts" ADD CONSTRAINT "donation_receipts_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_booking_payments" ADD CONSTRAINT "expedition_booking_payments_booking_id_expedition_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."expedition_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_bookings" ADD CONSTRAINT "expedition_bookings_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_bookings" ADD CONSTRAINT "expedition_bookings_departure_id_expedition_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."expedition_departures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_bookings" ADD CONSTRAINT "expedition_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_departures" ADD CONSTRAINT "expedition_departures_expedition_id_expeditions_id_fk" FOREIGN KEY ("expedition_id") REFERENCES "public"."expeditions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expedition_participants" ADD CONSTRAINT "expedition_participants_booking_id_expedition_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."expedition_bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_related_campaign_id_campaigns_id_fk" FOREIGN KEY ("related_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_passport_items" ADD CONSTRAINT "impact_passport_items_passport_id_impact_passports_id_fk" FOREIGN KEY ("passport_id") REFERENCES "public"."impact_passports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_passports" ADD CONSTRAINT "impact_passports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "impact_sites" ADD CONSTRAINT "impact_sites_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_enrollment_id_course_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."course_enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_course_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "public"."donations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_impact_site_id_impact_sites_id_fk" FOREIGN KEY ("impact_site_id") REFERENCES "public"."impact_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsored_ecosystems" ADD CONSTRAINT "sponsored_ecosystems_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsored_ecosystems" ADD CONSTRAINT "sponsored_ecosystems_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsored_ecosystems" ADD CONSTRAINT "sponsored_ecosystems_impact_site_id_impact_sites_id_fk" FOREIGN KEY ("impact_site_id") REFERENCES "public"."impact_sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_account_idx" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_attempts_assessment_user_idx" ON "assessment_attempts" USING btree ("assessment_id","user_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_user_idx" ON "assessment_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "campaign_updates_campaign_idx" ON "campaign_updates" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaigns_slug_idx" ON "campaigns" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "campaigns_status_idx" ON "campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "campaigns_category_idx" ON "campaigns" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_accounts_slug_idx" ON "corporate_accounts" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_employees_account_email_idx" ON "corporate_employees" USING btree ("corporate_account_id","email");--> statement-breakpoint
CREATE INDEX "corporate_employees_account_idx" ON "corporate_employees" USING btree ("corporate_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_evidence_center_unique_idx" ON "corporate_evidence_center" USING btree ("program_id","evidence_id");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_permissions_unique_idx" ON "corporate_permissions" USING btree ("corporate_account_id","user_id","permission");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_program_budgets_category_idx" ON "corporate_program_budgets" USING btree ("program_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_programs_slug_idx" ON "corporate_programs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "corporate_programs_account_idx" ON "corporate_programs" USING btree ("corporate_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_project_portfolio_unique_idx" ON "corporate_project_portfolio" USING btree ("program_id","campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_report_exports_code_idx" ON "corporate_report_exports" USING btree ("export_code");--> statement-breakpoint
CREATE INDEX "corporate_report_exports_program_idx" ON "corporate_report_exports" USING btree ("program_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_assessments_course_slug_idx" ON "course_assessments" USING btree ("course_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "course_certificates_number_idx" ON "course_certificates" USING btree ("certificate_number");--> statement-breakpoint
CREATE UNIQUE INDEX "course_certificates_public_slug_idx" ON "course_certificates" USING btree ("public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX "course_certificates_user_course_idx" ON "course_certificates" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_enrollments_user_course_idx" ON "course_enrollments" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "course_enrollments_user_idx" ON "course_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "course_enrollments_course_idx" ON "course_enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_lessons_course_slug_idx" ON "course_lessons" USING btree ("course_id","slug");--> statement-breakpoint
CREATE INDEX "course_lessons_course_idx" ON "course_lessons" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_slug_idx" ON "courses" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "donation_receipts_donation_idx" ON "donation_receipts" USING btree ("donation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "donation_receipts_number_idx" ON "donation_receipts" USING btree ("receipt_number");--> statement-breakpoint
CREATE INDEX "donations_campaign_idx" ON "donations" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "donations_user_idx" ON "donations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "donations_status_idx" ON "donations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_logs_recipient_idx" ON "email_logs" USING btree ("recipient_email");--> statement-breakpoint
CREATE INDEX "email_logs_user_idx" ON "email_logs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_booking_payments_provider_idx" ON "expedition_booking_payments" USING btree ("provider","provider_reference");--> statement-breakpoint
CREATE INDEX "expedition_booking_payments_booking_idx" ON "expedition_booking_payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_bookings_code_idx" ON "expedition_bookings" USING btree ("booking_code");--> statement-breakpoint
CREATE INDEX "expedition_bookings_user_idx" ON "expedition_bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "expedition_bookings_departure_idx" ON "expedition_bookings" USING btree ("departure_id");--> statement-breakpoint
CREATE INDEX "expedition_bookings_status_idx" ON "expedition_bookings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "expedition_departures_unique_idx" ON "expedition_departures" USING btree ("expedition_id","starts_at");--> statement-breakpoint
CREATE INDEX "expedition_departures_expedition_idx" ON "expedition_departures" USING btree ("expedition_id");--> statement-breakpoint
CREATE INDEX "expedition_participants_booking_idx" ON "expedition_participants" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "expeditions_slug_idx" ON "expeditions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "impact_passport_items_passport_idx" ON "impact_passport_items" USING btree ("passport_id");--> statement-breakpoint
CREATE UNIQUE INDEX "impact_passports_user_idx" ON "impact_passports" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "impact_passports_public_slug_idx" ON "impact_passports" USING btree ("public_slug");--> statement-breakpoint
CREATE INDEX "impact_sites_campaign_idx" ON "impact_sites" USING btree ("campaign_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_progress_enrollment_lesson_idx" ON "lesson_progress" USING btree ("enrollment_id","lesson_id");--> statement-breakpoint
CREATE INDEX "lesson_progress_enrollment_idx" ON "lesson_progress" USING btree ("enrollment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_idx" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_transactions_provider_idx" ON "payment_transactions" USING btree ("provider","provider_reference");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_evidence_code_idx" ON "project_evidence" USING btree ("evidence_code");--> statement-breakpoint
CREATE INDEX "project_evidence_campaign_idx" ON "project_evidence" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "project_evidence_status_idx" ON "project_evidence" USING btree ("verification_status");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_idx" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sponsored_ecosystems_code_idx" ON "sponsored_ecosystems" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sponsored_ecosystems_user_idx" ON "sponsored_ecosystems" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_roles_unique_idx" ON "user_roles" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "verification_tokens_token_idx" ON "verification_tokens" USING btree ("token");