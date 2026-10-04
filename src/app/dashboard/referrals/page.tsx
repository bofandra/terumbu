import { Award, CheckCircle2, Share2 } from "lucide-react";
import Link from "next/link";

import { ExpeditionShareButtons } from "@/components/expedition-share-buttons";
import { requireUser } from "@/lib/auth";
import { getReferralDashboardData } from "@/lib/queries";
import { getPreferredLocale, type SupportedLocale } from "@/lib/user-preferences";

export const metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

function statusLabel(status: string, locale: SupportedLocale) {
  if (locale !== "id") {
    return status.replaceAll("_", " ");
  }

  const labels: Record<string, string> = {
    confirmed: "dikonfirmasi",
    completed: "selesai",
    pending: "menunggu",
    cancelled: "dibatalkan",
    paid: "dibayar"
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

function rewardCopy(key: string, fallbackLabel: string, fallbackDescription: string, locale: SupportedLocale) {
  if (locale !== "id") {
    return { label: fallbackLabel, description: fallbackDescription };
  }

  const copy: Record<string, { label: string; description: string }> = {
    connector: {
      label: "Ocean Connector",
      description: "Satu traveler terkonfirmasi bergabung melalui undanganmu."
    },
    ambassador: {
      label: "Reef Ambassador",
      description: "Tiga traveler terkonfirmasi bergabung melalui undanganmu."
    },
    guide: {
      label: "Impact Guide",
      description: "Lima traveler terkonfirmasi bergabung melalui undanganmu."
    }
  };

  return copy[key] ?? { label: fallbackLabel, description: fallbackDescription };
}

export default async function DashboardReferralsPage() {
  const user = await requireUser("/dashboard/referrals");
  const [data, locale] = await Promise.all([
    getReferralDashboardData(user.id),
    getPreferredLocale()
  ]);
  const isIndonesian = locale === "id";
  const numberLocale = isIndonesian ? "id-ID" : "en-US";
  const labels =
    isIndonesian
      ? {
          eyebrow: "Undang teman",
          title: "Referral perjalanan konservasi",
          subtitle: "Bagikan ekspedisi yang memang ingin kamu jalani bersama. Terumbu melacak atribusi booking tanpa mengekspos user ID-mu.",
          invitedBookings: "Booking dari undangan",
          travelersAttributed: "Traveler teratribusi",
          confirmedTravelers: "Traveler terkonfirmasi",
          inviteCode: "Kode undanganmu",
          inviteBody: "Pilih ekspedisi lalu gunakan tombol share. Kode referral otomatis ditambahkan ke URL undangan.",
          chooseExpedition: "Pilih ekspedisi untuk dibagikan",
          recentBookings: "Booking referral terbaru",
          recentBody: "Lihat booking yang benar-benar masuk melalui kode undanganmu.",
          traveler: "traveler",
          noBookings: "Belum ada booking referral.",
          noBookingsBody: "Bagikan ekspedisi konservasi kepada seseorang yang memang ingin kamu ajak bepergian.",
          recognition: "Recognition",
          recognitionBody: "Pengakuan berbasis partisipasi; tidak berarti hadiah tunai atau diskon pembayaran.",
          confirmedThreshold: "traveler terkonfirmasi",
          moreToUnlock: "traveler terkonfirmasi lagi untuk membuka"
        }
      : {
          eyebrow: "Travel together",
          title: "Conservation travel referrals",
          subtitle: "Share expeditions you would genuinely want to experience together. Terumbu tracks booking attribution without exposing your user ID.",
          invitedBookings: "Invited bookings",
          travelersAttributed: "Travelers attributed",
          confirmedTravelers: "Confirmed travelers",
          inviteCode: "Your invite code",
          inviteBody: "Choose an expedition and use its share buttons. Your referral code is automatically attached to the invite URL.",
          chooseExpedition: "Choose an expedition to share",
          recentBookings: "Recent referral bookings",
          recentBody: "See bookings that actually arrived through your invite code.",
          traveler: "traveler",
          noBookings: "No referral bookings yet.",
          noBookingsBody: "Share a conservation expedition with someone you would genuinely enjoy traveling with.",
          recognition: "Recognition",
          recognitionBody: "Participation-based recognition; no cash reward or payment discount is implied.",
          confirmedThreshold: "confirmed traveler",
          moreToUnlock: "more confirmed traveler to unlock"
        };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">{labels.subtitle}</p>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          [labels.invitedBookings, data.bookingCount],
          [labels.travelersAttributed, data.participantCount],
          [labels.confirmedTravelers, data.confirmedParticipantCount]
        ].map(([label, value]) => (
          <article key={String(label)} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-3xl font-bold text-ocean-900">{Number(value).toLocaleString(numberLocale)}</p>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{String(label)}</p>
          </article>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-kelp-700">{labels.inviteCode}</p>
            <p className="mt-2 font-mono text-xl font-bold text-ocean-900">{data.referralCode}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/58">{labels.inviteBody}</p>
          </div>
          <Link href="/expeditions" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-kelp-500 px-5 text-sm font-bold text-white">
            <Share2 size={16} aria-hidden="true" /> {labels.chooseExpedition}
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <div>
          <h2 className="text-2xl font-bold text-ocean-900">{labels.recentBookings}</h2>
          <p className="mt-1 text-sm text-ocean-900/58">{labels.recentBody}</p>
        </div>
        <div className="mt-4 grid gap-3">
          {data.bookings.length > 0 ? data.bookings.map((booking) => (
            <article key={booking.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={`/expeditions/${booking.expeditionSlug}`} className="font-bold text-ocean-900 hover:text-coral-700">{booking.expeditionTitle}</Link>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {booking.participantsCount.toLocaleString(numberLocale)} {labels.traveler}{booking.participantsCount === 1 || isIndonesian ? "" : "s"} · {booking.bookedAt.toLocaleDateString(numberLocale, { dateStyle: "medium" })}
                  </p>
                </div>
                <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{statusLabel(booking.status, locale)}</span>
              </div>
              <div className="mt-4">
                <ExpeditionShareButtons slug={booking.expeditionSlug} title={booking.expeditionTitle} referralCode={data.referralCode} compact locale={locale} />
              </div>
            </article>
          )) : (
            <div className="rounded-2xl border border-dashed border-ocean-900/16 bg-white p-6">
              <p className="font-bold text-ocean-900">{labels.noBookings}</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/58">{labels.noBookingsBody}</p>
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <Award className="text-coral-500" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold text-ocean-900">{labels.recognition}</h2>
            <p className="text-sm text-ocean-900/58">{labels.recognitionBody}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {data.rewards.map((reward) => {
            const copy = rewardCopy(reward.key, reward.label, reward.description, locale);

            return (
              <article key={reward.key} className={`rounded-xl border p-4 ${reward.unlocked ? "border-kelp-500/30 bg-kelp-100/50" : "border-ocean-900/10 bg-sand-50"}`}>
                {reward.unlocked ? <CheckCircle2 className="text-kelp-600" size={20} /> : <Award className="text-ocean-900/32" size={20} />}
                <p className="mt-3 font-bold text-ocean-900">{copy.label}</p>
                <p className="mt-1 text-xs leading-5 text-ocean-900/58">{copy.description}</p>
                <p className="mt-3 text-xs font-bold text-ocean-900/48">
                  {reward.threshold.toLocaleString(numberLocale)} {labels.confirmedThreshold}{reward.threshold === 1 || isIndonesian ? "" : "s"}
                </p>
              </article>
            );
          })}
        </div>
        {data.nextReward ? (() => {
          const nextCopy = rewardCopy(data.nextReward.key, data.nextReward.label, data.nextReward.description, locale);

          return (
            <p className="mt-4 rounded-xl bg-ocean-50 px-4 py-3 text-sm font-semibold text-ocean-900/68">
              {data.remainingToNext.toLocaleString(numberLocale)} {labels.moreToUnlock}{data.remainingToNext === 1 || isIndonesian ? "" : "s"} <strong>{nextCopy.label}</strong>.
            </p>
          );
        })() : null}
      </section>
    </main>
  );
}
