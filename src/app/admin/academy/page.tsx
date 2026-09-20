import Link from "next/link";
import { ArrowUpDown, BarChart3, BookOpenCheck, ClipboardCheck, GraduationCap, Plus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/admin-data-table";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminPanelClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { createAcademyCourseAction } from "@/lib/academy-actions";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { getAdminAcademyPage, type AdminAcademyFilters } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Admin Academy" };
export const dynamic = "force-dynamic";

const pathname = "/admin/academy";
const courseStatuses = ["draft", "published", "archived"];
const savedMessages: Record<string, string> = { course: "Course saved." };
const errorMessages: Record<string, string> = { course: "Enter a title and summary for the course.", "image-size": "Uploaded image is too large.", "image-type": "Upload a supported image file." };

type AdminAcademyPageProps = { searchParams?: Promise<AdminAcademyFilters & { error?: string; saved?: string }> };
type AdminAcademyData = Awaited<ReturnType<typeof getAdminAcademyPage>>;
type AdminCourse = AdminAcademyData["courses"][number];

function labelize(value: string) { return value.replace(/_/g, " "); }
function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) { return <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>{label}{children}</label>; }
function CourseStatusSelect({ defaultValue = "draft" }: { defaultValue?: string }) { return <select name="status" defaultValue={defaultValue} className={adminSelectClassName}>{courseStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select>; }

function academyHref(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "" && value !== "all") search.set(key, String(value));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function listParams(data: AdminAcademyData) {
  return { q: data.filters.q || undefined, status: data.filters.status === "all" ? undefined : data.filters.status, level: data.filters.level || undefined, sort: data.filters.sort === "updatedAt" ? undefined : data.filters.sort, dir: data.filters.dir === "desc" ? undefined : data.filters.dir };
}

function SortHeader({ label, sort, data }: { label: string; sort: string; data: AdminAcademyData }) {
  const active = data.filters.sort === sort;
  const nextDir = active && data.filters.dir === "asc" ? "desc" : "asc";
  return <Link href={academyHref({ ...listParams(data), sort, dir: nextDir, page: 1 })} className="inline-flex items-center gap-1 rounded-md text-ocean-900/70 transition hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2">{label}<ArrowUpDown className={cn("size-3.5", active ? "text-coral-700" : "text-ocean-900/38")} aria-hidden="true" /></Link>;
}

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof GraduationCap }) {
  return <article className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold text-ocean-900/58">{label}</p><MetricValue className="mt-3 text-ocean-900">{value}</MetricValue></div><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700"><Icon className="size-5" aria-hidden="true" /></span></div></article>;
}

export default async function AdminAcademyPage({ searchParams }: AdminAcademyPageProps) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const data = await observeAdminDataLoader("admin.academy.directory", () => getAdminAcademyPage(params));
  const savedMessage = params?.saved ? savedMessages[String(params.saved)] : null;
  const errorMessage = params?.error ? errorMessages[String(params.error)] : null;
  const baseParams = listParams(data);
  const columns: AdminDataTableColumn<AdminCourse>[] = [
    { key: "course", header: <SortHeader label="Course" sort="title" data={data} />, render: (course) => <div className="min-w-64"><Link href={`/admin/academy/courses/${course.id}`} className="font-bold text-ocean-900 hover:text-coral-700">{course.title}</Link><p className="mt-1 text-sm font-semibold text-ocean-900/58">/{course.slug}</p><p className="mt-1 max-w-80 text-xs font-semibold text-ocean-900/54">{course.summary}</p></div> },
    { key: "status", header: <SortHeader label="Status" sort="status" data={data} />, render: (course) => <AdminStatusBadge value={course.status} /> },
    { key: "level", header: <SortHeader label="Level" sort="level" data={data} />, render: (course) => <div><p className="font-bold">{course.level}</p><p className="mt-1 text-xs font-semibold text-ocean-900/54">{course.duration}</p></div> },
    { key: "content", header: <SortHeader label="Lessons" sort="lessons" data={data} />, render: (course) => <div><p className="font-bold">{course.lessonCount.toLocaleString("id-ID")} lessons</p><p className="mt-1 text-xs font-semibold text-ocean-900/54">{course.assessmentCount.toLocaleString("id-ID")} assessments</p></div> },
    { key: "learners", header: <SortHeader label="Enrollments" sort="enrollments" data={data} />, render: (course) => <div><p className="font-bold">{course.enrollmentCount.toLocaleString("id-ID")} enrolled</p><p className="mt-1 text-xs font-semibold text-ocean-900/54">{course.completedCount.toLocaleString("id-ID")} completed</p></div> },
    { key: "outcomes", header: "Outcomes", render: (course) => <div><p className="font-bold">{course.attemptCount.toLocaleString("id-ID")} attempts</p><p className="mt-1 text-xs font-semibold text-ocean-900/54">{course.certificateCount.toLocaleString("id-ID")} certificates</p></div> },
    { key: "updated", header: <SortHeader label="Updated" sort="updatedAt" data={data} />, render: (course) => <time dateTime={course.updatedAt.toISOString()} className="whitespace-nowrap font-semibold text-ocean-900/68">{course.updatedAt.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</time> },
    { key: "actions", header: <span className="sr-only">Actions</span>, className: "text-right", render: (course) => <Link href={`/admin/academy/courses/${course.id}`} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700">Manage</Link> }
  ];

  return <div className="space-y-6">
    <AdminPageHeader eyebrow="Academy" title="Academy management" description="Create courses, search the learning catalog, and open a focused course workspace for lessons and assessments." />
    {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
    {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

    <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="Academy summary">
      <SummaryMetric label="Filtered courses" value={data.metrics.courses.toLocaleString("id-ID")} icon={GraduationCap} />
      <SummaryMetric label="Published" value={data.metrics.published.toLocaleString("id-ID")} icon={ClipboardCheck} />
      <SummaryMetric label="Lessons" value={data.metrics.lessons.toLocaleString("id-ID")} icon={BookOpenCheck} />
      <SummaryMetric label="Enrollments" value={data.metrics.enrollments.toLocaleString("id-ID")} icon={UsersRound} />
      <SummaryMetric label="Attempts" value={data.metrics.attempts.toLocaleString("id-ID")} icon={BarChart3} />
      <SummaryMetric label="Certificates" value={data.metrics.certificates.toLocaleString("id-ID")} icon={ClipboardCheck} />
    </section>

    <form action={createAcademyCourseAction} encType="multipart/form-data" className={`${adminPanelClassName} p-4`}>
      <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold tracking-normal text-ocean-900">Create course</h2><p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Start with course metadata, then add lessons and assessments from the course editor.</p></div><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-coral-100 text-coral-700"><Plus className="size-5" aria-hidden="true" /></span></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Title"><input name="title" className={adminInputClassName} placeholder="Mangrove restoration basics" required /></Field>
        <Field label="Slug"><input name="slug" className={adminInputClassName} placeholder="mangrove-restoration-basics" /></Field>
        <Field label="Level"><input name="level" defaultValue="Beginner" className={adminInputClassName} required /></Field>
        <Field label="Duration minutes"><input name="durationMinutes" type="number" min={1} defaultValue={60} className={adminInputClassName} required /></Field>
        <Field label="Status"><CourseStatusSelect /></Field>
        <Field label="Upload image"><input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} /></Field>
        <Field label="Summary" className="md:col-span-2"><textarea name="summary" className={adminTextareaClassName} placeholder="Short catalog summary" required /></Field>
        <Field label="Description" className="md:col-span-2 xl:col-span-4"><textarea name="description" className={adminTextareaClassName} placeholder="Longer course description" /></Field>
      </div>
      <Button type="submit" className="mt-4 rounded-lg"><Plus className="size-4" aria-hidden="true" />Create Course</Button>
    </form>

    <AdminListToolbar action={pathname} searchValue={data.filters.q} searchPlaceholder="Search course title, slug, level, or summary" clearHref={pathname} hiddenFields={{ sort: data.filters.sort === "updatedAt" ? undefined : data.filters.sort, dir: data.filters.dir === "desc" ? undefined : data.filters.dir }}>
      <label className="sr-only" htmlFor="academy-status">Status</label>
      <select id="academy-status" name="status" defaultValue={data.filters.status} className={cn(adminSelectClassName, "min-w-36")}><option value="all">All statuses</option>{courseStatuses.map((status) => <option key={status} value={status}>{labelize(status)}</option>)}</select>
      <label className="sr-only" htmlFor="academy-level">Level</label>
      <select id="academy-level" name="level" defaultValue={data.filters.level} className={cn(adminSelectClassName, "min-w-36")}><option value="">All levels</option>{data.levelOptions.map((level) => <option key={level} value={level}>{level}</option>)}</select>
    </AdminListToolbar>

    <AdminDataTable caption="Academy course directory" columns={columns} rows={data.courses} getRowKey={(course) => course.id} emptyState={<AdminEmptyState title="No courses match these filters" description="Adjust search or filters, or create a new course." />} />
    <AdminPagination pathname={pathname} params={baseParams} pagination={data.pagination} />
  </div>;
}
