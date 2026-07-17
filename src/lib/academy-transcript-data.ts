import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  assessmentAttempts,
  courseAssessments,
  courseCertificates,
  courseEnrollments,
  courseLessons,
  courses,
  lessonProgress,
  profiles,
  users
} from "@/db/schema";
import { academyLearningStreak, type AcademyTranscriptRecord } from "@/lib/academy-transcript";

export async function getAcademyTranscriptData(userId: string, now = new Date()): Promise<AcademyTranscriptRecord> {
  const [profileRows, enrollmentRows, lessonRows, attemptRows, certificateRows] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        displayName: profiles.displayName
      })
      .from(users)
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1),
    db
      .select({
        enrollmentId: courseEnrollments.id,
        courseId: courses.id,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        courseLevel: courses.level,
        durationMinutes: courses.durationMinutes,
        status: courseEnrollments.status,
        enrolledAt: courseEnrollments.enrolledAt,
        completedAt: courseEnrollments.completedAt
      })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courseEnrollments.courseId, courses.id))
      .where(eq(courseEnrollments.userId, userId))
      .orderBy(desc(courseEnrollments.enrolledAt)),
    db
      .select({
        enrollmentId: courseEnrollments.id,
        lessonId: courseLessons.id,
        durationMinutes: courseLessons.durationMinutes,
        progressStatus: lessonProgress.status,
        completedAt: lessonProgress.completedAt
      })
      .from(courseEnrollments)
      .innerJoin(courseLessons, eq(courseEnrollments.courseId, courseLessons.courseId))
      .leftJoin(lessonProgress, and(eq(lessonProgress.enrollmentId, courseEnrollments.id), eq(lessonProgress.lessonId, courseLessons.id)))
      .where(eq(courseEnrollments.userId, userId))
      .orderBy(asc(courseLessons.position)),
    db
      .select({
        courseId: courseAssessments.courseId,
        score: assessmentAttempts.score,
        status: assessmentAttempts.status,
        submittedAt: assessmentAttempts.submittedAt
      })
      .from(assessmentAttempts)
      .innerJoin(courseAssessments, eq(assessmentAttempts.assessmentId, courseAssessments.id))
      .where(eq(assessmentAttempts.userId, userId))
      .orderBy(desc(assessmentAttempts.submittedAt)),
    db
      .select({
        courseId: courseCertificates.courseId,
        certificateNumber: courseCertificates.certificateNumber,
        publicSlug: courseCertificates.publicSlug,
        issuedAt: courseCertificates.issuedAt
      })
      .from(courseCertificates)
      .where(eq(courseCertificates.userId, userId))
      .orderBy(desc(courseCertificates.issuedAt))
  ]);

  const lessonsByEnrollment = lessonRows.reduce((groups, lesson) => {
    const stats = groups.get(lesson.enrollmentId) ?? {
      totalLessons: 0,
      completedLessons: 0,
      remainingMinutes: 0,
      activityDates: [] as Date[]
    };

    stats.totalLessons += 1;
    if (lesson.progressStatus === "completed") {
      stats.completedLessons += 1;
      if (lesson.completedAt) {
        stats.activityDates.push(lesson.completedAt);
      }
    } else {
      stats.remainingMinutes += lesson.durationMinutes;
    }

    groups.set(lesson.enrollmentId, stats);

    return groups;
  }, new Map<string, { totalLessons: number; completedLessons: number; remainingMinutes: number; activityDates: Date[] }>());

  const latestAttemptByCourse = new Map<string, (typeof attemptRows)[number]>();
  for (const attempt of attemptRows) {
    if (!latestAttemptByCourse.has(attempt.courseId)) {
      latestAttemptByCourse.set(attempt.courseId, attempt);
    }
  }

  const certificateByCourse = new Map(certificateRows.map((certificate) => [certificate.courseId, certificate]));
  const activityDates = [
    ...lessonRows.map((lesson) => lesson.completedAt),
    ...attemptRows.map((attempt) => attempt.submittedAt),
    ...certificateRows.map((certificate) => certificate.issuedAt),
    ...enrollmentRows.map((enrollment) => enrollment.completedAt)
  ];
  const streak = academyLearningStreak(activityDates, now);
  const learner = profileRows[0];

  const coursesWithProgress = enrollmentRows.map((enrollment) => {
    const lessonStats = lessonsByEnrollment.get(enrollment.enrollmentId) ?? {
      totalLessons: 0,
      completedLessons: enrollment.status === "completed" ? 1 : 0,
      remainingMinutes: enrollment.status === "completed" ? 0 : enrollment.durationMinutes,
      activityDates: []
    };
    const progressPercent = enrollment.status === "completed" ? 100 : Math.round((lessonStats.completedLessons / Math.max(1, lessonStats.totalLessons)) * 100);
    const attempt = latestAttemptByCourse.get(enrollment.courseId) ?? null;
    const certificate = certificateByCourse.get(enrollment.courseId) ?? null;

    return {
      courseTitle: enrollment.courseTitle,
      courseSlug: enrollment.courseSlug,
      courseLevel: enrollment.courseLevel,
      status: enrollment.status,
      progressPercent,
      completedLessons: lessonStats.completedLessons,
      totalLessons: lessonStats.totalLessons,
      remainingMinutes: lessonStats.remainingMinutes,
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      assessmentStatus: attempt?.status ?? null,
      assessmentScore: attempt?.score ?? null,
      assessmentSubmittedAt: attempt?.submittedAt ?? null,
      certificateNumber: certificate?.certificateNumber ?? null,
      certificatePublicSlug: certificate?.publicSlug ?? null,
      certificateIssuedAt: certificate?.issuedAt ?? null
    };
  });

  return {
    learnerName: learner?.displayName || learner?.name || "Terumbu learner",
    learnerEmail: learner?.email ?? "",
    generatedAt: now,
    currentStreakDays: streak.currentStreakDays,
    longestStreakDays: streak.longestStreakDays,
    latestActivityAt: streak.latestActivityAt,
    completedCourses: coursesWithProgress.filter((course) => course.status === "completed").length,
    certificatesEarned: certificateRows.length,
    courses: coursesWithProgress
  };
}
