import Link from "next/link";
import { Award, BookmarkCheck, BookmarkX, BookOpen, Download, Flame, GraduationCap, TimerReset } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { removeSavedCourseAction } from "@/lib/academy-actions";
import { getAcademyTranscriptData } from "@/lib/academy-transcript-data";
import { getDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Academy"
};

export const dynamic = "force-dynamic";

export default async function DashboardAcademyPage() {
  const user = await requireUser("/dashboard/academy");
  const [data, transcript] = await Promise.all([getDashboardData(user.id), getAcademyTranscriptData(user.id)]);
  const enrollments = data.academy.enrollments;
  const savedCourses = data.academy.savedCourses;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Academy</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Courses and certificates</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/dashboard/academy/transcript/download" tone="secondary" download>
            <Download size={17} aria-hidden="true" />
            Download Transcript
          </ButtonLink>
          <ButtonLink href="/academy">Browse academy</ButtonLink>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Current streak", `${transcript.currentStreakDays.toLocaleString("id-ID")} days`, Flame],
          ["Longest streak", `${transcript.longestStreakDays.toLocaleString("id-ID")} days`, TimerReset],
          ["Completed", transcript.completedCourses.toLocaleString("id-ID"), GraduationCap],
          ["Certificates", transcript.certificatesEarned.toLocaleString("id-ID"), Award]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <Icon size={22} aria-hidden="true" className="text-coral-500" />
            <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{value as string}</p>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{label as string}</p>
          </article>
        ))}
      </section>

      <section id="saved-courses" className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
              <BookmarkCheck size={22} aria-hidden="true" className="text-coral-500" />
              Saved courses
            </h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              {savedCourses.length.toLocaleString("id-ID")} course{savedCourses.length === 1 ? "" : "s"} ready to revisit.
            </p>
          </div>
          <ButtonLink href="/academy#course-catalog" tone="ghost" className="border border-ocean-900/10">
            Browse catalog
          </ButtonLink>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {savedCourses.map((course) => (
            <article key={course.slug} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-ocean-900">{course.title}</h3>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {course.level} · {Math.max(1, Math.round(course.durationMinutes / 60))} hour credential path
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ocean-900/62">{course.summary}</p>
                  <p className="mt-2 text-xs font-semibold text-ocean-900/50">
                    Saved {course.savedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                </div>
                <form action={removeSavedCourseAction}>
                  <input type="hidden" name="courseSlug" value={course.slug} />
                  <input type="hidden" name="next" value="/dashboard/academy" />
                  <Button type="submit" tone="ghost" className="min-h-10 border border-ocean-900/10 px-3">
                    <BookmarkX size={16} aria-hidden="true" />
                    <span className="sr-only">Remove saved course</span>
                  </Button>
                </form>
              </div>
              <Link href={`/academy/courses/${course.slug}`} className="mt-3 inline-flex text-sm font-bold text-coral-700">
                Open course
              </Link>
            </article>
          ))}
          {savedCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 md:col-span-2">
              <p className="font-bold text-ocean-900">No saved courses yet.</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">Save courses from the Academy catalog to build a personal learning queue.</p>
              <Link href="/academy#course-catalog" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                Browse courses
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
            <BookOpen size={22} aria-hidden="true" className="text-coral-500" />
            Enrollments
          </h2>
          <div className="mt-5 grid gap-3">
            {enrollments.map((enrollment) => (
              <article key={enrollment.courseSlug} className="rounded-xl bg-sand-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-ocean-900">{enrollment.courseTitle}</h3>
                    <p className="mt-1 text-sm text-ocean-900/58">
                      {enrollment.status} · {enrollment.progressPercent}% complete
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900/62">
                    {enrollment.completedLessons}/{Math.max(1, enrollment.totalLessons)}
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-kelp-500" style={{ width: `${Math.min(100, Math.max(0, enrollment.progressPercent))}%` }} />
                </div>
                <p className="mt-2 text-xs font-semibold text-ocean-900/54">
                  {enrollment.nextLessonTitle ? `Next: ${enrollment.nextLessonTitle}` : enrollment.remainingMinutes > 0 ? `${enrollment.remainingMinutes} min remaining` : "Ready for certificate review"}
                </p>
                <Link href={`/academy/courses/${enrollment.courseSlug}`} className="mt-3 inline-flex text-sm font-bold text-coral-700">
                  Continue course
                </Link>
              </article>
            ))}
            {enrollments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">No active courses yet.</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">Start a course to build field-ready conservation knowledge and add learning records to your Impact Passport.</p>
                <Link href="/academy" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                  Browse recommended courses
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
            <Award size={22} aria-hidden="true" className="text-coral-500" />
            Certificates
          </h2>
          <div className="mt-5 grid gap-3">
            {data.certificates.map((certificate) => (
              <article key={certificate.certificateNumber} className="rounded-xl border border-kelp-100 bg-kelp-100/40 p-4">
                <h3 className="font-bold text-ocean-900">{certificate.courseTitle}</h3>
                <p className="mt-1 text-sm font-semibold text-kelp-700">{certificate.certificateNumber}</p>
                <p className="mt-1 text-sm text-ocean-900/58">
                  Issued {certificate.issuedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
              </article>
            ))}
            {data.certificates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">No verified certificates yet.</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">Complete an eligible Academy course to earn your first credential.</p>
                <Link href="/academy" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                  Find certificate courses
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
