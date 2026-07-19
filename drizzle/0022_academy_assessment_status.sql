ALTER TABLE "course_assessments" ADD COLUMN "status" varchar(80) DEFAULT 'active' NOT NULL;
CREATE INDEX "course_assessments_status_idx" ON "course_assessments" ("course_id", "status");
