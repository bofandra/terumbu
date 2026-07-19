import { Flag, MessageCircle, ShieldCheck, Target, Users } from "lucide-react";
import Link from "next/link";

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminInputClassName, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { CommunityStatusBadge } from "@/components/community-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { moderateCommunityContentAction, reviewCommunityReportAction } from "@/lib/community-actions";
import { getAdminCommunityData } from "@/lib/community-queries";

export const metadata = {
  title: "Admin Community"
};

export const dynamic = "force-dynamic";

type AdminCommunityPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const savedMessages: Record<string, string> = {
  moderation: "Community moderation action saved.",
  report: "Community report reviewed."
};

const errorMessages: Record<string, string> = {
  target: "Community target was not found.",
  permission: "You do not have permission for that action."
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function targetHref(type: string, slug?: string) {
  if (!slug) {
    return "/admin/community";
  }

  if (type === "post") {
    return `/community/posts/${slug}`;
  }

  if (type === "event") {
    return `/community/events/${slug}`;
  }

  if (type === "challenge") {
    return `/community/challenges/${slug}`;
  }

  return "/community";
}

function ModerationForm({ targetType, targetId }: { targetType: "post" | "event" | "challenge" | "comment"; targetId: string }) {
  return (
    <form action={moderateCommunityContentAction} className="mt-3 flex flex-wrap gap-2">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="next" value="/admin/community" />
      <select name="action" defaultValue="hide" className={`${adminSelectClassName} min-h-10`}>
        <option value="hide">Hide</option>
        <option value="restore">Restore</option>
        <option value="archive">Archive</option>
        <option value="delete">Delete</option>
      </select>
      <input name="reason" placeholder="Reason" className={`${adminInputClassName} min-h-10 min-w-52`} />
      <Button type="submit" tone="secondary" className="min-h-10 px-3">
        <ShieldCheck size={16} aria-hidden="true" />
        Apply
      </Button>
    </form>
  );
}

export default async function AdminCommunityPage({ searchParams }: AdminCommunityPageProps) {
  await requireRole(["admin"], "/admin/community");
  const [params, data] = await Promise.all([searchParams, getAdminCommunityData()]);
  const savedMessage = params?.saved ? savedMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Community"
        title="Community moderation"
        description="Review open reports, inspect public community publishing, and moderate posts, events, challenges, chapters, and comments."
        actionHref="/community"
        actionLabel="Open Community"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="Community summary">
        {[
          { label: "Posts", value: data.stats.posts, icon: MessageCircle },
          { label: "Events", value: data.stats.events, icon: Users },
          { label: "Challenges", value: data.stats.challenges, icon: Target },
          { label: "Open reports", value: data.stats.openReports, icon: Flag },
          { label: "Score issued", value: data.stats.score, icon: ShieldCheck }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <Icon className="size-5 text-coral-700" aria-hidden="true" />
              <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{Number(item.value).toLocaleString("id-ID")}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
            </article>
          );
        })}
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Reports</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">User reports are deduplicated per reporter and target.</p>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.reports.length > 0 ? (
            data.reports.map((report) => (
              <article key={report.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{report.reason}</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{report.targetType} / {report.reporterName} / {formatDate(report.createdAt)}</p>
                    {report.detail ? <p className="mt-2 text-sm leading-6 text-ocean-900/62">{report.detail}</p> : null}
                  </div>
                  <AdminStatusBadge value={report.status} />
                </div>
                <form action={reviewCommunityReportAction} className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="reportId" value={report.id} />
                  <input type="hidden" name="next" value="/admin/community" />
                  <select name="status" defaultValue="reviewed" className={`${adminSelectClassName} min-h-10`}>
                    <option value="reviewed">Reviewed</option>
                    <option value="dismissed">Dismissed</option>
                    <option value="actioned">Actioned</option>
                  </select>
                  <input name="actionTaken" placeholder="Action taken" className={`${adminInputClassName} min-h-10 min-w-52`} />
                  <Button type="submit" tone="secondary" className="min-h-10 px-3">Review</Button>
                </form>
              </article>
            ))
          ) : (
            <AdminEmptyState className="m-4" title="No reports" description="Reported community content will appear here." />
          )}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Posts</h2>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.posts.map((post) => (
            <article key={post.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={targetHref("post", post.slug)} className="font-bold text-ocean-900 hover:text-coral-700">{post.title}</Link>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{post.author.name} / {post.commentCount} comments / {post.reportCount ?? 0} open reports</p>
                </div>
                <div className="flex gap-2">
                  <CommunityStatusBadge value={post.status} />
                  {post.hiddenAt ? <AdminStatusBadge value="hidden" /> : null}
                  {post.deletedAt ? <AdminStatusBadge value="deleted" /> : null}
                </div>
              </div>
              <ModerationForm targetType="post" targetId={post.id} />
            </article>
          ))}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Events</h2>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.events.map((event) => (
            <article key={event.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={targetHref("event", event.slug)} className="font-bold text-ocean-900 hover:text-coral-700">{event.title}</Link>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{event.author.name} / {formatDate(event.startsAt)} / {event.registeredCount} registered / {event.reportCount ?? 0} reports</p>
                </div>
                <div className="flex gap-2">
                  <CommunityStatusBadge value={event.status} />
                  {event.hiddenAt ? <AdminStatusBadge value="hidden" /> : null}
                  {event.deletedAt ? <AdminStatusBadge value="deleted" /> : null}
                </div>
              </div>
              <ModerationForm targetType="event" targetId={event.id} />
            </article>
          ))}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Challenges</h2>
        </div>
        <div className="divide-y divide-ocean-900/10">
          {data.challenges.map((challenge) => (
            <article key={challenge.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={targetHref("challenge", challenge.slug)} className="font-bold text-ocean-900 hover:text-coral-700">{challenge.title}</Link>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{challenge.author.name} / {challenge.participantCount} participants / {challenge.reportCount ?? 0} reports</p>
                </div>
                <div className="flex gap-2">
                  <CommunityStatusBadge value={challenge.status} />
                  {challenge.hiddenAt ? <AdminStatusBadge value="hidden" /> : null}
                  {challenge.deletedAt ? <AdminStatusBadge value="deleted" /> : null}
                </div>
              </div>
              <ModerationForm targetType="challenge" targetId={challenge.id} />
            </article>
          ))}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Chapters</h2>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {data.chapters.map((chapter) => (
            <article key={chapter.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <Link href={`/community/chapters/${chapter.slug}`} className="font-bold text-ocean-900 hover:text-coral-700">{chapter.name}</Link>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{chapter.region}</p>
              <p className="mt-3 text-xs font-bold text-ocean-900/54">{chapter.memberCount} members / {chapter.postCount} posts / {chapter.eventCount} events / {chapter.challengeCount} challenges</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
