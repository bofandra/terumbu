import { Award, CheckCircle2, Copy, Share2, Users } from "lucide-react";
import Link from "next/link";

import { ExpeditionShareButtons } from "@/components/expedition-share-buttons";
import { requireUser } from "@/lib/auth";
import { getReferralDashboardData } from "@/lib/queries";

export const metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

export default async function DashboardReferralsPage() {
  const user = await requireUser("/dashboard/referrals");
  const data = await getReferralDashboardData(user.id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Travel together</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Your referral impact</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Invite friends into verified conservation travel. Terumbu tracks booking attribution without exposing your user ID.
        </p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["Invited bookings", data.bookingCount],
          ["Travelers attributed", data.participantCount],
          ["Confirmed travelers", data.confirmedParticipantCount]
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-3xl font-bold text-ocean-900">{Number(value).toLocaleString("en-US")}</p>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{String(label)}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-kelp-700">Your invite code</p>
            <p className="mt-2 font-mono text-xl font-bold text-ocean-900">{data.referralCode}</p>
            <p className="mt-2 text-sm leading-6 text-ocean-900/58">Use the share buttons on any expedition. Your code is automatically attached to the invite URL.</p>
          </div>
          <Link href="/expeditions" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-kelp-500 px-5 text-sm font-bold text-white">
            <Share2 size={16} aria-hidden="true" /> Choose an expedition to invite
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Award className="text-coral-500" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold text-ocean-900">Recognition</h2>
            <p className="text-sm text-ocean-900/58">Impact-based recognition; no cash or payment discount is implied.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {data.rewards.map((reward) => (
            <article key={reward.key} className={`rounded-xl border p-4 ${reward.unlocked ? "border-kelp-500/30 bg-kelp-100/50" : "border-ocean-900/10 bg-sand-50"}`}>
              {reward.unlocked ? <CheckCircle2 className="text-kelp-600" size={20} /> : <Award className="text-ocean-900/32" size={20} />}
              <p className="mt-3 font-bold text-ocean-900">{reward.label}</p>
              <p className="mt-1 text-xs leading-5 text-ocean-900/58">{reward.description}</p>
              <p className="mt-3 text-xs font-bold text-ocean-900/48">{reward.threshold} confirmed traveler{reward.threshold === 1 ? "" : "s"}</p>
            </article>
          ))}
        </div>
        {data.nextReward ? (
          <p className="mt-4 rounded-xl bg-ocean-50 px-4 py-3 text-sm font-semibold text-ocean-900/68">
            {data.remainingToNext} more confirmed traveler{data.remainingToNext === 1 ? "" : "s"} to unlock <strong>{data.nextReward.label}</strong>.
          </p>
        ) : null}
      </section>

      <section className="mt-6">
        <h2 className="text-2xl font-bold text-ocean-900">Recent attributed bookings</h2>
        <div className="mt-4 grid gap-3">
          {data.bookings.length > 0 ? data.bookings.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={`/expeditions/${booking.expeditionSlug}`} className="font-bold text-ocean-900 hover:text-coral-700">{booking.expeditionTitle}</Link>
                  <p className="mt-1 text-sm text-ocean-900/58">{booking.participantsCount} traveler{booking.participantsCount === 1 ? "" : "s"} · {booking.bookedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}</p>
                </div>
                <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{booking.status.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-4">
                <ExpeditionShareButtons slug={booking.expeditionSlug} title={booking.expeditionTitle} referralCode={data.referralCode} compact />
              </div>
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-ocean-900/16 bg-white p-6 text-sm font-semibold text-ocean-900/58">
              No attributed bookings yet. Share a conservation expedition with someone you would genuinely enjoy traveling with.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
