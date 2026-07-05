"use server";

import { randomBytes } from "node:crypto";

import { and, asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  assessmentAttempts,
  assessmentChoices,
  assessmentQuestions,
  courseAssessments,
  courseCertificates,
  courseEnrollments,
  courseLessons,
  courses,
  impactPassportItems,
  impactPassports,
  lessonProgress
} from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/auth";

function certificateSlug(courseSlug: string) {
  return `${courseSlug}-${randomBytes(4).toString("hex")}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || randomBytes(3).toString("hex");
}

function formText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formInt(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));

  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : fallback;
}

function parseAssessmentScore(value: FormDataEntryValue | null) {
  const score = Number(String(value ?? "").replace(/[^0-9]/g, ""));

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function courseStatusFromForm(formData: FormData) {
  const status = formText(formData, "status");

  return ["draft", "published", "archived"].includes(status) ? status : "draft";
}

async function ensureCourseLessonsProgress(enrollmentId: string, courseId: string) {
  const lessons = await db.select({ id: courseLessons.id }).from(courseLessons).where(eq(courseLessons.courseId, courseId));

  if (lessons.length === 0) {
    return;
  }

  await db
    .insert(lessonProgress)
    .values(
      lessons.map((lesson) => ({
        enrollmentId,
        lessonId: lesson.id,
        status: "not_started"
      }))
    )
    .onConflictDoNothing({
      target: [lessonProgress.enrollmentId, lessonProgress.lessonId]
    });
}

export async function enrollCourseAction(formData: FormData) {
  const slug = String(formData.get("courseSlug") ?? "");
  const user = await requireUser(`/academy/courses/${slug}`);

  const [course] = await db
    .select({ id: courses.id, slug: courses.slug, status: courses.status })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  if (!course || course.status !== "published") {
    redirect("/academy?error=course");
  }

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

    const lessons = await tx.select({ id: courseLessons.id }).from(courseLessons).where(eq(courseLessons.courseId, course.id));

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

  redirect(`/dashboard/academy/courses/${course.slug}`);
}

export async function completeLessonAction(formData: FormData) {
  const courseSlug = String(formData.get("courseSlug") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"), `/dashboard/academy/courses/${courseSlug}`);
  const user = await requireUser(`/dashboard/academy/courses/${courseSlug}`);
  const now = new Date();

  const [enrollment] = await db
    .select({
      id: courseEnrollments.id,
      courseId: courseEnrollments.courseId
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

  await ensureCourseLessonsProgress(enrollment.id, enrollment.courseId);

  redirect(nextPath);
}

async function scoreAssessment(assessmentId: string, formData: FormData) {
  const questions = await db
    .select({
      questionId: assessmentQuestions.id,
      points: assessmentQuestions.points,
      choiceId: assessmentChoices.id,
      isCorrect: assessmentChoices.isCorrect
    })
    .from(assessmentQuestions)
    .innerJoin(assessmentChoices, eq(assessmentChoices.questionId, assessmentQuestions.id))
    .where(and(eq(assessmentQuestions.assessmentId, assessmentId), eq(assessmentQuestions.status, "active")))
    .orderBy(asc(assessmentQuestions.position), asc(assessmentChoices.position));

  const pointsByQuestion = new Map<string, number>();
  const correctChoiceByQuestion = new Map<string, string>();

  for (const row of questions) {
    pointsByQuestion.set(row.questionId, row.points);

    if (row.isCorrect) {
      correctChoiceByQuestion.set(row.questionId, row.choiceId);
    }
  }

  if (pointsByQuestion.size === 0) {
    return parseAssessmentScore(formData.get("score"));
  }

  const maxScore = Array.from(pointsByQuestion.values()).reduce((total, points) => total + points, 0);
  let earned = 0;

  for (const [questionId, points] of pointsByQuestion) {
    const selectedChoiceId = formText(formData, `question_${questionId}`);

    if (selectedChoiceId && correctChoiceByQuestion.get(questionId) === selectedChoiceId) {
      earned += points;
    }
  }

  return Math.round((earned / Math.max(1, maxScore)) * 100);
}

export async function submitAssessmentAction(formData: FormData) {
  const courseSlug = String(formData.get("courseSlug") ?? "");
  const user = await requireUser(`/dashboard/academy/courses/${courseSlug}`);
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
    redirect(`/dashboard/academy/courses/${courseSlug}?error=assessment`);
  }

  const score = await scoreAssessment(row.assessmentId, formData);
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
          source: "assessment_form"
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

      const [certificate] = await tx
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
        })
        .returning({ id: courseCertificates.id });

      if (row.passportId && certificate?.id) {
        await tx
          .insert(impactPassportItems)
          .values({
            passportId: row.passportId,
            sourceType: "course_certificate",
            sourceId: certificate.id,
            itemType: "certificate",
            title: `${row.courseTitle} certificate`,
            description: `Completed ${row.courseTitle} with a score of ${score}.`,
            occurredAt: now,
            metadata: {
              score,
              course: courseSlug
            }
          })
          .onConflictDoNothing({
            target: [impactPassportItems.passportId, impactPassportItems.sourceType, impactPassportItems.sourceId]
          });
      }
    }
  });

  redirect(`/dashboard/academy/courses/${courseSlug}/assessment?assessment=${passed ? "passed" : "failed"}`);
}

export async function createAcademyCourseAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const title = formText(formData, "title");
  const slug = slugify(formText(formData, "slug") || title);
  const summary = formText(formData, "summary");
  const status = courseStatusFromForm(formData);
  const now = new Date();

  if (!title || !summary) {
    redirect("/admin/academy?error=course");
  }

  const [course] = await db
    .insert(courses)
    .values({
      title,
      slug,
      level: formText(formData, "level") || "Beginner",
      durationMinutes: formInt(formData, "durationMinutes", 60),
      summary,
      description: formText(formData, "description") || null,
      imageUrl: formText(formData, "imageUrl") || null,
      status,
      publishedAt: status === "published" ? now : null,
      updatedAt: now
    })
    .returning({ id: courses.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "academy.course.created",
    entityType: "course",
    entityId: course.id,
    metadata: { title, status }
  });

  redirect(`/admin/academy/courses/${course.id}?saved=course`);
}

export async function updateAcademyCourseAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const title = formText(formData, "title");
  const slug = slugify(formText(formData, "slug") || title);
  const summary = formText(formData, "summary");
  const status = courseStatusFromForm(formData);
  const now = new Date();

  if (!courseId || !title || !summary) {
    redirect("/admin/academy?error=course");
  }

  await db
    .update(courses)
    .set({
      title,
      slug,
      level: formText(formData, "level") || "Beginner",
      durationMinutes: formInt(formData, "durationMinutes", 60),
      summary,
      description: formText(formData, "description") || null,
      imageUrl: formText(formData, "imageUrl") || null,
      status,
      publishedAt: status === "published" ? now : null,
      updatedAt: now
    })
    .where(eq(courses.id, courseId));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "academy.course.updated",
    entityType: "course",
    entityId: courseId,
    metadata: { title, status }
  });

  redirect(`/admin/academy/courses/${courseId}?saved=course`);
}

export async function createAcademyLessonAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const title = formText(formData, "title");
  const now = new Date();

  if (!courseId || !title) {
    redirect("/admin/academy?error=lesson");
  }

  const [lesson] = await db
    .insert(courseLessons)
    .values({
      courseId,
      title,
      slug: slugify(formText(formData, "slug") || title),
      position: formInt(formData, "position", 1),
      durationMinutes: formInt(formData, "durationMinutes", 15),
      body: formText(formData, "body") || null,
      isPreview: formData.get("isPreview") === "on",
      updatedAt: now
    })
    .returning({ id: courseLessons.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "academy.lesson.created",
    entityType: "course_lesson",
    entityId: lesson.id,
    metadata: { title, courseId }
  });

  redirect(`/admin/academy/courses/${courseId}?saved=lesson`);
}

export async function createAcademyAssessmentAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const title = formText(formData, "title") || "Final assessment";

  if (!courseId) {
    redirect("/admin/academy?error=assessment");
  }

  const [assessment] = await db
    .insert(courseAssessments)
    .values({
      courseId,
      title,
      slug: slugify(formText(formData, "slug") || title),
      passingScore: formInt(formData, "passingScore", 70),
      metadata: { createdFrom: "admin_academy" }
    })
    .returning({ id: courseAssessments.id });

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "academy.assessment.created",
    entityType: "course_assessment",
    entityId: assessment.id,
    metadata: { title, courseId }
  });

  redirect(`/admin/academy/courses/${courseId}?saved=assessment`);
}

export async function createAcademyQuestionAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const assessmentId = formText(formData, "assessmentId");
  const questionText = formText(formData, "questionText");
  const choices = formData.getAll("choiceText").map((choice) => String(choice).trim()).filter(Boolean);
  const correctIndex = formInt(formData, "correctChoiceIndex", 0);

  if (!courseId || !assessmentId || !questionText || choices.length < 2) {
    redirect(`/admin/academy/courses/${courseId}?error=question`);
  }

  await db.transaction(async (tx) => {
    const [question] = await tx
      .insert(assessmentQuestions)
      .values({
        assessmentId,
        questionText,
        position: formInt(formData, "position", 1),
        points: formInt(formData, "points", 1)
      })
      .returning({ id: assessmentQuestions.id });

    await tx.insert(assessmentChoices).values(
      choices.map((choiceText, index) => ({
        questionId: question.id,
        choiceText,
        isCorrect: index === correctIndex,
        position: index + 1
      }))
    );

    await tx.insert(adminAuditLogs).values({
      actorUserId: user.id,
      action: "academy.question.created",
      entityType: "assessment_question",
      entityId: question.id,
      metadata: { assessmentId, courseId }
    });
  });

  redirect(`/admin/academy/courses/${courseId}?saved=question`);
}
