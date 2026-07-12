ALTER TYPE "evidence_status" ADD VALUE IF NOT EXISTS 'needs_clarification';
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD COLUMN "assigned_reviewer_user_id" uuid;
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD COLUMN "clarification_note" text;
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD COLUMN "clarification_requested_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD COLUMN "clarification_resolved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "project_evidence" ADD CONSTRAINT "project_evidence_assigned_reviewer_user_id_users_id_fk" FOREIGN KEY ("assigned_reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "evidence_review_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "evidence_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "assigned_to_user_id" uuid,
  "action" varchar(80) NOT NULL,
  "from_status" "evidence_status",
  "to_status" "evidence_status",
  "note" text,
  "visibility" varchar(80) DEFAULT 'internal' NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evidence_review_events" ADD CONSTRAINT "evidence_review_events_evidence_id_project_evidence_id_fk" FOREIGN KEY ("evidence_id") REFERENCES "public"."project_evidence"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evidence_review_events" ADD CONSTRAINT "evidence_review_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "evidence_review_events" ADD CONSTRAINT "evidence_review_events_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "evidence_review_events_evidence_idx" ON "evidence_review_events" USING btree ("evidence_id");
--> statement-breakpoint
CREATE INDEX "evidence_review_events_action_idx" ON "evidence_review_events" USING btree ("action");
--> statement-breakpoint
CREATE INDEX "evidence_review_events_actor_idx" ON "evidence_review_events" USING btree ("actor_user_id");
