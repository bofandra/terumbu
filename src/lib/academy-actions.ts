"use server";

import { randomBytes } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  buildAssessmentAttemptMetadata,
  correctChoiceIdsFromAssessmentMetadata,
  manualAssessmentScore,
  nextAvailableAssessmentSlug,
  scoreAssessmentChoices,
  selectedChoiceIdsFromAssessmentMetadata,
  summarizeAssessmentCompletion
} from "@/lib/academy-assessment";
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
  lessonProgress,
  userSavedCourses
} from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/auth";
import { readUploadedImageAsDataUrl } from "@/lib/storage";

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

function assessmentStatusFromForm(formData: FormData) {
  const status = formText(formData, "status");

  return ["active", "archived"].includes(status) ? status : "active";
}

function questionStatusFromForm(formData: FormData) {
  const status = formText(formData, "status");

  return ["active", "archived"].includes(status) ? status : "active";
}

function returnPath(formData: FormData, fallback: string) {
  return safeRedirectPath(formData.get("next") ?? fallback, fallback);
}

function pathWithQuery(path: string, query: string) {
  const hashIndex = path.indexOf("#");
  const basePath = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : "";
  const separator = basePath.includes("?") ? "&" : "?";

  return `${basePath}${separator}${query}${hash}`;
}

async function courseImageFromForm(formData: FormData) {
  const upload = await readUploadedImageAsDataUrl(formData.get("imageFile"));

  if (upload.error) {
    redirect(`/admin/academy?error=image-${upload.error}`);
  }

  return upload.dataUrl;
}

async function courseBySlug(slug: string) {
  const [course] = await db
    .select({ id: courses.id, title: courses.title, slug: courses.slug, status: courses.status })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);

  return course ?? null;
}

async function uniqueAssessmentSlug(courseId: string, requestedSlug: string, fallbackTitle: string) {
  const baseSlug = slugify(requestedSlug || fallbackTitle);
  const existingSlugs = await db
    .select({ slug: courseAssessments.slug })
    .from(courseAssessments)
    .where(eq(courseAssessments.courseId, courseId));

  return nextAvailableAssessmentSlug(baseSlug, existingSlugs.map((row) => row.slug));
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
  const course = await courseBySlug(slug);

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

  redirect(`/academy/courses/${course.slug}?enrolled=course#course-outline`);
}

export async function saveCourseAction(formData: FormData) {
  const slug = formText(formData, "courseSlug");
  const next = returnPath(formData, slug ? `/academy/courses/${slug}` : "/academy");
  const user = await requireUser(next);
  const course = await courseBySlug(slug);

  if (!course || course.status !== "published") {
    redirect(pathWithQuery(next, "error=course"));
  }

  const now = new Date();

  await db
    .insert(userSavedCourses)
    .values({
      userId: user.id,
      courseId: course.id,
      status: "active",
      savedAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [userSavedCourses.userId, userSavedCourses.courseId],
      set: {
        status: "active",
        savedAt: now,
        updatedAt: now
      }
    });

  redirect(pathWithQuery(next, "saved=course"));
}

export async function removeSavedCourseAction(formData: FormData) {
  const slug = formText(formData, "courseSlug");
  const next = returnPath(formData, slug ? `/academy/courses/${slug}` : "/dashboard/academy");
  const user = await requireUser(next);
  const course = await courseBySlug(slug);

  if (!course) {
    redirect(pathWithQuery(next, "error=course"));
  }

  await db
    .update(userSavedCourses)
    .set({
      status: "removed",
      updatedAt: new Date()
    })
    .where(and(eq(userSavedCourses.userId, user.id), eq(userSavedCourses.courseId, course.id)));

  redirect(pathWithQuery(next, "saved=course"));
}

export async function completeLessonAction(formData: FormData) {
  const courseSlug = String(formData.get("courseSlug") ?? "");
  const lessonId = String(formData.get("lessonId") ?? "");
  const nextPath = safeRedirectPath(formData.get("next"), `/academy/courses/${courseSlug}#course-outline`);
  const user = await requireUser(`/academy/courses/${courseSlug}`);
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
      questionPosition: assessmentQuestions.position,
      points: assessmentQuestions.points,
      choiceId: assessmentChoices.id,
      isCorrect: assessmentChoices.isCorrect
    })
    .from(assessmentQuestions)
    .innerJoin(assessmentChoices, eq(assessmentChoices.questionId, assessmentQuestions.id))
    .where(and(eq(assessmentQuestions.assessmentId, assessmentId), eq(assessmentQuestions.status, "active")))
    .orderBy(asc(assessmentQuestions.position), asc(assessmentChoices.position));

  if (questions.length === 0) {
    return manualAssessmentScore(parseAssessmentScore(formData.get("score")));
  }

  const selectedByQuestion = new Map<string, string>();

  for (const row of questions) {
    if (!selectedByQuestion.has(row.questionId)) {
      selectedByQuestion.set(row.questionId, formText(formData, `question_${row.questionId}`));
    }
  }

  return scoreAssessmentChoices(questions, selectedByQuestion);
}

export async function submitAssessmentAction(formData: FormData) {
  const courseSlug = String(formData.get("courseSlug") ?? "");
  const assessmentId = formText(formData, "assessmentId");
  const user = await requireUser(`/academy/courses/${courseSlug}`);
  const now = new Date();

  const [row] = await db
    .select({
      courseId: courses.id,
      courseTitle: courses.title,
      assessmentId: courseAssessments.id,
      assessmentTitle: courseAssessments.title,
      passingScore: courseAssessments.passingScore,
      enrollmentId: courseEnrollments.id,
      passportId: impactPassports.id,
      attemptMetadata: assessmentAttempts.metadata
    })
    .from(courses)
    .innerJoin(courseAssessments, eq(courseAssessments.courseId, courses.id))
    .innerJoin(courseEnrollments, and(eq(courseEnrollments.courseId, courses.id), eq(courseEnrollments.userId, user.id)))
    .leftJoin(assessmentAttempts, and(eq(assessmentAttempts.assessmentId, courseAssessments.id), eq(assessmentAttempts.userId, user.id)))
    .leftJoin(impactPassports, eq(impactPassports.userId, user.id))
    .where(and(eq(courses.slug, courseSlug), eq(courses.status, "published"), eq(courseAssessments.id, assessmentId), eq(courseAssessments.status, "active")))
    .limit(1);

  if (!row) {
    redirect(`/academy/courses/${courseSlug}?error=assessment`);
  }

  const result = await scoreAssessment(row.assessmentId, formData);
  const score = result.score;
  const passed = score >= row.passingScore;
  const attemptMetadata = buildAssessmentAttemptMetadata({
    previousMetadata: row.attemptMetadata,
    result,
    status: passed ? "passed" : "failed",
    submittedAt: now
  });

  await db.transaction(async (tx) => {
    await tx
      .insert(assessmentAttempts)
      .values({
        assessmentId: row.assessmentId,
        userId: user.id,
        score,
        status: passed ? "passed" : "failed",
        submittedAt: now,
        metadata: attemptMetadata
      })
      .onConflictDoUpdate({
        target: [assessmentAttempts.assessmentId, assessmentAttempts.userId],
        set: {
          score,
          status: passed ? "passed" : "failed",
          submittedAt: now,
          metadata: attemptMetadata
        }
      });

    if (passed) {
      const activeAssessments = await tx
        .select({
          assessmentId: courseAssessments.id
        })
        .from(courseAssessments)
        .where(and(eq(courseAssessments.courseId, row.courseId), eq(courseAssessments.status, "active")));
      const latestAttempts = activeAssessments.length > 0
        ? await tx
            .select({
              assessmentId: assessmentAttempts.assessmentId,
              score: assessmentAttempts.score,
              status: assessmentAttempts.status
            })
            .from(assessmentAttempts)
            .where(and(inArray(assessmentAttempts.assessmentId, activeAssessments.map((assessment) => assessment.assessmentId)), eq(assessmentAttempts.userId, user.id)))
        : [];
      const completion = summarizeAssessmentCompletion(activeAssessments, latestAttempts);

      if (!completion.passedAll || completion.averageScore === null) {
        return;
      }

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
            score: completion.averageScore,
            credential: row.courseTitle,
            attemptCount: attemptMetadata.attemptCount,
            assessmentCount: completion.requiredAssessmentCount,
            earnedPoints: result.earnedPoints,
            maxPoints: result.maxPoints,
            latestAssessment: row.assessmentTitle
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
            description: `Completed ${row.courseTitle} with an average assessment score of ${completion.averageScore}.`,
            occurredAt: now,
            metadata: {
              score: completion.averageScore,
              course: courseSlug,
              assessmentCount: completion.requiredAssessmentCount,
              attemptCount: attemptMetadata.attemptCount
            }
          })
          .onConflictDoNothing({
            target: [impactPassportItems.passportId, impactPassportItems.sourceType, impactPassportItems.sourceId]
          });
      }
    }
  });

  redirect(`/academy/courses/${courseSlug}?assessment=${passed ? "passed" : "failed"}#final-assessment`);
}

export async function createAcademyCourseAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const title = formText(formData, "title");
  const slug = slugify(formText(formData, "slug") || title);
  const summary = formText(formData, "summary");
  const status = courseStatusFromForm(formData);
  const imageUrl = await courseImageFromForm(formData);
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
      imageUrl,
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
  const uploadedImageUrl = await courseImageFromForm(formData);
  const now = new Date();

  if (!courseId || !title || !summary) {
    redirect("/admin/academy?error=course");
  }

  const [course] = await db.select({ imageUrl: courses.imageUrl }).from(courses).where(eq(courses.id, courseId)).limit(1);

  if (!course) {
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
      imageUrl: uploadedImageUrl ?? course.imageUrl,
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

  const slug = await uniqueAssessmentSlug(courseId, formText(formData, "slug"), title);

  const [assessment] = await db
    .insert(courseAssessments)
    .values({
      courseId,
      title,
      slug,
      passingScore: formInt(formData, "passingScore", 70),
      status: "active",
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

export async function updateAcademyAssessmentAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const assessmentId = formText(formData, "assessmentId");
  const title = formText(formData, "title");
  const slug = slugify(formText(formData, "slug") || title);

  if (!courseId || !assessmentId || !title || !slug) {
    redirect(`/admin/academy/courses/${courseId}?error=assessment`);
  }

  const [assessment] = await db
    .select({ id: courseAssessments.id })
    .from(courseAssessments)
    .where(and(eq(courseAssessments.id, assessmentId), eq(courseAssessments.courseId, courseId)))
    .limit(1);

  if (!assessment) {
    redirect(`/admin/academy/courses/${courseId}?error=assessment`);
  }

  const existingSlugs = await db
    .select({
      id: courseAssessments.id,
      slug: courseAssessments.slug
    })
    .from(courseAssessments)
    .where(eq(courseAssessments.courseId, courseId));

  if (existingSlugs.some((row) => row.id !== assessmentId && row.slug === slug)) {
    redirect(`/admin/academy/courses/${courseId}?error=assessment-duplicate`);
  }

  await db
    .update(courseAssessments)
    .set({
      title,
      slug,
      passingScore: formInt(formData, "passingScore", 70),
      status: assessmentStatusFromForm(formData)
    })
    .where(and(eq(courseAssessments.id, assessmentId), eq(courseAssessments.courseId, courseId)));

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: "academy.assessment.updated",
    entityType: "course_assessment",
    entityId: assessmentId,
    metadata: { title, courseId }
  });

  redirect(`/admin/academy/courses/${courseId}?saved=assessment`);
}

export async function deleteAcademyAssessmentAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const assessmentId = formText(formData, "assessmentId");

  if (!courseId || !assessmentId) {
    redirect(`/admin/academy/courses/${courseId}?error=assessment`);
  }

  const [assessment] = await db
    .select({ id: courseAssessments.id, title: courseAssessments.title })
    .from(courseAssessments)
    .where(and(eq(courseAssessments.id, assessmentId), eq(courseAssessments.courseId, courseId)))
    .limit(1);

  if (!assessment) {
    redirect(`/admin/academy/courses/${courseId}?error=assessment`);
  }

  const [attempt] = await db
    .select({ id: assessmentAttempts.id })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.assessmentId, assessmentId))
    .limit(1);

  if (attempt) {
    await db
      .update(courseAssessments)
      .set({ status: "archived" })
      .where(and(eq(courseAssessments.id, assessmentId), eq(courseAssessments.courseId, courseId)));
  } else {
    await db.delete(courseAssessments).where(and(eq(courseAssessments.id, assessmentId), eq(courseAssessments.courseId, courseId)));
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: attempt ? "academy.assessment.archived" : "academy.assessment.deleted",
    entityType: "course_assessment",
    entityId: assessmentId,
    metadata: { title: assessment.title, courseId }
  });

  redirect(`/admin/academy/courses/${courseId}?saved=assessment-deleted`);
}

export async function createAcademyQuestionAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const assessmentId = formText(formData, "assessmentId");
  const questionText = formText(formData, "questionText");
  const position = formInt(formData, "position", 1);
  const choices = formData
    .getAll("choiceText")
    .map((choice, index) => ({
      choiceText: String(choice).trim(),
      originalIndex: index
    }))
    .filter((choice) => choice.choiceText);
  const correctIndex = formInt(formData, "correctChoiceIndex", 0);
  const correctChoice = choices.find((choice) => choice.originalIndex === correctIndex);

  if (!courseId || !assessmentId || !questionText || choices.length < 2 || !correctChoice) {
    redirect(`/admin/academy/courses/${courseId}?error=question`);
  }

  const [assessment] = await db
    .select({ id: courseAssessments.id })
    .from(courseAssessments)
    .where(and(eq(courseAssessments.id, assessmentId), eq(courseAssessments.courseId, courseId)))
    .limit(1);

  if (!assessment) {
    redirect(`/admin/academy/courses/${courseId}?error=question`);
  }

  const [existingPosition] = await db
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(and(eq(assessmentQuestions.assessmentId, assessmentId), eq(assessmentQuestions.position, position)))
    .limit(1);

  if (existingPosition) {
    redirect(`/admin/academy/courses/${courseId}?error=question-position`);
  }

  await db.transaction(async (tx) => {
    const [question] = await tx
      .insert(assessmentQuestions)
      .values({
        assessmentId,
        questionText,
        position,
        points: formInt(formData, "points", 1)
      })
      .returning({ id: assessmentQuestions.id });

    await tx.insert(assessmentChoices).values(
      choices.map((choice, index) => ({
        questionId: question.id,
        choiceText: choice.choiceText,
        isCorrect: choice.originalIndex === correctIndex,
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

function questionWasUsedInAttempts(questionId: string, attempts: Array<{ metadata: unknown }>) {
  return attempts.some((attempt) => {
    const selectedChoiceIds = selectedChoiceIdsFromAssessmentMetadata(attempt.metadata);
    const correctChoiceIds = correctChoiceIdsFromAssessmentMetadata(attempt.metadata);

    return Boolean(selectedChoiceIds[questionId] || correctChoiceIds[questionId]);
  });
}

export async function updateAcademyQuestionAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const assessmentId = formText(formData, "assessmentId");
  const questionId = formText(formData, "questionId");
  const questionText = formText(formData, "questionText");
  const position = formInt(formData, "position", 1);
  const choiceIds = formData.getAll("choiceId").map((choice) => String(choice).trim());
  const choiceTexts = formData.getAll("choiceText").map((choice) => String(choice).trim());
  const correctChoiceId = formText(formData, "correctChoiceId");
  const choices = choiceIds
    .map((choiceId, index) => ({
      id: choiceId,
      choiceText: choiceTexts[index] ?? "",
      position: index + 1
    }))
    .filter((choice) => choice.id);

  if (!courseId || !assessmentId || !questionId || !questionText || choices.length < 2 || choices.some((choice) => !choice.choiceText) || !choices.some((choice) => choice.id === correctChoiceId)) {
    redirect(`/admin/academy/courses/${courseId}?error=question`);
  }

  const [question] = await db
    .select({
      id: assessmentQuestions.id
    })
    .from(assessmentQuestions)
    .innerJoin(courseAssessments, eq(assessmentQuestions.assessmentId, courseAssessments.id))
    .where(and(eq(assessmentQuestions.id, questionId), eq(assessmentQuestions.assessmentId, assessmentId), eq(courseAssessments.courseId, courseId)))
    .limit(1);

  if (!question) {
    redirect(`/admin/academy/courses/${courseId}?error=question`);
  }

  const existingChoices = await db
    .select({ id: assessmentChoices.id })
    .from(assessmentChoices)
    .where(eq(assessmentChoices.questionId, questionId));
  const existingChoiceIds = new Set(existingChoices.map((choice) => choice.id));

  if (choices.length !== existingChoices.length || choices.some((choice) => !existingChoiceIds.has(choice.id))) {
    redirect(`/admin/academy/courses/${courseId}?error=question`);
  }

  const [existingPosition] = await db
    .select({ id: assessmentQuestions.id })
    .from(assessmentQuestions)
    .where(and(eq(assessmentQuestions.assessmentId, assessmentId), eq(assessmentQuestions.position, position)))
    .limit(1);

  if (existingPosition && existingPosition.id !== questionId) {
    redirect(`/admin/academy/courses/${courseId}?error=question-position`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(assessmentQuestions)
      .set({
        questionText,
        position,
        points: formInt(formData, "points", 1),
        status: questionStatusFromForm(formData),
        updatedAt: new Date()
      })
      .where(eq(assessmentQuestions.id, questionId));

    for (const choice of choices) {
      await tx
        .update(assessmentChoices)
        .set({
          choiceText: choice.choiceText,
          isCorrect: choice.id === correctChoiceId,
          position: choice.position,
          updatedAt: new Date()
        })
        .where(eq(assessmentChoices.id, choice.id));
    }

    await tx.insert(adminAuditLogs).values({
      actorUserId: user.id,
      action: "academy.question.updated",
      entityType: "assessment_question",
      entityId: questionId,
      metadata: { assessmentId, courseId }
    });
  });

  redirect(`/admin/academy/courses/${courseId}?saved=question`);
}

export async function deleteAcademyQuestionAction(formData: FormData) {
  const user = await requireRole(["admin"], "/admin/academy");
  const courseId = formText(formData, "courseId");
  const assessmentId = formText(formData, "assessmentId");
  const questionId = formText(formData, "questionId");

  if (!courseId || !assessmentId || !questionId) {
    redirect(`/admin/academy/courses/${courseId}?error=question`);
  }

  const [question] = await db
    .select({
      id: assessmentQuestions.id,
      questionText: assessmentQuestions.questionText
    })
    .from(assessmentQuestions)
    .innerJoin(courseAssessments, eq(assessmentQuestions.assessmentId, courseAssessments.id))
    .where(and(eq(assessmentQuestions.id, questionId), eq(assessmentQuestions.assessmentId, assessmentId), eq(courseAssessments.courseId, courseId)))
    .limit(1);

  if (!question) {
    redirect(`/admin/academy/courses/${courseId}?error=question`);
  }

  const attempts = await db
    .select({ metadata: assessmentAttempts.metadata })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.assessmentId, assessmentId));
  const shouldArchive = questionWasUsedInAttempts(questionId, attempts);

  if (shouldArchive) {
    await db
      .update(assessmentQuestions)
      .set({
        status: "archived",
        updatedAt: new Date()
      })
      .where(eq(assessmentQuestions.id, questionId));
  } else {
    await db.delete(assessmentQuestions).where(eq(assessmentQuestions.id, questionId));
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: user.id,
    action: shouldArchive ? "academy.question.archived" : "academy.question.deleted",
    entityType: "assessment_question",
    entityId: questionId,
    metadata: { questionText: question.questionText, assessmentId, courseId }
  });

  redirect(`/admin/academy/courses/${courseId}?saved=question-deleted`);
}
