CREATE TABLE "user_saved_courses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "course_id" uuid NOT NULL,
  "status" varchar(80) DEFAULT 'active' NOT NULL,
  "saved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_saved_courses" ADD CONSTRAINT "user_saved_courses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_saved_courses" ADD CONSTRAINT "user_saved_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "user_saved_courses_user_idx" ON "user_saved_courses" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "user_saved_courses_course_idx" ON "user_saved_courses" USING btree ("course_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "user_saved_courses_unique_idx" ON "user_saved_courses" USING btree ("user_id","course_id");
