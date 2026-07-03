CREATE TABLE "organization_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" varchar(80) DEFAULT 'manager' NOT NULL,
	"status" varchar(80) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_users_organization_idx" ON "organization_users" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_users_user_idx" ON "organization_users" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_users_unique_idx" ON "organization_users" USING btree ("organization_id","user_id");--> statement-breakpoint
INSERT INTO "organization_users" ("organization_id", "user_id", "role", "status")
SELECT "organizations"."id", "user_roles"."user_id", 'manager', 'active'
FROM "user_roles"
INNER JOIN "roles" ON "user_roles"."role_id" = "roles"."id"
CROSS JOIN "organizations"
WHERE "roles"."key" = 'partner'
ON CONFLICT ("organization_id", "user_id") DO NOTHING;
