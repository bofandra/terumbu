"use server";

import { randomBytes } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  assessmentAttempts,
  courseAssessments,
  courseCertificates,
  courseEnrollments,
  courseLessons,
  courses,
  lessonProgress,
  impactPassportItems,
  impactPassports
} from "@/db/schema";
import { requireUser } from "@/lib/auth";

function certificateSlug(courseSlug: string) {
  return `${courseSlug}-${randomBytes(4).toString("hex")}`;
}

export async function enrollCourseAction(formData: FormData) {
  const slug = String(formData.get("courseSlug") ?? "");
  const user = await requireUser(`/academy/courses/${slug}`);

  const [course] = await db.select({ id: courses.id, slug: courses.slug }).from(courses).where(eq(courses.slug, slug)).limit(1);

  if (!course) {
    redirect("/academy?error=course");
  }

  const lessons = await db.select({ id: courseLessons.id }).from(courseLessons).where(eq(courseLessons.courseId, course.id));

  await db.transaction(async (tx) => {
    const [enrollment] = await tx
      .insert(courseEnrollments)
      .values({
        userId: user.id,
        courseId: course.id,
        status: "active",
        metadata: {
          source: "course_page"
        }
      })
      .onConflictDoUpdate({
        target: [courseEnrollments.userId, courseEnrollments.courseId],
        set: {
          status: "active"
        }
      })
      .returning({ id: courseEnrollments.id });

    if (lessons.length > 0) {
      await tx
        .insert(lessonProgress)
        .values(
          lessons.map((lesson) => ({
            enrollmentId: enrollment.id,
            lessonId: lesson.id,
            status: "not_started"
          }))
        )
        .onConflictDoNothing({
          target: [lessonProgress.enrollmentId, lessonProgress.lessonId]
        });
    }
  });

  redirect(`/academy/courses/${course.slug}?enrolled=1`);
}

export async function completeLessonAction(formData: FormData) {
  const courseSlug = String(formData.get("courseSlug") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const user = await requireUser(`/academy/courses/${courseSlug}`);
  const now = new Date();

  const [enrollment] = await db
    .select({
      id: courseEnrollments.id
    })
    .from(courseEnrollments)
    .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
    .where(and(eq(courses.slug, courseSlug), eq(courseEnrollments.userId, user.id)))
    .limit(1);

  if (!enrollment || !lessonId) {
    redirect(`/academy/courses/${courseSlug}?error=enrollment`);
  }

  await db
    .insert(lessonProgress)
    .values({
      enrollmentId: enrollment.id,
      lessonId,
      status: "completed",
      completedAt: now,
      score: 100
    })
    .onConflictDoUpdate({
      target: [lessonProgress.enrollmentId, lessonProgress.lessonId],
      set: {
        status: "completed",
        completedAt: now,
        score: 100
      }
    });

  redirect(`/academy/courses/${courseSlug}?lesson=completed`);
}

export async function submitAssessmentAction(formData: FormData) {
  const courseSlug = String(formData.get("courseSlug") ?? "");
  const user = await requireUser(`/academy/courses/${courseSlug}`);
  const now = new Date();

  const [row] = await db
    .select({
      courseId: courses.id,
      courseTitle: courses.title,
      assessmentId: courseAssessments.id,
      passingScore: courseAssessments.passingScore,
      enrollmentId: courseEnrollments.id,
      passportId: impactPassports.id
    })
    .from(courses)
    .innerJoin(courseAssessments, eq(courseAssessments.courseId, courses.id))
    .innerJoin(courseEnrollments, and(eq(courseEnrollments.courseId, courses.id), eq(courseEnrollments.userId, user.id)))
    .leftJoin(impactPassports, eq(impactPassports.userId, user.id))
    .where(eq(courses.slug, courseSlug))
    .limit(1);

  if (!row) {
    redirect(`/academy/courses/${courseSlug}?error=assessment`);
  }

  const score = 92;
  const passed = score >= row.passingScore;

  await db.transaction(async (tx) => {
    await tx
      .insert(assessmentAttempts)
      .values({
        assessmentId: row.assessmentId,
        userId: user.id,
        score,
        status: passed ? "passed" : "failed",
        submittedAt: now,
        metadata: {
          source: "demo_assessment"
        }
      })
      .onConflictDoUpdate({
        target: [assessmentAttempts.assessmentId, assessmentAttempts.userId],
        set: {
          score,
          status: passed ? "passed" : "failed",
          submittedAt: now,
          metadata: sql`excluded.metadata`
        }
      });

    if (passed) {
      const certificateNumber = `TRB-CERT-${now.getUTCFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

      await tx
        .update(courseEnrollments)
        .set({
          status: "completed",
          completedAt: now
        })
        .where(eq(courseEnrollments.id, row.enrollmentId));

      await tx
        .insert(courseCertificates)
        .values({
          userId: user.id,
          courseId: row.courseId,
          enrollmentId: row.enrollmentId,
          certificateNumber,
          publicSlug: certificateSlug(courseSlug),
          issuedAt: now,
          metadata: {
            score,
            credential: row.courseTitle
          }
        })
        .onConflictDoNothing({
          target: [courseCertificates.userId, courseCertificates.courseId]
        });

      if (row.passportId) {
        await tx.insert(impactPassportItems).values({
          passportId: row.passportId,
          itemType: "certificate",
          title: `${row.courseTitle} certificate`,
          description: `Completed ${row.courseTitle} with a score of ${score}.`,
          occurredAt: now,
          metadata: {
            score,
            course: courseSlug
          }
        });
      }
    }
  });

  redirect(`/academy/courses/${courseSlug}?assessment=${passed ? "passed" : "failed"}`);
}
