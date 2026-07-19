import { CalendarDays, Flag, MessageCircle, Plus, Target, Trophy } from "lucide-react";
import Link from "next/link";

import { CommunityStatusBadge } from "@/components/community-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireUser } from "@/lib/auth";
import { deleteCommunityChallengeAction, deleteCommunityEventAction, deleteCommunityPostAction } from "@/lib/community-actions";
import { getDashboardCommunityData } from "@/lib/community-queries";

export const metadata = {
  title: "My Community"
};

export const dynamic = "force-dynamic";

type DashboardCommunityPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const savedMessages: Record<string, string> = {
  post: "Community post published.",
  event: "Community event published.",
  challenge: "Community challenge published.",
  deleted: "Community item deleted."
};

const errorMessages: Record<string, string> = {
  "post-invalid": "Enter a post title and body.",
  "event-invalid": "Enter event title, timing, location, summary, and description.",
  "challenge-invalid": "Enter challenge title, summary, description, and valid dates.",
  "image-type": "Upload a PNG, JPEG, WebP, or GIF image.",
  "image-size": "Upload an image under the current size limit.",
  permission: "You do not have permission for that action."
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Open";
}

export default async function DashboardCommunityPage({ searchParams }: DashboardCommunityPageProps) {
  const [params, user] = await Promise.all([searchParams, requireUser("/dashboard/community")]);
  const data = await getDashboardCommunityData(user.id);
  const savedMessage = params?.saved ? savedMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My Community</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Posts, events, challenges, and participation</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Manage your community publishing, track event RSVPs, continue challenge progress, and review reports you submitted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/dashboard/community/new">
            <Plus size={17} aria-hidden="true" />
            Create
          </ButtonLink>
          <ButtonLink href="/community" tone="secondary">
            Open Community
          </ButtonLink>
        </div>
      </header>

      {savedMessage ? <p className="mt-6 rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="mt-6 rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Community score", value: data.scoreLabel, icon: Trophy },
          { label: "Posts", value: data.posts.length.toLocaleString("id-ID"), icon: MessageCircle },
          { label: "Event RSVPs", value: data.registrations.length.toLocaleString("id-ID"), icon: CalendarDays },
          { label: "Challenges", value: data.participations.length.toLocaleString("id-ID"), icon: Target }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon className="text-coral-500" size={22} aria-hidden="true" />
              <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.42fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Publishing</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Your posts</h2>
            <div className="mt-5 grid gap-3">
              {data.posts.length > 0 ? (
                data.posts.map((post) => (
                  <article key={post.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/community/posts/${post.slug}`} className="font-bold text-ocean-900 hover:text-coral-700">{post.title}</Link>
                        <p className="mt-1 text-xs font-semibold text-ocean-900/54">{post.commentCount} comments / {post.reactionCount} reactions / {formatDate(post.createdAt)}</p>
                      </div>
                      <CommunityStatusBadge value={post.status} />
                    </div>
                    <form action={deleteCommunityPostAction} className="mt-3">
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="next" value="/dashboard/community" />
                      <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">Delete</Button>
                    </form>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">Your community posts will appear here.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Hosted events</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Events you published</h2>
            <div className="mt-5 grid gap-3">
              {data.events.length > 0 ? (
                data.events.map((event) => (
                  <article key={event.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/community/events/${event.slug}`} className="font-bold text-ocean-900 hover:text-coral-700">{event.title}</Link>
                        <p className="mt-1 text-xs font-semibold text-ocean-900/54">{formatDate(event.startsAt)} / {event.registeredCount} registered / {event.waitlistCount} waitlisted</p>
                      </div>
                      <CommunityStatusBadge value={event.status} />
                    </div>
                    <form action={deleteCommunityEventAction} className="mt-3">
                      <input type="hidden" name="eventId" value={event.id} />
                      <input type="hidden" name="next" value="/dashboard/community" />
                      <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">Delete</Button>
                    </form>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">Events you publish will appear here.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Hosted challenges</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Challenges you published</h2>
            <div className="mt-5 grid gap-3">
              {data.challenges.length > 0 ? (
                data.challenges.map((challenge) => (
                  <article key={challenge.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link href={`/community/challenges/${challenge.slug}`} className="font-bold text-ocean-900 hover:text-coral-700">{challenge.title}</Link>
                        <p className="mt-1 text-xs font-semibold text-ocean-900/54">{challenge.participantCount} participants / {challenge.completedCount} completed</p>
                      </div>
                      <CommunityStatusBadge value={challenge.status} />
                    </div>
                    <form action={deleteCommunityChallengeAction} className="mt-3">
                      <input type="hidden" name="challengeId" value={challenge.id} />
                      <input type="hidden" name="next" value="/dashboard/community" />
                      <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">Delete</Button>
                    </form>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">Challenges you publish will appear here.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">RSVPs</p>
            <div className="mt-5 grid gap-3">
              {data.registrations.length > 0 ? (
                data.registrations.map((registration) => (
                  <Link key={`${registration.eventId}-${registration.status}`} href={`/community/events/${registration.slug}`} className="rounded-lg bg-sand-50 p-3 hover:bg-ocean-50">
                    <p className="font-bold text-ocean-900">{registration.title}</p>
                    <p className="mt-1 text-xs font-semibold text-ocean-900/54">{formatDate(registration.startsAt)} / {registration.location}</p>
                    <span className="mt-2 inline-flex"><CommunityStatusBadge value={registration.status} /></span>
                  </Link>
                ))
              ) : (
                <p className="text-sm font-semibold leading-6 text-ocean-900/58">Your RSVPs will appear here.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Challenge progress</p>
            <div className="mt-5 grid gap-3">
              {data.participations.length > 0 ? (
                data.participations.map((participation) => {
                  const progress = Math.min(100, Math.round((participation.progressTotal / participation.goalTarget) * 100));

                  return (
                    <Link key={participation.challengeId} href={`/community/challenges/${participation.slug}`} className="rounded-lg bg-sand-50 p-3 hover:bg-ocean-50">
                      <p className="font-bold text-ocean-900">{participation.title}</p>
                      <ProgressMeter value={progress} label={`${participation.title} progress`} className="mt-3 h-2" />
                      <p className="mt-2 text-xs font-bold text-ocean-900/54">{participation.progressTotal}/{participation.goalTarget} {participation.unit}</p>
                    </Link>
                  );
                })
              ) : (
                <p className="text-sm font-semibold leading-6 text-ocean-900/58">Joined challenges will appear here.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Reports</p>
            <div className="mt-5 grid gap-3">
              {data.reports.length > 0 ? (
                data.reports.map((report) => (
                  <div key={report.id} className="rounded-lg bg-sand-50 p-3">
                    <p className="flex items-center gap-2 text-sm font-bold text-ocean-900"><Flag size={15} aria-hidden="true" />{report.reason}</p>
                    <p className="mt-1 text-xs font-semibold text-ocean-900/54">{report.targetType} / {formatDate(report.createdAt)}</p>
                    <span className="mt-2 inline-flex"><CommunityStatusBadge value={report.status} /></span>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold leading-6 text-ocean-900/58">Reports you submit will appear here.</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
