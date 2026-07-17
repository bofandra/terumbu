import Link from "next/link";
import { ArrowUpRight, BarChart3, BookOpenCheck, ClipboardCheck, GraduationCap, Percent, Plus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { createAcademyCourseAction } from "@/lib/academy-actions";
import { requireRole } from "@/lib/auth";
import { getAdminAcademyData } from "@/lib/queries";

export const metadata = {
  title: "Admin Academy"
};

export const dynamic = "force-dynamic";

const courseStatuses = ["draft", "published", "archived"];

const savedMessages: Record<string, string> = {
  course: "Course saved."
};

const errorMessages: Record<string, string> = {
  course: "Enter a title and summary for the course."
};

type AdminAcademyPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function CourseStatusSelect({ defaultValue = "draft" }: { defaultValue?: string }) {
  return (
    <select name="status" defaultValue={defaultValue} className={adminSelectClassName}>
      {courseStatuses.map((status) => (
        <option key={status} value={status}>
          {labelize(status)}
        </option>
      ))}
    </select>
  );
}

export default async function AdminAcademyPage({ searchParams }: AdminAcademyPageProps) {
  await requireRole(["admin"], "/admin/academy");
  const params = await searchParams;
  const data = await getAdminAcademyData();
  const publishedCount = data.courses.filter((course) => course.status === "published").length;
  const lessonCount = data.courses.reduce((total, course) => total + course.lessons.length, 0);
  const enrollmentCount = data.courses.reduce((total, course) => total + course.enrollmentCount, 0);
  const certificateCount = data.courses.reduce((total, course) => total + course.certificateCount, 0);
  const attemptSubmissionCount = data.courses.reduce((total, course) => total + course.analytics.totalSubmissions, 0);
  const attemptedCourses = data.courses.filter((course) => course.analytics.latestAttemptCount > 0);
  const averagePassRate = attemptedCourses.length
    ? Math.round(attemptedCourses.reduce((total, course) => total + course.analytics.passRate, 0) / attemptedCourses.length)
    : 0;
  const savedMessage = params?.saved ? savedMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Academy"
        title="Academy management"
        description="Create learning courses, manage lesson structure, and maintain assessment questions for learner certification."
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Academy summary">
        {[
          { label: "Courses", value: data.courses.length.toLocaleString("id-ID"), icon: GraduationCap },
          { label: "Published", value: publishedCount.toLocaleString("id-ID"), icon: ClipboardCheck },
          { label: "Lessons", value: lessonCount.toLocaleString("id-ID"), icon: BookOpenCheck },
          { label: "Enrollments", value: enrollmentCount.toLocaleString("id-ID"), icon: UsersRound },
          { label: "Attempts", value: attemptSubmissionCount.toLocaleString("id-ID"), icon: BarChart3 },
          { label: "Pass rate", value: `${averagePassRate}%`, icon: Percent }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <form action={createAcademyCourseAction} className={`${adminPanelClassName} p-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create course</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
                Start with course metadata, then add lessons and assessments from the course editor.
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-coral-100 text-coral-700">
              <Plus className="size-5" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            <Field label="Title">
              <input name="title" className={adminInputClassName} placeholder="Mangrove restoration basics" required />
            </Field>
            <Field label="Slug">
              <input name="slug" className={adminInputClassName} placeholder="mangrove-restoration-basics" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Level">
                <input name="level" defaultValue="Beginner" className={adminInputClassName} required />
              </Field>
              <Field label="Duration minutes">
                <input name="durationMinutes" type="number" min={1} defaultValue={60} className={adminInputClassName} required />
              </Field>
            </div>
            <Field label="Status">
              <CourseStatusSelect />
            </Field>
            <Field label="Image URL">
              <input name="imageUrl" type="url" className={adminInputClassName} placeholder="https://..." />
            </Field>
            <Field label="Summary">
              <textarea name="summary" className={adminTextareaClassName} placeholder="Short catalog summary" required />
            </Field>
            <Field label="Description">
              <textarea name="description" className={adminTextareaClassName} placeholder="Longer course description" />
            </Field>
          </div>

          <Button type="submit" className="mt-4 rounded-lg">
            <Plus className="size-4" aria-hidden="true" />
            Create Course
          </Button>
        </form>

        <section className={adminPanelClassName}>
          <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Course catalog</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                {certificateCount.toLocaleString("id-ID")} certificates issued across academy courses.
              </p>
            </div>
            <GraduationCap className="size-5 text-coral-700" aria-hidden="true" />
          </div>

          <div className="divide-y divide-ocean-900/10">
            {data.courses.map((course) => (
              <article key={course.id} className="p-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold tracking-normal text-ocean-900">{course.title}</h3>
                      <AdminStatusBadge value={course.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                      {course.level} / {course.duration} / {course.lessons.length.toLocaleString("id-ID")} lessons / {course.assessments.length.toLocaleString("id-ID")} assessments
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">
                        {course.enrollmentCount.toLocaleString("id-ID")} enrolled
                      </span>
                      <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">
                        {course.completedCount.toLocaleString("id-ID")} completed
                      </span>
                      <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ocean-900">
                        {course.certificateCount.toLocaleString("id-ID")} certificates
                      </span>
                      <span className="rounded-full bg-ocean-100 px-3 py-1 text-xs font-bold text-ocean-700">
                        {course.analytics.totalSubmissions.toLocaleString("id-ID")} attempts
                      </span>
                      <span className="rounded-full bg-credential-50 px-3 py-1 text-xs font-bold text-credential-700">
                        {course.analytics.passRate}% pass / {course.analytics.averageScore}% avg
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {course.status === "published" ? (
                      <Link href={`/academy/courses/${course.slug}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700">
                        Public page
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                    <Link href={`/admin/academy/courses/${course.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ocean-900 px-3 text-sm font-bold text-white transition hover:bg-ocean-700">
                      Manage
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}

            {data.courses.length === 0 ? (
              <AdminEmptyState
                className="m-4"
                title="No courses yet"
                description="Create the first course to publish academy learning paths and issue certificates."
              />
            ) : null}
          </div>
        </section>
      </section>
    </div>
  );
}
