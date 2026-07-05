CREATE TABLE IF NOT EXISTS "corporate_employee_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "corporate_account_id" uuid NOT NULL,
  "employee_id" uuid NOT NULL,
  "invited_by_user_id" uuid,
  "accepted_by_user_id" uuid,
  "email" varchar(255) NOT NULL,
  "token" varchar(160) NOT NULL,
  "permission" varchar(120) NOT NULL,
  "status" varchar(80) DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "corporate_employee_invites" ADD CONSTRAINT "corporate_employee_invites_account_fk" FOREIGN KEY ("corporate_account_id") REFERENCES "public"."corporate_accounts"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "corporate_employee_invites" ADD CONSTRAINT "corporate_employee_invites_employee_id_corporate_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."corporate_employees"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "corporate_employee_invites" ADD CONSTRAINT "corporate_employee_invites_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "corporate_employee_invites" ADD CONSTRAINT "corporate_employee_invites_accepted_by_user_id_users_id_fk" FOREIGN KEY ("accepted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "corporate_employee_invites_token_idx" ON "corporate_employee_invites" USING btree ("token");
CREATE INDEX IF NOT EXISTS "corporate_employee_invites_employee_status_idx" ON "corporate_employee_invites" USING btree ("employee_id","status");
CREATE INDEX IF NOT EXISTS "corporate_employee_invites_account_idx" ON "corporate_employee_invites" USING btree ("corporate_account_id");
