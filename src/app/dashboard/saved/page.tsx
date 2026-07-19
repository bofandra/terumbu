import { Bell, BookOpen, BookmarkX, CalendarDays, FileText, Star } from "lucide-react";
import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { removeSavedCourseAction } from "@/lib/academy-actions";
import { getRetentionCenterData } from "@/lib/queries";
import { markNotificationReadAction, removeSavedCampaignAction, unfollowCampaignAction } from "@/lib/retention-actions";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Saved Projects"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

export default async function SavedProjectsPage() {
  const user = await requireUser("/dashboard/saved");
  const data = await getRetentionCenterData(user.id);

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Saved Projects</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Your return list</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Projects you saved, campaigns you follow, notifications you can revisit, and monthly reports you generated.
          </p>
        </div>
        <Link href="/campaigns" className="inline-flex min-h-11 items-center rounded-full bg-ocean-900 px-5 text-sm font-bold text-white">
          Explore Campaigns
        </Link>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Saved", data.savedCampaigns.length.toLocaleString("id-ID"), Star],
          ["Courses", data.savedCourses.length.toLocaleString("id-ID"), BookOpen],
          ["Following", data.followedCampaigns.length.toLocaleString("id-ID"), Bell],
          ["Unread", data.notifications.filter((notification) => notification.unread).length.toLocaleString("id-ID"), Bell],
          ["Reports", data.reports.length.toLocaleString("id-ID"), FileText]
        ].map(([label, value, Icon]) => (
          <article key={label as string} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <Icon className="text-coral-500" size={22} aria-hidden="true" />
            <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{value as string}</p>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{label as string}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-normal text-ocean-900">
              <BookOpen size={22} aria-hidden="true" className="text-coral-500" />
              Saved courses
            </h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              {data.savedCourses.length.toLocaleString("id-ID")} course{data.savedCourses.length === 1 ? "" : "s"} ready to revisit.
            </p>
          </div>
          <Link href="/dashboard/academy#saved-courses" className="text-sm font-bold text-coral-700 hover:text-coral-500">
            Academy queue
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.savedCourses.map((course) => (
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
                  <input type="hidden" name="next" value="/dashboard/saved" />
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
        </div>

        {data.savedCourses.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">
            Save courses from the Academy catalog and they will appear here.
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Saved campaigns</h2>
            <span className="text-sm font-bold text-ocean-900/52">{data.savedCampaigns.length.toLocaleString("id-ID")} active</span>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {data.savedCampaigns.map((campaign) => (
              <article key={campaign.slug} className="grid gap-3">
                <CampaignCard campaign={campaign} />
                <form action={removeSavedCampaignAction}>
                  <input type="hidden" name="campaignSlug" value={campaign.slug} />
                  <input type="hidden" name="next" value="/dashboard/saved" />
                  <Button type="submit" tone="light" className="w-full">
                    Remove Saved Project
                  </Button>
                </form>
              </article>
            ))}
          </div>
          {data.savedCampaigns.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/62 shadow-soft">
              Save campaigns from a campaign detail page and they will appear here.
            </p>
          ) : null}
        </div>

        <aside className="grid gap-6">
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Followed updates</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Campaign subscriptions</h2>
            <div className="mt-5 grid gap-3">
              {data.followedCampaigns.map((campaign) => (
                <div key={campaign.slug} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <Link href={`/campaigns/${campaign.slug}`} className="font-bold text-ocean-900 hover:text-coral-700">
                    {campaign.title}
                  </Link>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/54">
                    {campaign.frequency} updates · latest {formatDate(campaign.latestUpdateAt)}
                  </p>
                  <form action={unfollowCampaignAction} className="mt-3">
                    <input type="hidden" name="campaignSlug" value={campaign.slug} />
                    <input type="hidden" name="next" value="/dashboard/saved" />
                    <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">
                      Unfollow
                    </Button>
                  </form>
                </div>
              ))}
              {data.followedCampaigns.length === 0 ? <p className="text-sm font-semibold text-ocean-900/62">Follow a campaign to receive update notifications here.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Recent notifications</p>
            <div className="mt-5 grid gap-3">
              {data.notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={notification.href} className="text-sm font-bold text-ocean-900 hover:text-coral-700">
                      {notification.message}
                    </Link>
                    {notification.unread ? <span className="mt-1 size-2 shrink-0 rounded-full bg-coral-500" aria-label="Unread" /> : null}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-ocean-900/54">
                    {notification.category} · {formatDate(notification.createdAt)}
                  </p>
                  {notification.unread ? (
                    <form action={markNotificationReadAction} className="mt-3">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <input type="hidden" name="next" value="/dashboard/saved" />
                      <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">
                        Mark read
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
              {data.notifications.length === 0 ? <p className="text-sm font-semibold text-ocean-900/62">Notifications will appear here when account or impact activity needs attention.</p> : null}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact reports</p>
            <div className="mt-5 grid gap-3">
              {data.reports.map((report) => (
                <div key={report.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 text-kelp-700" size={18} aria-hidden="true" />
                    <div>
                      <p className="font-bold text-ocean-900">{report.label}</p>
                      <p className="mt-1 text-xs font-semibold text-ocean-900/54">
                        {formatCurrency(report.contributions)} · {report.campaignUpdates} updates · {report.newEvidence} evidence
                      </p>
                      <p className="mt-1 text-xs font-semibold text-ocean-900/42">{report.emailedAt ? `Emailed ${formatDate(report.emailedAt)}` : "Not emailed yet"}</p>
                    </div>
                  </div>
                </div>
              ))}
              {data.reports.length === 0 ? <p className="text-sm font-semibold text-ocean-900/62">Generate a monthly report from the dashboard overview.</p> : null}
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
