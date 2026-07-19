import { Target, Trophy, Users } from "lucide-react";
import { notFound } from "next/navigation";

import {
  CommunityAuthorBadge,
  CommunityCommentForm,
  CommunityCommentThread,
  CommunityImage,
  CommunityStatusBadge,
  CommunityTargetActions,
  communityInputClassName,
  communityTextareaClassName
} from "@/components/community-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { getSessionUser } from "@/lib/auth";
import { joinCommunityChallengeAction, logCommunityChallengeProgressAction } from "@/lib/community-actions";
import { getCommunityChallengeDetail } from "@/lib/community-queries";

export const dynamic = "force-dynamic";

type CommunityChallengePageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Open";
}

export async function generateMetadata({ params }: CommunityChallengePageProps) {
  const { slug } = await params;
  const data = await getCommunityChallengeDetail(slug);

  return {
    title: data ? data.challenge.title : "Community Challenge"
  };
}

export default async function CommunityChallengePage({ params }: CommunityChallengePageProps) {
  const [{ slug }, user] = await Promise.all([params, getSessionUser()]);
  const data = await getCommunityChallengeDetail(slug, user?.id);

  if (!data) {
    notFound();
  }

  const next = `/community/challenges/${data.challenge.slug}`;
  const progress = data.challenge.currentParticipation ? Math.min(100, Math.round((data.challenge.currentParticipation.progressTotal / data.challenge.goalTarget) * 100)) : 0;

  return (
    <main className="bg-sand-50">
      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.38fr] lg:px-8">
          <div>
            <ButtonLink href="/community#challenges" tone="ghost" className="px-0 hover:bg-transparent hover:text-coral-700">
              Community challenges
            </ButtonLink>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CommunityStatusBadge value={data.challenge.status} />
              <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{data.challenge.challengeType}</span>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">{data.challenge.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-ocean-900/68">{data.challenge.summary}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-ocean-900/62">
              <span className="inline-flex items-center gap-2"><Target size={17} aria-hidden="true" />{data.challenge.goalTarget} {data.challenge.unit}</span>
              <span className="inline-flex items-center gap-2"><Users size={17} aria-hidden="true" />{data.challenge.participantCount} participants</span>
              <span className="inline-flex items-center gap-2"><Trophy size={17} aria-hidden="true" />{data.challenge.completedCount} completed</span>
            </div>
            <div className="mt-6">
              <CommunityAuthorBadge author={data.challenge.author} detail={data.challenge.chapter?.name ?? `${formatDate(data.challenge.startsAt)} - ${formatDate(data.challenge.endsAt)}`} />
            </div>
          </div>

          <aside id="progress" className="rounded-lg border border-ocean-900/10 bg-sand-50 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Your progress</p>
            {data.challenge.currentParticipation ? (
              <>
                <p className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">
                  {data.challenge.currentParticipation.progressTotal}/{data.challenge.goalTarget}
                </p>
                <ProgressMeter value={progress} label={`${data.challenge.title} personal progress`} className="mt-4 h-2" />
                <form action={logCommunityChallengeProgressAction} encType="multipart/form-data" className="mt-5 grid gap-3">
                  <input type="hidden" name="challengeId" value={data.challenge.id} />
                  <input type="hidden" name="next" value={next} />
                  <input name="amount" type="number" min={1} defaultValue={1} className={communityInputClassName} required />
                  <textarea name="note" placeholder="Progress note" className={communityTextareaClassName} />
                  <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={communityInputClassName} />
                  <Button type="submit">Log Progress</Button>
                </form>
              </>
            ) : (
              <form action={joinCommunityChallengeAction} className="mt-5">
                <input type="hidden" name="challengeId" value={data.challenge.id} />
                <input type="hidden" name="next" value={next} />
                <Button type="submit" className="w-full">Join Challenge</Button>
              </form>
            )}
          </aside>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.4fr] lg:px-8">
        <div className="space-y-6">
          {data.challenge.imageUrl ? <CommunityImage src={data.challenge.imageUrl} alt={data.challenge.title} className="aspect-[16/9] w-full rounded-lg object-cover shadow-soft" /> : null}
          <article className="rounded-lg border border-ocean-900/10 bg-white p-5 text-base leading-8 text-ocean-900/76 shadow-soft">
            {data.challenge.description?.split(/\n+/).map((paragraph) => (
              <p key={paragraph} className="mb-4 last:mb-0">{paragraph}</p>
            ))}
          </article>
          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Discussion</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Challenge thread</h2>
              </div>
              <CommunityTargetActions targetType="challenge" targetId={data.challenge.id} next={next} reactionType={data.reactionType} />
            </div>
            <div className="mt-5">
              <CommunityCommentForm targetType="challenge" targetId={data.challenge.id} next={next} />
            </div>
            <div className="mt-5">
              {data.comments.length > 0 ? (
                <CommunityCommentThread comments={data.comments} targetType="challenge" targetId={data.challenge.id} next={next} />
              ) : (
                <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">No comments yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Leaderboard</p>
            <div className="mt-5 grid gap-3">
              {data.leaderboard.length > 0 ? (
                data.leaderboard.map((entry, index) => (
                  <div key={entry.userId} className="flex items-center justify-between gap-3 rounded-lg bg-sand-50 px-3 py-3">
                    <CommunityAuthorBadge author={{ name: `${index + 1}. ${entry.name}`, initials: entry.initials }} detail={entry.status} />
                    <span className="text-sm font-bold text-coral-700">{entry.progressTotal} {data.challenge.unit}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold leading-6 text-ocean-900/58">No participants yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Progress log</p>
            <div className="mt-5 grid gap-3">
              {data.progressRows.length > 0 ? (
                data.progressRows.map((row) => (
                  <article key={row.id} className="rounded-lg bg-sand-50 p-3">
                    <CommunityAuthorBadge author={{ name: row.name, initials: row.initials }} detail={`${row.amount} ${data.challenge.unit} / ${formatDate(row.loggedAt)}`} />
                    {row.note ? <p className="mt-3 text-sm leading-6 text-ocean-900/62">{row.note}</p> : null}
                    {row.evidenceUrl ? <CommunityImage src={row.evidenceUrl} alt="Progress evidence" className="mt-3 aspect-[4/3] w-full rounded-lg object-cover" /> : null}
                  </article>
                ))
              ) : (
                <p className="text-sm font-semibold leading-6 text-ocean-900/58">Progress updates will appear here.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
