import Link from "next/link";
import { CalendarDays, RefreshCw, RotateCcw, Star } from "lucide-react";

import { requestExpeditionRefundAction, retryExpeditionPaymentAction } from "@/lib/billing-actions";
import { submitExpeditionReviewAction } from "@/lib/expedition-review-actions";
import { expeditionReviewStatusLabel, normalizeExpeditionReviewStatus, type ExpeditionReviewStatus } from "@/lib/expedition-reviews";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getBillingData, getDashboardData } from "@/lib/queries";
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
  const [data, billing] = await Promise.all([getDashboardData(user.id), getBillingData(user.id)]);

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
          {params.saved === "review" ? "Thanks, your expedition review was submitted for moderation." : "Booking billing changes saved."}
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          {params.error.startsWith("review")
            ? "Reviews are available after expedition completion. Add a rating and at least 10 characters."
            : params.error === "availability"
              ? "That departure no longer has enough available seats for retry payment."
              : "Could not complete that booking billing action."}
        </p>
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
                      <span className="rounded-full bg-ocean-50 px-3 py-1">{formatCurrency(Number(booking.totalAmount))}</span>
                    </div>
                    {billing.pendingRefundBookingIds.has(booking.id) ? (
                      <p className="mt-3 inline-flex rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ocean-900/70">Refund requested</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {["created", "pending", "failed", "expired"].includes(booking.paymentStatus) ? (
                    <form action={retryExpeditionPaymentAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-coral-500" type="submit">
                        <RefreshCw size={14} aria-hidden="true" />
                        Retry
                      </button>
                    </form>
                  ) : null}
                  {booking.paymentStatus === "paid" && !billing.pendingRefundBookingIds.has(booking.id) ? (
                    <form action={requestExpeditionRefundAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <input type="hidden" name="reason" value="Requested from expedition booking history" />
                      <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500" type="submit">
                        <RotateCcw size={14} aria-hidden="true" />
                        Request refund
                      </button>
                    </form>
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
                  <form action={submitExpeditionReviewAction} className="mt-4 grid gap-3">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                      <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                        Rating
                        <select
                          name="rating"
                          defaultValue={String(booking.reviewRating ?? 5)}
                          className="min-h-11 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none focus:border-coral-500"
                          required
                        >
                          {[5, 4, 3, 2, 1].map((rating) => (
                            <option key={rating} value={rating}>
                              {rating} stars
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                        Review title
                        <input
                          name="title"
                          defaultValue={booking.reviewTitle ?? ""}
                          placeholder="Purposeful and well-run"
                          className="min-h-11 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none placeholder:text-ocean-900/36 focus:border-coral-500"
                        />
                      </label>
                    </div>
                    <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                      Review
                      <textarea
                        name="body"
                        defaultValue={booking.reviewBody ?? ""}
                        placeholder="Share what future participants should know."
                        className="min-h-28 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none placeholder:text-ocean-900/36 focus:border-coral-500"
                        required
                      />
                    </label>
                    <Button type="submit" className="w-fit">
                      <Star size={16} aria-hidden="true" />
                      {booking.reviewId ? "Submit Updated Review" : "Submit Review"}
                    </Button>
                  </form>
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
