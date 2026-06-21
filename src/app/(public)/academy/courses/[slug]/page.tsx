import { CheckCircle2, Circle, FileBadge, PlayCircle } from "lucide-react";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { Button, ButtonLink } from "@/components/ui/button";
import { completeLessonAction, enrollCourseAction, submitAssessmentAction } from "@/lib/academy-actions";
import { getSessionUser } from "@/lib/auth";
import { getCourseDetail } from "@/lib/queries";

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  const course = await getCourseDetail(slug, user?.id);

  if (!course) {
    notFound();
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow={course.level} title={course.title}>
        {course.summary}
      </SectionHeading>

      <div className="mt-8 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">{course.duration}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">
              {course.enrollment ? "Enrollment active" : "Start this learning track"}
            </h2>
            <p className="mt-2 text-sm text-ocean-900/62">
              {course.certificate
                ? `Certificate ${course.certificate.certificateNumber} issued.`
                : "Complete lessons and pass the assessment to add a certificate to your Impact Passport."}
            </p>
          </div>
          {course.enrollment ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-kelp-100 px-4 py-2 text-sm font-bold text-kelp-700">
              <CheckCircle2 size={17} aria-hidden="true" />
              {course.enrollment.status}
            </span>
          ) : user ? (
            <form action={enrollCourseAction}>
              <input type="hidden" name="courseSlug" value={course.slug} />
              <Button type="submit">Enroll</Button>
            </form>
          ) : (
            <ButtonLink href={`/login?next=/academy/courses/${course.slug}`}>Login to enroll</ButtonLink>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        {course.lessons.map((lesson) => {
          const completed = lesson.progress?.status === "completed";

          return (
            <article key={lesson.id} className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.14em] text-ocean-900/52">
                    Lesson {lesson.position} · {lesson.durationMinutes} min
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{lesson.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/68">{lesson.body}</p>
                </div>
                {completed ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-kelp-100 px-4 py-2 text-sm font-bold text-kelp-700">
                    <CheckCircle2 size={17} aria-hidden="true" />
                    Completed
                  </span>
                ) : course.enrollment ? (
                  <form action={completeLessonAction}>
                    <input type="hidden" name="courseSlug" value={course.slug} />
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <Button type="submit" tone="secondary">
                      <PlayCircle size={18} aria-hidden="true" />
                      Complete
                    </Button>
                  </form>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-ocean-50 px-4 py-2 text-sm font-bold text-ocean-900/62">
                    <Circle size={17} aria-hidden="true" />
                    Locked
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">Assessment</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">
              {course.assessment?.title ?? "Final assessment"}
            </h2>
            <p className="mt-2 text-sm text-ocean-900/62">
              Passing score: {course.assessment?.passingScore ?? 80}. Current attempt: {course.attempt?.status ?? "not submitted"}.
            </p>
          </div>
          {course.certificate ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-kelp-100 px-4 py-2 text-sm font-bold text-kelp-700">
              <FileBadge size={17} aria-hidden="true" />
              Certified
            </span>
          ) : course.enrollment ? (
            <form action={submitAssessmentAction} className="flex flex-col gap-2 sm:items-end">
              <input type="hidden" name="courseSlug" value={course.slug} />
              <input
                name="score"
                type="number"
                min={0}
                max={100}
                defaultValue={course.attempt?.score ?? course.assessment?.passingScore ?? 80}
                className="w-28 rounded-xl border border-ocean-900/14 px-3 py-2 text-sm font-semibold outline-none focus:border-coral-500"
                aria-label="Assessment score"
              />
              <Button type="submit">Submit Assessment</Button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}
