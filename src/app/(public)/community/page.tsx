import { ArrowRight, CalendarDays, HeartHandshake, MessageCircle, Trophy, Users } from "lucide-react";
import Link from "next/link";

import {
  CommunityChallengeCardView,
  CommunityChapterCardView,
  CommunityEmptyState,
  CommunityEventCardView,
  CommunityPostCardView
} from "@/components/community-ui";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { getCommunityLandingData } from "@/lib/community-queries";

export const metadata = {
  title: "Community"
};

export const dynamic = "force-dynamic";

type CommunityPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const savedMessages: Record<string, string> = {
  post: "Community post published.",
  event: "Community event saved.",
  challenge: "Community challenge saved.",
  reaction: "Reaction updated.",
  report: "Report submitted.",
  chapter: "Chapter membership updated."
};

const errorMessages: Record<string, string> = {
  "post-invalid": "Enter a post title and body.",
  "event-invalid": "Enter event title, timing, location, summary, and description.",
  "challenge-invalid": "Enter challenge title, summary, description, and valid dates.",
  "image-type": "Upload a PNG, JPEG, WebP, or GIF image.",
  "image-size": "Upload an image under the current size limit.",
  event: "That event is unavailable.",
  "event-full": "That event is full and waitlist is closed.",
  challenge: "That challenge is unavailable.",
  chapter: "That chapter is unavailable."
};

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const [params, user] = await Promise.all([searchParams, getSessionUser()]);
  const data = await getCommunityLandingData(user?.id);
  const savedMessage = params?.saved ? savedMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <main className="bg-sand-50">
      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.42fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Community</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">Feed, events, challenges, chapters, and Ocean Hero momentum</h1>
            <div className="mt-6 flex flex-wrap gap-2">
              {[
                ["Feed", "#feed", MessageCircle],
                ["Events", "#events", CalendarDays],
                ["Challenges", "#challenges", HeartHandshake],
                ["Chapters", "#chapters", Users],
                ["Leaderboard", "#leaderboard", Trophy]
              ].map(([label, href, Icon]) => {
                const CommunityIcon = Icon as typeof MessageCircle;

                return (
                  <Link key={String(href)} href={String(href)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ocean-900/10 bg-sand-50 px-4 text-sm font-bold text-ocean-900 hover:border-coral-500">
                    <CommunityIcon size={16} aria-hidden="true" />
                    {String(label)}
                  </Link>
                );
              })}
            </div>
          </div>
          <aside className="rounded-lg bg-ocean-900 p-5 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-200">Dashboard publishing</p>
            <p className="mt-3 text-sm leading-6 text-white/72">
              Create posts, events, and challenges from your dashboard. This page stays focused on browsing, joining, and discussion.
            </p>
            {user ? (
              <ButtonLink href="/dashboard/community/new" tone="light" className="mt-5">
                Create in Dashboard
                <ArrowRight size={17} aria-hidden="true" />
              </ButtonLink>
            ) : (
              <ButtonLink href="/login?next=/dashboard/community/new" tone="light" className="mt-5">
                Login to participate
                <ArrowRight size={17} aria-hidden="true" />
              </ButtonLink>
            )}
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
        {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.34fr]">
          <div className="space-y-8">
            <section id="feed">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Feed</p>
                  <h2 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Community posts</h2>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {data.posts.length > 0 ? data.posts.map((post) => <CommunityPostCardView key={post.id} post={post} />) : <CommunityEmptyState title="No posts yet" description="Published community posts will appear here." />}
              </div>
            </section>

            <section id="events">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Events</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Upcoming participation</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {data.events.length > 0 ? data.events.map((event) => <CommunityEventCardView key={event.id} event={event} next="/community#events" />) : <CommunityEmptyState title="No events yet" description="Community-led field events and learning sessions will appear here." />}
              </div>
            </section>

            <section id="challenges">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Challenges</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Shared conservation goals</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {data.challenges.length > 0 ? data.challenges.map((challenge) => <CommunityChallengeCardView key={challenge.id} challenge={challenge} next="/community#challenges" />) : <CommunityEmptyState title="No challenges yet" description="Community challenges will appear here once members publish them." />}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section id="leaderboard" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Leaderboard</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Ocean Heroes</h2>
              <div className="mt-5 grid gap-3">
                {data.leaderboard.length > 0 ? (
                  data.leaderboard.map((entry, index) => (
                    <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-lg bg-sand-50 px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-ocean-900 text-xs font-bold text-white">{entry.initials}</span>
                        <div>
                          <p className="text-sm font-bold text-ocean-900">{index + 1}. {entry.name}</p>
                          <p className="text-xs font-semibold text-ocean-900/54">{entry.eventCount} attended events</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-coral-700">{entry.scoreLabel}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold leading-6 text-ocean-900/58">Scores appear after posts, comments, RSVPs, attendance, and challenge completions.</p>
                )}
              </div>
            </section>

            <section id="chapters" className="space-y-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Chapters</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Regional network</h2>
              </div>
              {data.chapters.length > 0 ? data.chapters.map((chapter) => <CommunityChapterCardView key={chapter.id} chapter={chapter} next="/community#chapters" />) : <CommunityEmptyState title="No chapters yet" description="Regional chapters will appear here." />}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
