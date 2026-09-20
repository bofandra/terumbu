import { Flag, MessageCircle, ShieldCheck, Target, Users } from "lucide-react";
import Link from "next/link";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminConfirmSubmit } from "@/components/admin/admin-confirm-submit";
import { AdminListToolbar } from "@/components/admin/admin-list-toolbar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminSelectClassName } from "@/components/admin-ui";
import { CommunityStatusBadge } from "@/components/community-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { requireRole } from "@/lib/auth";
import { moderateCommunityContentAction, reviewCommunityReportAction } from "@/lib/community-actions";
import { getAdminCommunityPage, type AdminCommunityFilters } from "@/lib/community-queries";

export const metadata = { title: "Admin Community" };
export const dynamic = "force-dynamic";

const pathname = "/admin/community";

type CommunitySearchParams = AdminCommunityFilters & { saved?: string; error?: string; workspace?: string };

type AdminCommunityPageProps = {
  searchParams?: Promise<CommunitySearchParams>;
};

const savedMessages: Record<string, string> = {
  moderation: "Community moderation action saved.",
  report: "Community report reviewed."
};

const errorMessages: Record<string, string> = {
  target: "Community target was not found.",
  permission: "You do not have permission for that action.",
  "delete-confirmation": "Confirm deletion before permanently removing community content from the active experience."
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function targetHref(type: string, slug?: string) {
  if (!slug) return pathname;
  if (type === "post") return `/community/posts/${slug}`;
  if (type === "event") return `/community/events/${slug}`;
  if (type === "challenge") return `/community/challenges/${slug}`;
  return "/community";
}

function currentCommunityPath(params: CommunitySearchParams, workspace: string) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "saved" || key === "error" || value === undefined) continue;
    const item = Array.isArray(value) ? value[0] : value;
    if (item) search.set(key, item);
  }
  search.set("workspace", workspace);
  return `${pathname}?${search.toString()}`;
}

function ModerationForm({ targetType, targetId, targetLabel, next }: { targetType: "post" | "event" | "challenge" | "comment"; targetId: string; targetLabel: string; next: string }) {
  const deleteFormId = `delete-community-${targetType}-${targetId}`;

  return (
    <div className="mt-3 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-start">
      <form action={moderateCommunityContentAction} className="flex flex-wrap gap-2">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="next" value={next} />
        <select name="action" defaultValue="hide" className={`${adminSelectClassName} min-h-10`}>
          <option value="hide">Hide</option><option value="restore">Restore</option><option value="archive">Archive</option>
        </select>
        <input name="reason" placeholder="Moderation reason" className={`${adminInputClassName} min-h-10 min-w-52`} />
        <Button type="submit" tone="secondary" className="min-h-10 px-3"><ShieldCheck size={16} aria-hidden="true" />Apply</Button>
      </form>
      <div className="flex flex-wrap items-start justify-end gap-2">
        <form id={deleteFormId} action={moderateCommunityContentAction} className="flex min-w-56 flex-1">
          <input type="hidden" name="targetType" value={targetType} /><input type="hidden" name="targetId" value={targetId} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="next" value={next} />
          <input name="reason" aria-label={`Deletion reason for ${targetLabel}`} placeholder="Deletion reason" className={`${adminInputClassName} min-h-10`} required />
        </form>
        <AdminConfirmSubmit formId={deleteFormId} title={`Delete ${targetType}?`} body={`Delete “${targetLabel}” from the active community experience? This destructive moderation action will be recorded in the audit log.`} triggerLabel="Delete" submitLabel={`Delete ${targetType}`} />
      </div>
    </div>
  );
}

function StatusSelect({ name, value, options }: { name: string; value: string; options: string[] }) {
  return <select name={name} defaultValue={value} className={`${adminSelectClassName} min-h-10`}><option value="all">All statuses</option>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select>;
}

function VisibilitySelect({ name, value }: { name: string; value: string }) {
  return <select name={name} defaultValue={value} className={`${adminSelectClassName} min-h-10`}><option value="all">All visibility</option><option value="active">Active</option><option value="hidden">Hidden</option><option value="deleted">Deleted</option></select>;
}

export default async function AdminCommunityPage({ searchParams }: AdminCommunityPageProps) {
  await requireRole(["admin"], pathname);
  const params = (await searchParams) ?? {};
  const data = await getAdminCommunityPage(params);
  const savedMessage = params.saved ? savedMessages[params.saved] : null;
  const errorMessage = params.error ? errorMessages[params.error] : null;
  const workspace = ["reports", "posts", "events", "challenges", "chapters"].includes(params.workspace ?? "") ? params.workspace! : "reports";
  const reportNext = currentCommunityPath(params, "reports");
  const postNext = currentCommunityPath(params, "posts");
  const eventNext = currentCommunityPath(params, "events");
  const challengeNext = currentCommunityPath(params, "challenges");

  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Community" title="Community moderation" description="Review reports and moderate community publishing with server-side search, filters, and pagination." actionHref="/community" actionLabel="Open Community" />
      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="Community summary">
        {[
          { label: "Posts", value: data.stats.posts, icon: MessageCircle },
          { label: "Events", value: data.stats.events, icon: Users },
          { label: "Challenges", value: data.stats.challenges, icon: Target },
          { label: "Open reports", value: data.stats.openReports, icon: Flag },
          { label: "Score issued", value: data.stats.score, icon: ShieldCheck }
        ].map((item) => { const Icon = item.icon; return <article key={item.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft"><Icon className="size-5 text-coral-700" aria-hidden="true" /><MetricValue className="mt-3 text-ocean-900">{Number(item.value).toLocaleString("id-ID")}</MetricValue><p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p></article>; })}
      </section>

      <FormTabs ariaLabel="Community moderation workflows" defaultTabId={workspace} tabs={[
        { id: "reports", label: "Reports", description: "User reports", badge: data.pagination.reports.totalItems.toLocaleString("id-ID") },
        { id: "posts", label: "Posts", description: "Post moderation", badge: data.pagination.posts.totalItems.toLocaleString("id-ID") },
        { id: "events", label: "Events", description: "Event moderation", badge: data.pagination.events.totalItems.toLocaleString("id-ID") },
        { id: "challenges", label: "Challenges", description: "Challenge moderation", badge: data.pagination.challenges.totalItems.toLocaleString("id-ID") },
        { id: "chapters", label: "Chapters", description: "Chapter overview", badge: data.pagination.chapters.totalItems.toLocaleString("id-ID") }
      ]}>
        <section className="grid gap-4">
          <AdminListToolbar action={pathname} searchName="reportQ" pageName="reportPage" searchValue={data.filters.reports.q} searchPlaceholder="Search reports, reporters, or target type" clearHref={`${pathname}?workspace=reports`} hiddenFields={{ workspace: "reports" }}>
            <StatusSelect name="reportStatus" value={data.filters.reports.status} options={data.options.reportStatuses} />
          </AdminListToolbar>
          <div className="divide-y divide-ocean-900/10 rounded-lg border border-ocean-900/10 bg-white">
            {data.reports.length ? data.reports.map((report) => <article key={report.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-ocean-900">{report.reason}</p><p className="mt-1 text-sm font-semibold text-ocean-900/58">{report.targetType} / {report.reporterName} / {formatDate(report.createdAt)}</p>{report.detail ? <p className="mt-2 text-sm leading-6 text-ocean-900/62">{report.detail}</p> : null}</div><AdminStatusBadge value={report.status} /></div><form action={reviewCommunityReportAction} className="mt-3 flex flex-wrap gap-2"><input type="hidden" name="reportId" value={report.id} /><input type="hidden" name="next" value={reportNext} /><select name="status" defaultValue="reviewed" className={`${adminSelectClassName} min-h-10`}><option value="reviewed">Reviewed</option><option value="dismissed">Dismissed</option><option value="actioned">Actioned</option></select><input name="actionTaken" placeholder="Action taken" className={`${adminInputClassName} min-h-10 min-w-52`} /><Button type="submit" tone="secondary" className="min-h-10 px-3">Review</Button></form></article>) : <AdminEmptyState className="m-4" title="No reports match" description="Adjust the report filters or search terms." />}
          </div>
          <AdminPagination pathname={pathname} pageParam="reportPage" params={{ workspace: "reports", reportQ: data.filters.reports.q || undefined, reportStatus: data.filters.reports.status === "all" ? undefined : data.filters.reports.status }} pagination={data.pagination.reports} />
        </section>

        <section className="grid gap-4">
          <AdminListToolbar action={pathname} searchName="postQ" pageName="postPage" searchValue={data.filters.posts.q} searchPlaceholder="Search posts or authors" clearHref={`${pathname}?workspace=posts`} hiddenFields={{ workspace: "posts" }}><StatusSelect name="postStatus" value={data.filters.posts.status} options={data.options.postStatuses} /><VisibilitySelect name="postVisibility" value={data.filters.posts.visibility} /></AdminListToolbar>
          <div className="divide-y divide-ocean-900/10 rounded-lg border border-ocean-900/10 bg-white">{data.posts.length ? data.posts.map((post) => <article key={post.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={targetHref("post", post.slug)} className="font-bold text-ocean-900 hover:text-coral-700">{post.title}</Link><p className="mt-1 text-sm font-semibold text-ocean-900/58">{post.author.name} / {post.commentCount} comments / {post.reportCount ?? 0} open reports</p></div><div className="flex gap-2"><CommunityStatusBadge value={post.status} />{post.hiddenAt ? <AdminStatusBadge value="hidden" /> : null}{post.deletedAt ? <AdminStatusBadge value="deleted" /> : null}</div></div><ModerationForm targetType="post" targetId={post.id} targetLabel={post.title} next={postNext} /></article>) : <AdminEmptyState className="m-4" title="No posts match" description="Adjust the post filters or search terms." />}</div>
          <AdminPagination pathname={pathname} pageParam="postPage" params={{ workspace: "posts", postQ: data.filters.posts.q || undefined, postStatus: data.filters.posts.status === "all" ? undefined : data.filters.posts.status, postVisibility: data.filters.posts.visibility === "all" ? undefined : data.filters.posts.visibility }} pagination={data.pagination.posts} />
        </section>

        <section className="grid gap-4">
          <AdminListToolbar action={pathname} searchName="eventQ" pageName="eventPage" searchValue={data.filters.events.q} searchPlaceholder="Search events, locations, or authors" clearHref={`${pathname}?workspace=events`} hiddenFields={{ workspace: "events" }}><StatusSelect name="eventStatus" value={data.filters.events.status} options={data.options.eventStatuses} /><VisibilitySelect name="eventVisibility" value={data.filters.events.visibility} /></AdminListToolbar>
          <div className="divide-y divide-ocean-900/10 rounded-lg border border-ocean-900/10 bg-white">{data.events.length ? data.events.map((event) => <article key={event.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={targetHref("event", event.slug)} className="font-bold text-ocean-900 hover:text-coral-700">{event.title}</Link><p className="mt-1 text-sm font-semibold text-ocean-900/58">{event.author.name} / {formatDate(event.startsAt)} / {event.registeredCount} registered / {event.reportCount ?? 0} reports</p></div><div className="flex gap-2"><CommunityStatusBadge value={event.status} />{event.hiddenAt ? <AdminStatusBadge value="hidden" /> : null}{event.deletedAt ? <AdminStatusBadge value="deleted" /> : null}</div></div><ModerationForm targetType="event" targetId={event.id} targetLabel={event.title} next={eventNext} /></article>) : <AdminEmptyState className="m-4" title="No events match" description="Adjust the event filters or search terms." />}</div>
          <AdminPagination pathname={pathname} pageParam="eventPage" params={{ workspace: "events", eventQ: data.filters.events.q || undefined, eventStatus: data.filters.events.status === "all" ? undefined : data.filters.events.status, eventVisibility: data.filters.events.visibility === "all" ? undefined : data.filters.events.visibility }} pagination={data.pagination.events} />
        </section>

        <section className="grid gap-4">
          <AdminListToolbar action={pathname} searchName="challengeQ" pageName="challengePage" searchValue={data.filters.challenges.q} searchPlaceholder="Search challenges or authors" clearHref={`${pathname}?workspace=challenges`} hiddenFields={{ workspace: "challenges" }}><StatusSelect name="challengeStatus" value={data.filters.challenges.status} options={data.options.challengeStatuses} /><VisibilitySelect name="challengeVisibility" value={data.filters.challenges.visibility} /></AdminListToolbar>
          <div className="divide-y divide-ocean-900/10 rounded-lg border border-ocean-900/10 bg-white">{data.challenges.length ? data.challenges.map((challenge) => <article key={challenge.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={targetHref("challenge", challenge.slug)} className="font-bold text-ocean-900 hover:text-coral-700">{challenge.title}</Link><p className="mt-1 text-sm font-semibold text-ocean-900/58">{challenge.author.name} / {challenge.participantCount} participants / {challenge.reportCount ?? 0} reports</p></div><div className="flex gap-2"><CommunityStatusBadge value={challenge.status} />{challenge.hiddenAt ? <AdminStatusBadge value="hidden" /> : null}{challenge.deletedAt ? <AdminStatusBadge value="deleted" /> : null}</div></div><ModerationForm targetType="challenge" targetId={challenge.id} targetLabel={challenge.title} next={challengeNext} /></article>) : <AdminEmptyState className="m-4" title="No challenges match" description="Adjust the challenge filters or search terms." />}</div>
          <AdminPagination pathname={pathname} pageParam="challengePage" params={{ workspace: "challenges", challengeQ: data.filters.challenges.q || undefined, challengeStatus: data.filters.challenges.status === "all" ? undefined : data.filters.challenges.status, challengeVisibility: data.filters.challenges.visibility === "all" ? undefined : data.filters.challenges.visibility }} pagination={data.pagination.challenges} />
        </section>

        <section className="grid gap-4">
          <AdminListToolbar action={pathname} searchName="chapterQ" pageName="chapterPage" searchValue={data.filters.chapters.q} searchPlaceholder="Search chapters or regions" clearHref={`${pathname}?workspace=chapters`} hiddenFields={{ workspace: "chapters" }}><StatusSelect name="chapterStatus" value={data.filters.chapters.status} options={data.options.chapterStatuses} /></AdminListToolbar>
          <div className="grid gap-3 md:grid-cols-2">{data.chapters.length ? data.chapters.map((chapter) => <article key={chapter.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4"><Link href={`/community/chapters/${chapter.slug}`} className="font-bold text-ocean-900 hover:text-coral-700">{chapter.name}</Link><p className="mt-1 text-sm font-semibold text-ocean-900/58">{chapter.region}</p><div className="mt-2"><CommunityStatusBadge value={chapter.status} /></div><p className="mt-3 text-xs font-bold text-ocean-900/54">{chapter.memberCount} members / {chapter.postCount} posts / {chapter.eventCount} events / {chapter.challengeCount} challenges</p></article>) : <AdminEmptyState className="md:col-span-2" title="No chapters match" description="Adjust the chapter filters or search terms." />}</div>
          <AdminPagination pathname={pathname} pageParam="chapterPage" params={{ workspace: "chapters", chapterQ: data.filters.chapters.q || undefined, chapterStatus: data.filters.chapters.status === "all" ? undefined : data.filters.chapters.status }} pagination={data.pagination.chapters} />
        </section>
      </FormTabs>
    </div>
  );
}
