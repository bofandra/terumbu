import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookmarkX, CalendarDays, CheckCircle2, Heart, MapPin, RefreshCw, ShieldCheck, Star } from "lucide-react";

import { ExpeditionCalendarActions } from "@/components/expedition-calendar-actions";
import { submitExpeditionMediaAction } from "@/lib/expedition-media-actions";
import { getUserExpeditionMediaSubmissions } from "@/lib/expedition-media";
import { cancelExpeditionReminderAction, scheduleSavedExpeditionReminderAction } from "@/lib/expedition-reminder-actions";
import { getUserExpeditionReminders } from "@/lib/expedition-reminders";
import {
  cancelOwnExpeditionBookingAction,
  requestExpeditionRefundAction,
  retryExpeditionPaymentAction
} from "@/lib/billing-actions";
import { submitExpeditionReviewAction } from "@/lib/expedition-review-actions";
import { expeditionReviewStatusLabel, normalizeExpeditionReviewStatus, type ExpeditionReviewStatus } from "@/lib/expedition-reviews";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getExpeditionCards } from "@/lib/queries";
import { getPreferredLocale, type SupportedLocale } from "@/lib/user-preferences";
import { removeSavedExpeditionAction } from "@/lib/retention-actions";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Expeditions"
};

export const dynamic = "force-dynamic";

type DashboardExpeditionsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

function statusClass(status: string) {
  if (status === "paid" || status === "confirmed" || status === "completed") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "failed" || status === "refunded" || status === "cancelled") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

function reviewStatusClass(status: ExpeditionReviewStatus) {
  if (status === "published") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "rejected") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-sand-100 text-ocean-900";
}


function statusLabel(status: string, locale: SupportedLocale) {
  if (locale !== "id") {
    return status.replaceAll("_", " ");
  }

  const labels: Record<string, string> = {
    paid: "dibayar",
    confirmed: "dikonfirmasi",
    completed: "selesai",
    failed: "gagal",
    refunded: "direfund",
    cancelled: "dibatalkan",
    pending: "menunggu",
    active: "aktif",
    published: "dipublikasikan",
    rejected: "ditolak"
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

function bookingAttributionLabel(metadata: unknown, personalLabel: string) {
  const metadataObject = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
  const attribution =
    metadataObject.attribution && typeof metadataObject.attribution === "object" && !Array.isArray(metadataObject.attribution)
      ? (metadataObject.attribution as Record<string, unknown>)
      : null;

  if (attribution?.type === "corporate" && typeof attribution.corporateAccountName === "string") {
    return attribution.corporateAccountName;
  }

  return personalLabel;
}

function reviewStatusDescription(status: ExpeditionReviewStatus | null, locale: SupportedLocale) {
  if (locale === "id") {
    if (status === "published") {
      return "Review yang disetujui tampil di halaman publik ekspedisi sebagai review peserta yang terverifikasi.";
    }

    if (status === "rejected") {
      return "Review belum disetujui. Edit lalu kirim ulang untuk moderasi.";
    }

    if (status === "pending") {
      return "Review sedang menunggu moderasi admin Terumbu sebelum tampil publik.";
    }

    return "Kirim review untuk moderasi admin setelah ekspedisi selesai.";
  }

  if (status === "published") {
    return "Your approved review appears on the expedition public page as a verified completed-participant review.";
  }

  if (status === "rejected") {
    return "Your review was not approved. Edit it and submit again for moderation.";
  }

  if (status === "pending") {
    return "Your review is waiting for Terumbu admin moderation before it appears publicly.";
  }

  return "Submit a review for admin moderation after completing the expedition.";
}

export default async function DashboardExpeditionsPage({ searchParams }: DashboardExpeditionsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard/expeditions");
  const [data, highlightedExpeditions, reminders, mediaSubmissions, locale] = await Promise.all([
    getDashboardData(user.id),
    getExpeditionCards(3),
    getUserExpeditionReminders(user.id),
    getUserExpeditionMediaSubmissions(user.id),
    getPreferredLocale()
  ]);
  const isIndonesian = locale === "id";
  const numberLocale = isIndonesian ? "id-ID" : "en-US";
  const dateLocale = numberLocale;
  const labels =
    isIndonesian
      ? {
          expeditions: "Ekspedisi",
          title: "Dari booking ke dampak terverifikasi",
          browseExpeditions: "Jelajahi ekspedisi",
          savedReview: "Terima kasih, review ekspedisimu sudah dikirim untuk moderasi.",
          savedExpedition: "Daftar ekspedisi tersimpan diperbarui.",
          savedMedia: "Media perjalanan dikirim untuk moderasi.",
          savedReminder: "Pengingat ekspedisi dijadwalkan.",
          savedReminderCancelled: "Pengingat ekspedisi dibatalkan.",
          savedRecheck: "Pemeriksaan ulang pembayaran diminta. Admin Platform akan memverifikasi pembayaran booking.",
          savedBookingCancelled: "Booking yang belum dibayar dibatalkan.",
          savedBilling: "Perubahan billing booking tersimpan.",
          errorReview: "Review tersedia setelah ekspedisi selesai. Tambahkan rating dan minimal 10 karakter.",
          errorAvailability: "Departure tersebut tidak lagi memiliki kursi yang cukup untuk pemeriksaan ulang pembayaran.",
          errorSaved: "Ekspedisi tersimpan tidak dapat diperbarui.",
          errorMedia: "Media perjalanan hanya dapat dikirim untuk booking yang sudah selesai. Unggah gambar yang didukung di bawah 1,5 MB atau URL media HTTPS yang valid.",
          errorReminder: "Pengingat tidak dapat dijadwalkan.",
          errorCancel: "Booking ini tidak lagi dapat dibatalkan dari dashboard.",
          errorRefund: "Refund hanya dapat diminta untuk booking berbayar sebelum ekspedisi dimulai.",
          errorBilling: "Aksi billing booking tidak dapat diselesaikan.",
          journeyEyebrow: "Perjalanan ekspedisiku",
          journeyTitle: "Status booking sampai dampak terverifikasi",
          journeyBody: "Booking dan partisipasi yang selesai adalah catatan personalmu. Hasil konservasi tetap merupakan outcome ekspedisi atau kampanye kecuali aktivitas secara eksplisit dicatat untuk peserta individual.",
          currentStage: "Tahap saat ini",
          bookingPayment: "Booking & pembayaran",
          preparation: "Persiapan",
          participation: "Partisipasi",
          fieldActivity: "Aktivitas lapangan",
          verifiedImpact: "Dampak terverifikasi",
          paymentVerified: "Pembayaran terverifikasi",
          payment: "Pembayaran",
          prepComplete: "item persiapan selesai",
          completedConfirmed: "Selesai dan dikonfirmasi",
          notCompleted: "Ekspedisi belum selesai",
          awaitingConfirmation: "Menunggu konfirmasi mitra",
          waitingField: "Menunggu aktivitas lapangan dipublikasikan.",
          noCampaign: "Tidak ada kampanye konservasi terkait.",
          noVerified: "Belum ada outcome terverifikasi.",
          passportEligible: "Partisipasi selesai. Ekspedisi ini memenuhi syarat untuk catatan Impact Passport-mu.",
          journeyEmpty: "Perjalanan ekspedisimu dimulai setelah booking pertama.",
          bookings: "Booking ekspedisiku",
          participant: "peserta",
          personal: "Personal",
          calendarDescription: "Booking ekspedisi Terumbu.eco",
          requestRecheck: "Minta pemeriksaan ulang",
          cancelBooking: "Batalkan booking",
          requestRefund: "Ajukan refund",
          reason: "Alasan",
          refundPlaceholder: "Jelaskan alasan kamu membutuhkan refund.",
          submitRefund: "Kirim permintaan refund",
          yourReview: "Review ekspedisimu",
          reviewCompleted: "Review ekspedisi yang selesai",
          rating: "Rating",
          stars: "bintang",
          reviewTitle: "Judul review",
          reviewTitlePlaceholder: "Bermakna dan dikelola dengan baik",
          review: "Review",
          reviewPlaceholder: "Bagikan hal yang perlu diketahui calon peserta.",
          submitUpdatedReview: "Kirim Review Terbaru",
          submitReview: "Kirim Review",
          travelerMoments: "Bagikan momen perjalanan",
          travelerMomentsBody: "Peserta yang sudah selesai dapat mengirim foto atau tautan video. Admin Platform meninjau setiap submission sebelum tampil publik.",
          submitted: "dikirim",
          mediaType: "Jenis media",
          photo: "Foto",
          videoLink: "Tautan video",
          photoUpload: "Unggah foto",
          mediaUrl: "URL foto atau video",
          mediaUrlOptional: "(opsional jika mengunggah foto)",
          caption: "Caption",
          captionPlaceholder: "Apa yang sedang terjadi dan apa yang kamu pelajari?",
          submitForReview: "Kirim untuk review",
          noBookings: "Belum ada booking ekspedisi.",
          findFirstTrip: "Cari trip konservasi pertamamu",
          exploreEyebrow: "Jelajahi berikutnya",
          exploreTitle: "Temukan ekspedisi lain",
          exploreBody: "Pilih aktivitas lapangan terbaru atau jelajahi seluruh katalog ekspedisi.",
          browseAll: "Jelajahi semua",
          detail: "Detail",
          savedTrips: "Trip tersimpan",
          savedTrip: "ekspedisi tersimpan",
          from: "mulai",
          saved: "Disimpan",
          remind3: "Ingatkan dalam 3 hari",
          remind7: "Ingatkan dalam 7 hari",
          remind14: "Ingatkan dalam 14 hari",
          remind30: "Ingatkan dalam 30 hari",
          remindMe: "Ingatkan saya",
          remove: "Hapus",
          removeSavedAria: "Hapus ekspedisi tersimpan",
          savedEmpty: "Simpan ekspedisi dari halaman trip agar dapat dibandingkan sebelum booking.",
          reminders: "Pengingat terjadwal",
          remindersBody: "Pengingat in-app dan email mengikuti preferensi notifikasi ekspedisimu.",
          reminder: "Pengingat",
          cancelReminder: "Batalkan pengingat"
        }
      : {
          expeditions: "Expeditions",
          title: "From booking to verified impact",
          browseExpeditions: "Browse expeditions",
          savedReview: "Thanks, your expedition review was submitted for moderation.",
          savedExpedition: "Saved expeditions updated.",
          savedMedia: "Traveler media submitted for moderation.",
          savedReminder: "Expedition reminder scheduled.",
          savedReminderCancelled: "Expedition reminder cancelled.",
          savedRecheck: "Payment recheck requested. Platform Admin will verify the booking payment.",
          savedBookingCancelled: "Unpaid booking cancelled.",
          savedBilling: "Booking billing changes saved.",
          errorReview: "Reviews are available after expedition completion. Add a rating and at least 10 characters.",
          errorAvailability: "That departure no longer has enough available seats for payment recheck.",
          errorSaved: "Could not update that saved expedition.",
          errorMedia: "Traveler media can only be submitted for completed bookings. Upload a supported image under 1.5 MB or provide a valid HTTPS media URL.",
          errorReminder: "Could not schedule that reminder.",
          errorCancel: "This booking can no longer be cancelled from your dashboard.",
          errorRefund: "Refund can only be requested for a paid booking before the expedition starts.",
          errorBilling: "Could not complete that booking billing action.",
          journeyEyebrow: "My expedition journey",
          journeyTitle: "Booking status to verified impact",
          journeyBody: "Your booking and completed participation are personal records. Conservation results remain expedition or campaign outcomes unless an activity is explicitly recorded for an individual participant.",
          currentStage: "Current stage",
          bookingPayment: "Booking & payment",
          preparation: "Preparation",
          participation: "Participation",
          fieldActivity: "Field activity",
          verifiedImpact: "Verified impact",
          paymentVerified: "Payment verified",
          payment: "Payment",
          prepComplete: "preparation items complete",
          completedConfirmed: "Completed and confirmed",
          notCompleted: "Expedition not completed yet",
          awaitingConfirmation: "Awaiting partner confirmation",
          waitingField: "Waiting for published field activity.",
          noCampaign: "No related conservation campaign.",
          noVerified: "No verified outcome yet.",
          passportEligible: "Participation completed. This expedition is eligible for your Impact Passport record.",
          journeyEmpty: "Your expedition journey starts after your first booking.",
          bookings: "My expedition bookings",
          participant: "participant",
          personal: "Personal",
          calendarDescription: "Terumbu.eco expedition booking",
          requestRecheck: "Request recheck",
          cancelBooking: "Cancel booking",
          requestRefund: "Request refund",
          reason: "Reason",
          refundPlaceholder: "Tell us why you need a refund.",
          submitRefund: "Submit refund request",
          yourReview: "Your expedition review",
          reviewCompleted: "Review this completed expedition",
          rating: "Rating",
          stars: "stars",
          reviewTitle: "Review title",
          reviewTitlePlaceholder: "Purposeful and well-run",
          review: "Review",
          reviewPlaceholder: "Share what future participants should know.",
          submitUpdatedReview: "Submit Updated Review",
          submitReview: "Submit Review",
          travelerMoments: "Share traveler moments",
          travelerMomentsBody: "Completed participants can submit photos or video links. Platform Admin reviews every submission before it appears publicly.",
          submitted: "submitted",
          mediaType: "Media type",
          photo: "Photo",
          videoLink: "Video link",
          photoUpload: "Photo upload",
          mediaUrl: "Photo or video URL",
          mediaUrlOptional: "(optional for photo upload)",
          caption: "Caption",
          captionPlaceholder: "What was happening, and what did you learn?",
          submitForReview: "Submit for review",
          noBookings: "No expedition bookings yet.",
          findFirstTrip: "Find your first conservation trip",
          exploreEyebrow: "Explore next",
          exploreTitle: "Discover another expedition",
          exploreBody: "Pick one of the latest field activities or browse the full expedition catalog.",
          browseAll: "Browse all",
          detail: "Detail",
          savedTrips: "Saved trips",
          savedTrip: "saved expedition",
          from: "from",
          saved: "Saved",
          remind3: "Remind in 3 days",
          remind7: "Remind in 7 days",
          remind14: "Remind in 14 days",
          remind30: "Remind in 30 days",
          remindMe: "Remind me",
          remove: "Remove",
          removeSavedAria: "Remove saved expedition",
          savedEmpty: "Save expeditions from a trip page to compare them here before booking.",
          reminders: "Scheduled reminders",
          remindersBody: "In-app and email reminders follow your expedition notification preference.",
          reminder: "Reminder",
          cancelReminder: "Cancel reminder"
        };
  const mediaByBooking = new Map<string, typeof mediaSubmissions>();
  for (const submission of mediaSubmissions) {
    const current = mediaByBooking.get(submission.bookingId) ?? [];
    current.push(submission);
    mediaByBooking.set(submission.bookingId, current);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.expeditions}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
        </div>
        <ButtonLink href="/expeditions">{labels.browseExpeditions}</ButtonLink>
      </header>

      {params?.saved ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">
          {params.saved === "review"
            ? labels.savedReview
            : params.saved === "expedition"
              ? labels.savedExpedition
              : params.saved === "media"
                ? labels.savedMedia
                : params.saved === "reminder"
                  ? labels.savedReminder
                  : params.saved === "reminder-cancelled"
                    ? labels.savedReminderCancelled
                    : params.saved === "payment-recheck"
                      ? labels.savedRecheck
                      : params.saved === "booking-cancelled"
                        ? labels.savedBookingCancelled
                        : labels.savedBilling}
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          {params.error.startsWith("review")
            ? labels.errorReview
            : params.error === "availability"
              ? labels.errorAvailability
              : params.error === "expedition"
                ? labels.errorSaved
                : params.error?.startsWith("media")
                  ? labels.errorMedia
                  : params.error === "reminder"
                    ? labels.errorReminder
                    : params.error === "cancel"
                      ? labels.errorCancel
                      : params.error === "refund"
                        ? labels.errorRefund
                        : labels.errorBilling}
        </p>
      ) : null}

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-normal text-ocean-900">{labels.exploreTitle}</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{labels.exploreBody}</p>
          </div>
          <ButtonLink href="/expeditions" tone="secondary">
            {labels.browseAll}
          </ButtonLink>
        </div>
        <div className="mt-4 flex snap-x gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0">
          {highlightedExpeditions.map((expedition) => (
            <Link
              key={expedition.slug}
              href={`/expeditions/${expedition.slug}`}
              className="group grid min-w-[280px] snap-start overflow-hidden rounded-xl border border-ocean-900/10 bg-sand-50 text-left transition hover:border-coral-500 sm:min-w-[320px] lg:min-w-0"
            >
              <div className="relative h-40 bg-ocean-900">
                {expedition.imageUrl ? (
                  <Image src={expedition.imageUrl} alt="" fill className="object-cover transition group-hover:scale-[1.02]" sizes="(min-width: 1024px) 300px, 80vw" />
                ) : null}
              </div>
              <div className="grid gap-2 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{expedition.region}</p>
                <h3 className="text-lg font-bold tracking-normal text-ocean-900 group-hover:text-coral-700">{expedition.title}</h3>
                <p className="line-clamp-2 text-sm leading-6 text-ocean-900/62">{expedition.summary}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-sm font-bold text-ocean-900">
                  <span>{formatCurrency(expedition.price, expedition.currency)}</span>
                  <span className="inline-flex items-center gap-1 text-coral-700">
                    {labels.detail} <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-normal text-ocean-900">
              <Heart size={22} aria-hidden="true" className="text-coral-500" />
              {labels.savedTrips}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              {data.savedExpeditions.length.toLocaleString(numberLocale)} {labels.savedTrip}{data.savedExpeditions.length === 1 ? "" : isIndonesian ? "" : "s"}.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.savedExpeditions.map((expedition) => (
            <article key={expedition.slug} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <Link href={`/expeditions/${expedition.slug}`} className="font-bold text-ocean-900 hover:text-coral-700">
                    {expedition.title}
                  </Link>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {expedition.region} · {expedition.duration} · {labels.from} {formatCurrency(expedition.price, expedition.currency)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-ocean-900/50">
                    {labels.saved} {expedition.savedAt.toLocaleDateString(dateLocale, { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="grid gap-2 sm:justify-items-end">
                  <form action={scheduleSavedExpeditionReminderAction} className="flex items-center gap-2">
                    <input type="hidden" name="expeditionSlug" value={expedition.slug} />
                    <select name="delayDays" defaultValue="7" className="min-h-9 rounded-full border border-ocean-900/10 bg-white px-3 text-xs font-bold text-ocean-900">
                      <option value="3">{labels.remind3}</option>
                      <option value="7">{labels.remind7}</option>
                      <option value="14">{labels.remind14}</option>
                      <option value="30">{labels.remind30}</option>
                    </select>
                    <button type="submit" className="min-h-9 rounded-full bg-kelp-500 px-3 text-xs font-bold text-white hover:bg-kelp-700">
                      {labels.remindMe}
                    </button>
                  </form>
                  <form action={removeSavedExpeditionAction}>
                    <input type="hidden" name="expeditionSlug" value={expedition.slug} />
                    <input type="hidden" name="next" value="/dashboard/expeditions" />
                    <button
                      type="submit"
                      aria-label={labels.removeSavedAria}
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500"
                    >
                      <BookmarkX size={14} aria-hidden="true" />
                      {labels.remove}
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>

        {data.savedExpeditions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">
            {labels.savedEmpty}
          </p>
        ) : null}
      </section>

      {reminders.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-bold tracking-normal text-ocean-900">{labels.reminders}</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">{labels.remindersBody}</p>
          <div className="mt-4 grid gap-3">
            {reminders.map((reminder) => (
              <article key={reminder.id} className="flex flex-col justify-between gap-3 rounded-xl bg-sand-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <Link href={`/expeditions/${reminder.expeditionSlug}`} className="font-bold text-ocean-900 hover:text-coral-700">{reminder.expeditionTitle}</Link>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {labels.reminder} {reminder.remindAt.toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <form action={cancelExpeditionReminderAction}>
                  <input type="hidden" name="reminderId" value={reminder.id} />
                  <button type="submit" className="min-h-9 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500">
                    {labels.cancelReminder}
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.journeyEyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.journeyTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/62">
          {labels.journeyBody}
        </p>
        <div className="mt-5 grid gap-4">
          {data.expeditionImpactJourneys.map((journey) => {
            const currentStage = journey.verifiedOutcome
              ? 5
              : journey.latestFieldActivity
                ? 4
                : journey.participationCompleted
                  ? 3
                  : journey.paymentStatus === "paid"
                    ? 2
                    : 1;
            const journeySteps = [
              labels.bookingPayment,
              labels.preparation,
              labels.participation,
              labels.fieldActivity,
              labels.verifiedImpact
            ];

            return (
            <article key={journey.bookingId} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <Link href={`/expeditions/${journey.expeditionSlug}`} className="text-xl font-bold text-ocean-900 hover:text-coral-700">{journey.expeditionTitle}</Link>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/52">{journey.bookingCode} · {journey.startsAt.toLocaleDateString(dateLocale, { dateStyle: "medium" })}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass(journey.bookingStatus)}`}>{statusLabel(journey.bookingStatus, locale)}</span>
              </div>
              <div className="mt-5 rounded-xl border border-ocean-900/10 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/52">{labels.currentStage}</p>
                  <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">{currentStage}/5</span>
                </div>
                <div className="mt-4 grid grid-cols-5 gap-2" aria-label={`${labels.currentStage}: ${currentStage} / 5`}>
                  {journeySteps.map((step, index) => {
                    const stage = index + 1;
                    const completed = stage <= currentStage;

                    return (
                      <div key={step} className="min-w-0 text-center">
                        <div className={`mx-auto flex size-8 items-center justify-center rounded-full text-xs font-bold ${completed ? "bg-kelp-500 text-white" : "bg-ocean-50 text-ocean-900/42"}`}>
                          {completed ? <CheckCircle2 size={15} aria-hidden="true" /> : stage}
                        </div>
                        <p className={`mt-2 text-[10px] font-bold leading-4 sm:text-[11px] ${completed ? "text-ocean-900" : "text-ocean-900/46"}`}>{step}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <CheckCircle2 size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">{labels.bookingPayment}</p>
                  <p className="mt-1 text-xs leading-5 text-ocean-900/58">{journey.paymentStatus === "paid" ? labels.paymentVerified : `${labels.payment} ${statusLabel(journey.paymentStatus, locale)}`}</p>
                </div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <CalendarDays size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">{labels.preparation}</p>
                  <p className="mt-1 text-xs leading-5 text-ocean-900/58">{journey.preparationComplete}/{journey.preparationTotal} {labels.prepComplete}</p>
                </div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <CheckCircle2 size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">{labels.participation}</p>
                  <p className="mt-1 text-xs leading-5 text-ocean-900/58">{journey.participationCompleted ? labels.completedConfirmed : journey.endsAt > new Date() ? labels.notCompleted : labels.awaitingConfirmation}</p>
                </div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <MapPin size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">{labels.fieldActivity}</p>
                  {journey.latestFieldActivity ? <Link href={journey.latestFieldActivity.href} className="mt-1 block text-xs font-semibold leading-5 text-coral-700">{journey.latestFieldActivity.title}</Link> : <p className="mt-1 text-xs leading-5 text-ocean-900/58">{journey.relatedCampaignId ? labels.waitingField : labels.noCampaign}</p>}
                </div>
                <div className="rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                  <ShieldCheck size={18} className="text-kelp-600" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">{labels.verifiedImpact}</p>
                  {journey.verifiedOutcome ? <Link href={journey.verifiedOutcome.href} className="mt-1 block text-xs font-semibold leading-5 text-coral-700">{journey.verifiedOutcome.title}</Link> : <p className="mt-1 text-xs leading-5 text-ocean-900/58">{labels.noVerified}</p>}
                </div>
              </div>
              {journey.passportEligible ? <p className="mt-4 rounded-xl bg-kelp-100 p-3 text-xs font-semibold leading-5 text-kelp-700">{labels.passportEligible}</p> : null}
            </article>
            );
          })}
          {data.expeditionImpactJourneys.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">{labels.journeyEmpty}</p> : null}
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        <h2 className="text-2xl font-bold tracking-normal text-ocean-900">{labels.bookings}</h2>
        {data.bookings.map((booking) => {
          const reviewStatus = booking.reviewId ? normalizeExpeditionReviewStatus(booking.reviewStatus, "pending") : null;

          return (
            <article key={booking.bookingCode} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                    <CalendarDays size={22} aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-normal text-ocean-900">{booking.expeditionTitle}</h2>
                    <p className="mt-1 text-sm text-ocean-900/58">
                      {booking.startsAt.toLocaleDateString(dateLocale, { dateStyle: "medium" })} · {booking.participantsCount} {labels.participant}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ocean-900/62">
                      <span className="rounded-full bg-sand-50 px-3 py-1">{booking.bookingCode}</span>
                      <span className={`rounded-full px-3 py-1 ${statusClass(booking.status)}`}>{statusLabel(booking.status, locale)}</span>
                      <span className={`rounded-full px-3 py-1 ${statusClass(booking.paymentStatus)}`}>{statusLabel(booking.paymentStatus, locale)}</span>
                      <span className="rounded-full bg-ocean-50 px-3 py-1">{bookingAttributionLabel(booking.bookingMetadata, labels.personal)}</span>
                      <span className="rounded-full bg-ocean-50 px-3 py-1">{formatCurrency(Number(booking.totalAmount), booking.currency)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <ExpeditionCalendarActions
                    title={booking.expeditionTitle}
                    startsAt={booking.startsAt}
                    endsAt={booking.endsAt}
                    location={booking.expeditionRegion}
                    description={`${labels.calendarDescription} ${booking.bookingCode}`}
                  />
                  {booking.canCancelBooking ? (
                    <>
                      <form action={retryExpeditionPaymentAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-coral-500" type="submit">
                          <RefreshCw size={14} aria-hidden="true" />
                          {labels.requestRecheck}
                        </button>
                      </form>
                      <form action={cancelOwnExpeditionBookingAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-coral-500/30 px-3 text-xs font-bold text-coral-700 hover:border-coral-500" type="submit">
                          {labels.cancelBooking}
                        </button>
                      </form>
                    </>
                  ) : null}
                  {booking.canRequestRefund ? (
                    <details className="relative">
                      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-full border border-coral-500/30 px-3 text-xs font-bold text-coral-700 hover:border-coral-500">
                        {labels.requestRefund}
                      </summary>
                      <form action={requestExpeditionRefundAction} className="absolute right-0 z-20 mt-2 grid w-72 gap-2 rounded-xl border border-ocean-900/10 bg-white p-3 shadow-soft">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <label className="grid gap-1 text-xs font-bold text-ocean-900">
                          {labels.reason}
                          <textarea name="reason" className="min-h-20 rounded-lg border border-ocean-900/14 px-3 py-2 text-sm font-semibold" placeholder={labels.refundPlaceholder} required />
                        </label>
                        <Button type="submit" tone="secondary">{labels.submitRefund}</Button>
                      </form>
                    </details>
                  ) : null}
                </div>
              </div>
              {booking.status === "completed" ? (
                <div className="mt-5 rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-bold text-ocean-900">{booking.reviewId ? labels.yourReview : labels.reviewCompleted}</p>
                      <p className="mt-1 text-sm text-ocean-900/62">{reviewStatusDescription(reviewStatus, locale)}</p>
                    </div>
                    {booking.reviewId ? (
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {reviewStatus ? (
                          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${reviewStatusClass(reviewStatus)}`}>
                            {statusLabel(reviewStatus, locale)}
                          </span>
                        ) : null}
                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">
                          <Star size={13} aria-hidden="true" className="fill-ocean-500" />
                          {booking.reviewRating}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <form action={submitExpeditionReviewAction} className="mt-4 grid min-w-0 gap-3">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <div className="grid min-w-0 gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                      <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ocean-900">
                        {labels.rating}
                        <select
                          name="rating"
                          defaultValue={String(booking.reviewRating ?? 5)}
                          className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none focus:border-coral-500"
                          required
                        >
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} {labels.stars}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ocean-900">
                        {labels.reviewTitle}
                        <input
                          name="title"
                          defaultValue={booking.reviewTitle ?? ""}
                          placeholder={labels.reviewTitlePlaceholder}
                          className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none placeholder:text-ocean-900/36 focus:border-coral-500"
                        />
                      </label>
                    </div>
                    <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ocean-900">
                      {labels.review}
                      <textarea
                        name="body"
                        defaultValue={booking.reviewBody ?? ""}
                        placeholder={labels.reviewPlaceholder}
                        className="min-h-28 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none placeholder:text-ocean-900/36 focus:border-coral-500"
                        required
                      />
                    </label>
                    <Button type="submit" className="w-fit">
                      <Star size={16} aria-hidden="true" />
                      {booking.reviewId ? labels.submitUpdatedReview : labels.submitReview}
                    </Button>
                  </form>
                <div className="mt-5 border-t border-ocean-900/10 pt-5">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                      <p className="font-bold text-ocean-900">{labels.travelerMoments}</p>
                      <p className="mt-1 text-sm text-ocean-900/62">
                        {labels.travelerMomentsBody}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-ocean-900/46">
                      {(mediaByBooking.get(booking.id) ?? []).length} {labels.submitted}
                    </span>
                  </div>
                  {(mediaByBooking.get(booking.id) ?? []).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(mediaByBooking.get(booking.id) ?? []).map((submission) => (
                        <span key={submission.id} className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">
                          {submission.mediaType === "photo" ? labels.photo : labels.videoLink} · {statusLabel(submission.status, locale)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <form action={submitExpeditionMediaAction} encType="multipart/form-data" className="mt-4 grid gap-3 rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                        {labels.mediaType}
                        <select name="mediaType" defaultValue="photo" className="min-h-11 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold">
                          <option value="photo">{labels.photo}</option>
                          <option value="video">{labels.videoLink}</option>
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                        {labels.photoUpload}
                        <input name="mediaFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="min-h-11 rounded-lg border border-ocean-900/14 bg-white px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                      {labels.mediaUrl} <span className="font-normal text-ocean-900/42">{labels.mediaUrlOptional}</span>
                      <input name="mediaUrl" type="url" placeholder="https://..." className="min-h-11 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                      {labels.caption}
                      <textarea name="caption" placeholder={labels.captionPlaceholder} className="min-h-20 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold" />
                    </label>
                    <Button type="submit" tone="secondary" className="w-fit">{labels.submitForReview}</Button>
                  </form>
                </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {data.bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6">
            <p className="font-bold text-ocean-900">{labels.noBookings}</p>
            <Link href="/expeditions" className="mt-2 inline-flex text-sm font-bold text-coral-700">
              {labels.findFirstTrip}
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
