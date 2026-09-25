import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookmarkX, CalendarDays, Heart, RefreshCw, Star } from "lucide-react";

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


function bookingAttributionLabel(metadata: unknown) {
  const metadataObject = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? (metadata as Record<string, unknown>) : {};
  const attribution =
    metadataObject.attribution && typeof metadataObject.attribution === "object" && !Array.isArray(metadataObject.attribution)
      ? (metadataObject.attribution as Record<string, unknown>)
      : null;

  if (attribution?.type === "corporate" && typeof attribution.corporateAccountName === "string") {
    return attribution.corporateAccountName;
  }

  return "Personal";
}

function reviewStatusDescription(status: ExpeditionReviewStatus | null) {
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
  const [data, highlightedExpeditions, reminders, mediaSubmissions] = await Promise.all([
    getDashboardData(user.id),
    getExpeditionCards(3),
    getUserExpeditionReminders(user.id),
    getUserExpeditionMediaSubmissions(user.id)
  ]);
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
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Expeditions</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Field activity bookings</h1>
        </div>
        <ButtonLink href="/expeditions">Browse expeditions</ButtonLink>
      </header>

      {params?.saved ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">
          {params.saved === "review"
            ? "Thanks, your expedition review was submitted for moderation."
            : params.saved === "expedition"
              ? "Saved expeditions updated."
              : params.saved === "media"
                ? "Traveler media submitted for moderation."
                : params.saved === "reminder"
                ? "Expedition reminder scheduled."
                : params.saved === "reminder-cancelled"
                  ? "Expedition reminder cancelled."
                  : params.saved === "payment-recheck"
                    ? "Payment recheck requested. Platform Admin will verify the booking payment."
                    : params.saved === "booking-cancelled"
                      ? "Unpaid booking cancelled."
                      : "Booking billing changes saved."}
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          {params.error.startsWith("review")
            ? "Reviews are available after expedition completion. Add a rating and at least 10 characters."
            : params.error === "availability"
              ? "That departure no longer has enough available seats for payment recheck."
              : params.error === "expedition"
                ? "Could not update that saved expedition."
                : params.error?.startsWith("media")
                  ? "Traveler media can only be submitted for completed bookings. Upload a supported image under 1.5 MB or provide a valid HTTPS media URL."
                  : params.error === "reminder"
                    ? "Could not schedule that reminder."
                    : params.error === "cancel"
                      ? "This booking can no longer be cancelled from your dashboard."
                      : params.error === "refund"
                        ? "Refund can only be requested for a paid booking before the expedition starts."
                        : "Could not complete that booking billing action."}
        </p>
      ) : null}

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Book a new expedition</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Pick one of the latest field activities, or browse the full expedition catalog.</p>
          </div>
          <ButtonLink href="/expeditions" tone="secondary">
            Browse all
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
                    Detail <ArrowRight size={15} aria-hidden="true" />
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
              Saved trips
            </h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              {data.savedExpeditions.length.toLocaleString("id-ID")} saved expedition{data.savedExpeditions.length === 1 ? "" : "s"}.
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
                    {expedition.region} · {expedition.duration} · from {formatCurrency(expedition.price, expedition.currency)}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-ocean-900/50">
                    Saved {expedition.savedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="grid gap-2 sm:justify-items-end">
                  <form action={scheduleSavedExpeditionReminderAction} className="flex items-center gap-2">
                    <input type="hidden" name="expeditionSlug" value={expedition.slug} />
                    <select name="delayDays" defaultValue="7" className="min-h-9 rounded-full border border-ocean-900/10 bg-white px-3 text-xs font-bold text-ocean-900">
                      <option value="3">Remind in 3 days</option>
                      <option value="7">Remind in 7 days</option>
                      <option value="14">Remind in 14 days</option>
                      <option value="30">Remind in 30 days</option>
                    </select>
                    <button type="submit" className="min-h-9 rounded-full bg-kelp-500 px-3 text-xs font-bold text-white hover:bg-kelp-700">
                      Remind me
                    </button>
                  </form>
                  <form action={removeSavedExpeditionAction}>
                    <input type="hidden" name="expeditionSlug" value={expedition.slug} />
                    <input type="hidden" name="next" value="/dashboard/expeditions" />
                    <button
                      type="submit"
                      aria-label="Remove saved expedition"
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500"
                    >
                      <BookmarkX size={14} aria-hidden="true" />
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>

        {data.savedExpeditions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">
            Save expeditions from a trip page to compare them here before booking.
          </p>
        ) : null}
      </section>

      {reminders.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Scheduled reminders</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">In-app and email reminders follow your expedition notification preference.</p>
          <div className="mt-4 grid gap-3">
            {reminders.map((reminder) => (
              <article key={reminder.id} className="flex flex-col justify-between gap-3 rounded-xl bg-sand-50 p-4 sm:flex-row sm:items-center">
                <div>
                  <Link href={`/expeditions/${reminder.expeditionSlug}`} className="font-bold text-ocean-900 hover:text-coral-700">{reminder.expeditionTitle}</Link>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    Reminder {reminder.remindAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <form action={cancelExpeditionReminderAction}>
                  <input type="hidden" name="reminderId" value={reminder.id} />
                  <button type="submit" className="min-h-9 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500">
                    Cancel reminder
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4">
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
                      {booking.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} · {booking.participantsCount} participant
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ocean-900/62">
                      <span className="rounded-full bg-sand-50 px-3 py-1">{booking.bookingCode}</span>
                      <span className={`rounded-full px-3 py-1 ${statusClass(booking.status)}`}>{booking.status}</span>
                      <span className={`rounded-full px-3 py-1 ${statusClass(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                      <span className="rounded-full bg-ocean-50 px-3 py-1">{bookingAttributionLabel(booking.bookingMetadata)}</span>
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
                    description={`Terumbu.eco expedition booking ${booking.bookingCode}`}
                  />
                  {booking.canCancelBooking ? (
                    <>
                      <form action={retryExpeditionPaymentAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-coral-500" type="submit">
                          <RefreshCw size={14} aria-hidden="true" />
                          Request recheck
                        </button>
                      </form>
                      <form action={cancelOwnExpeditionBookingAction}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-coral-500/30 px-3 text-xs font-bold text-coral-700 hover:border-coral-500" type="submit">
                          Cancel booking
                        </button>
                      </form>
                    </>
                  ) : null}
                  {booking.canRequestRefund ? (
                    <details className="relative">
                      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-full border border-coral-500/30 px-3 text-xs font-bold text-coral-700 hover:border-coral-500">
                        Request refund
                      </summary>
                      <form action={requestExpeditionRefundAction} className="absolute right-0 z-20 mt-2 grid w-72 gap-2 rounded-xl border border-ocean-900/10 bg-white p-3 shadow-soft">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <label className="grid gap-1 text-xs font-bold text-ocean-900">
                          Reason
                          <textarea name="reason" className="min-h-20 rounded-lg border border-ocean-900/14 px-3 py-2 text-sm font-semibold" placeholder="Tell us why you need a refund." required />
                        </label>
                        <Button type="submit" tone="secondary">Submit refund request</Button>
                      </form>
                    </details>
                  ) : null}
                </div>
              </div>
              {booking.status === "completed" ? (
                <div className="mt-5 rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div>
                      <p className="font-bold text-ocean-900">{booking.reviewId ? "Your expedition review" : "Review this completed expedition"}</p>
                      <p className="mt-1 text-sm text-ocean-900/62">{reviewStatusDescription(reviewStatus)}</p>
                    </div>
                    {booking.reviewId ? (
                      <div className="flex flex-wrap gap-2 md:justify-end">
                        {reviewStatus ? (
                          <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${reviewStatusClass(reviewStatus)}`}>
                            {expeditionReviewStatusLabel(reviewStatus)}
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
                        Rating
                        <select
                          name="rating"
                          defaultValue={String(booking.reviewRating ?? 5)}
                          className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none focus:border-coral-500"
                          required
                        >
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} stars
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ocean-900">
                        Review title
                        <input
                          name="title"
                          defaultValue={booking.reviewTitle ?? ""}
                          placeholder="Purposeful and well-run"
                          className="min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none placeholder:text-ocean-900/36 focus:border-coral-500"
                        />
                      </label>
                    </div>
                    <label className="grid min-w-0 gap-1.5 text-sm font-bold text-ocean-900">
                      Review
                      <textarea
                        name="body"
                        defaultValue={booking.reviewBody ?? ""}
                        placeholder="Share what future participants should know."
                        className="min-h-28 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none placeholder:text-ocean-900/36 focus:border-coral-500"
                        required
                      />
                    </label>
                    <Button type="submit" className="w-fit">
                      <Star size={16} aria-hidden="true" />
                      {booking.reviewId ? "Submit Updated Review" : "Submit Review"}
                    </Button>
                  </form>
                <div className="mt-5 border-t border-ocean-900/10 pt-5">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                      <p className="font-bold text-ocean-900">Share traveler moments</p>
                      <p className="mt-1 text-sm text-ocean-900/62">
                        Completed participants can submit photos or video links. Platform Admin reviews every submission before it appears publicly.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-ocean-900/46">
                      {(mediaByBooking.get(booking.id) ?? []).length} submitted
                    </span>
                  </div>
                  {(mediaByBooking.get(booking.id) ?? []).length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(mediaByBooking.get(booking.id) ?? []).map((submission) => (
                        <span key={submission.id} className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">
                          {submission.mediaType} · {submission.status}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <form action={submitExpeditionMediaAction} encType="multipart/form-data" className="mt-4 grid gap-3 rounded-xl bg-white p-4 ring-1 ring-ocean-900/10">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                        Media type
                        <select name="mediaType" defaultValue="photo" className="min-h-11 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold">
                          <option value="photo">Photo</option>
                          <option value="video">Video link</option>
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                        Photo upload
                        <input name="mediaFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="min-h-11 rounded-lg border border-ocean-900/14 bg-white px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                      Photo or video URL <span className="font-normal text-ocean-900/42">(optional for photo upload)</span>
                      <input name="mediaUrl" type="url" placeholder="https://..." className="min-h-11 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold" />
                    </label>
                    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                      Caption
                      <textarea name="caption" placeholder="What was happening, and what did you learn?" className="min-h-20 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold" />
                    </label>
                    <Button type="submit" tone="secondary" className="w-fit">Submit for review</Button>
                  </form>
                </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {data.bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6">
            <p className="font-bold text-ocean-900">No expedition bookings yet.</p>
            <Link href="/expeditions" className="mt-2 inline-flex text-sm font-bold text-coral-700">
              Find your first conservation trip
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
