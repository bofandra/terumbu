ALTER TABLE "expeditions" ADD COLUMN IF NOT EXISTS "required_academy_course_id" uuid;
CREATE INDEX IF NOT EXISTS "expeditions_required_academy_course_idx" ON "expeditions" USING btree ("required_academy_course_id");
ALTER TABLE "expeditions" ADD CONSTRAINT "expeditions_required_academy_course_id_courses_id_fk" FOREIGN KEY ("required_academy_course_id") REFERENCES "public"."courses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
