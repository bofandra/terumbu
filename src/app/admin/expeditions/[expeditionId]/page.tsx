import Link from "next/link";
import { ArrowUpRight, CalendarDays, CalendarPlus, CheckCircle2, MessageSquareText, Save, Star, Trash2, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { processExpeditionInterestRequestAction } from "@/lib/expedition-interest-actions";
import { moderateExpeditionReviewAction } from "@/lib/expedition-review-actions";
import { expeditionReviewStatusLabel, expeditionReviewStatuses, type ExpeditionReviewStatus } from "@/lib/expedition-reviews";
import {
  cancelExpeditionBookingAction,
  cancelExpeditionDepartureAction,
  createExpeditionDepartureAction,
  deleteExpeditionAction,
  deleteExpeditionDepartureAction,
  updateExpeditionAction,
  updateExpeditionDepartureAction
} from "@/lib/portal-actions";
import { getAdminOperationsData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Manage Admin Expedition"
};

export const dynamic = "force-dynamic";

const departureStatuses = ["open", "waitlist", "full", "private_group", "cancelled"];

const statusMessages: Record<string, string> = {
  "departure-created": "Departure created.",
  "departure-deleted": "Departure deleted.",
  "departure-updated": "Departure updated.",
  "booking-cancelled": "Booking cancelled and payment operation recorded.",
  "departure-cancelled": "Departure cancelled and affected bookings were updated.",
  "expedition-updated": "Expedition updated.",
  "interest-request": "Expedition interest request updated.",
  "review-moderated": "Review moderation status updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign or leave the field empty.",
  "departure-capacity": "Capacity cannot be lower than seats already booked.",
  "departure-delete": "Confirm departure deletion by checking the delete box.",
  "departure-duplicate": "That expedition already has a departure with the same start time.",
  "departure-has-bookings": "Departures with bookings cannot be deleted.",
  "departure-invalid": "Enter valid departure dates and capacity.",
  "departure-missing": "Departure record was not found.",
  "booking-cancel": "That booking cannot be cancelled from this workflow.",
  "departure-cancel": "That departure cannot be cancelled.",
  "expedition-delete": "Confirm expedition deletion by checking the delete box.",
  "expedition-has-bookings": "Expeditions with bookings cannot be deleted.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, and summary.",
  "expedition-metadata-json": "Trip detail content must be valid JSON object data.",
  "expedition-missing": "Expedition record was not found.",
  "expedition-slug": "That expedition slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "interest-request-invalid": "Choose an interest request and final processing status.",
  "interest-request-missing": "Interest request record was not found.",
  "review-invalid": "Choose a review and moderation status.",
  "review-missing": "Review record was not found."
};

type AdminExpeditionDetailPageProps = {
  params: Promise<{
    expeditionId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function formatDateTimeInput(date: Date) {
  return date.toISOString().slice(0, 16);
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

function ReviewStatusBadge({ status }: { status: ExpeditionReviewStatus }) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold ${reviewStatusClass(status)}`}>
      {expeditionReviewStatusLabel(status)}
    </span>
  );
}

function Field({
  label,
  children,
  className = ""
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function RelatedCampaignSelect({
  campaigns,
  defaultValue = ""
}: {
  campaigns: Awaited<ReturnType<typeof getAdminOperationsData>>["campaignOptions"];
  defaultValue?: string | null;
}) {
  return (
    <select name="relatedCampaignId" defaultValue={defaultValue ?? ""} className={adminSelectClassName}>
      <option value="">No related campaign</option>
      {campaigns.map((campaign) => (
        <option key={campaign.id} value={campaign.id}>
          {campaign.title} / {campaign.organizationName} / {campaign.status}
        </option>
      ))}
    </select>
  );
}

export default async function AdminExpeditionDetailPage({ params, searchParams }: AdminExpeditionDetailPageProps) {
  const { expeditionId } = await params;
  await requireRole(["admin"], `/admin/expeditions/${expeditionId}`);
  const query = await searchParams;
  const data = await getAdminOperationsData();
  const expedition = data.expeditionCatalog.find((item) => item.id === expeditionId);

  if (!expedition) {
    notFound();
  }

  const returnTo = `/admin/expeditions/${expedition.id}`;
  const openDepartures = expedition.departures.filter((departure) => departure.status === "open").length;
  const availableSeats = expedition.departures.reduce((total, departure) => total + departure.availableSeats, 0);
  const pendingInterestRequests = expedition.interestRequests.filter((request) => request.status === "pending").length;
  const pendingReviews = expedition.reviews.filter((review) => review.status === "pending").length;
  const savedMessage = query?.saved ? statusMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions"
        title={expedition.title}
        description={`${expedition.region} / ${expedition.durationDays} days / ${formatCurrency(expedition.basePrice)}`}
        actionHref="/admin/expeditions"
        actionLabel="Expedition list"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-6" aria-label="Expedition detail summary">
        {[
          { label: "Departures", value: expedition.departures.length.toLocaleString("id-ID") },
          { label: "Open", value: openDepartures.toLocaleString("id-ID") },
          { label: "Available seats", value: availableSeats.toLocaleString("id-ID") },
          { label: "Bookings", value: expedition.bookingCount.toLocaleString("id-ID") },
          { label: "Interest requests", value: pendingInterestRequests.toLocaleString("id-ID") },
          { label: "Pending reviews", value: pendingReviews.toLocaleString("id-ID") }
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Interest requests</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Waitlist and private departure demand captured from the public expedition page.</p>
          </div>
          <MessageSquareText className="size-5 text-kelp-700" aria-hidden="true" />
        </div>
        <div className="divide-y divide-ocean-900/10">
          {expedition.interestRequests.map((request) => (
            <article key={request.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ocean-900">{request.contactName}</h3>
                    <AdminStatusBadge value={labelize(request.requestType)} />
                    <AdminStatusBadge value={request.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {request.contactEmail} / {request.participantsCount} participants / {request.requestCode}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                    Created {request.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                    {request.preferredStartAt ? ` / Preferred ${request.preferredStartAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}` : ""}
                  </p>
                  {request.message ? <p className="mt-3 rounded-lg bg-sand-50 p-3 text-sm font-semibold text-ocean-900/68">{request.message}</p> : null}
                </div>
                {request.processedAt ? (
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                    Processed {request.processedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    {request.processedByEmail ? ` by ${request.processedByEmail}` : ""}
                  </p>
                ) : null}
              </div>
              <form action={processExpeditionInterestRequestAction} className="mt-4 grid gap-2 lg:grid-cols-[180px_1fr_auto]">
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="requestId" value={request.id} />
                <select name="status" defaultValue={request.status === "pending" ? "contacted" : request.status} className={adminSelectClassName} aria-label="Interest request status">
                  {["contacted", "converted", "declined", "cancelled"].map((status) => (
                    <option key={status} value={status}>
                      {labelize(status)}
                    </option>
                  ))}
                </select>
                <input name="note" placeholder="Admin note" className={adminInputClassName} />
                <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3">
                  <Save className="size-4" aria-hidden="true" />
                  Update request
                </Button>
              </form>
            </article>
          ))}
          {expedition.interestRequests.length === 0 ? (
            <p className="p-4 text-sm font-semibold text-ocean-900/58">No waitlist or private departure requests yet.</p>
          ) : null}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Bookings</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Cancel individual bookings when the operator confirms a schedule or eligibility issue.</p>
          </div>
          <CalendarDays className="size-5 text-kelp-700" aria-hidden="true" />
        </div>
        <div className="divide-y divide-ocean-900/10">
          {expedition.bookings.map((booking) => (
            <article key={booking.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ocean-900">{booking.bookingCode}</h3>
                    <AdminStatusBadge value={booking.status} />
                    <AdminStatusBadge value={booking.paymentStatus} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {booking.contactName} / {booking.contactEmail} / {booking.participantsCount} participants
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                    Departure {booking.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} / {formatCurrency(booking.totalAmount)}
                  </p>
                </div>
                <form action={cancelExpeditionBookingAction} className="grid gap-2 sm:min-w-80">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input name="reason" placeholder="Cancellation reason" className={adminInputClassName} disabled={!booking.canCancel} />
                  <Button type="submit" tone="ghost" className="min-h-10 rounded-lg px-3 text-coral-700 hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-45" disabled={!booking.canCancel}>
                    <XCircle className="size-4" aria-hidden="true" />
                    Cancel booking
                  </Button>
                </form>
              </div>
            </article>
          ))}
          {expedition.bookings.length === 0 ? (
            <p className="p-4 text-sm font-semibold text-ocean-900/58">No bookings for this expedition yet.</p>
          ) : null}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Catalog details</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Public trip record, price, image, and campaign link.</p>
          </div>
          <Link href={`/expeditions/${expedition.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
            Public page
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <form action={updateExpeditionAction} className="grid gap-4 p-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="expeditionId" value={expedition.id} />
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Title">
              <input name="title" defaultValue={expedition.title} className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" defaultValue={expedition.slug} className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Region">
              <input name="region" defaultValue={expedition.region} className={adminInputClassName} required />
            </Field>
            <Field label="Duration days">
              <input name="durationDays" type="number" min={1} defaultValue={expedition.durationDays} className={adminInputClassName} required />
            </Field>
            <Field label="Base price">
              <input name="basePrice" type="number" min={1} step={1000} defaultValue={expedition.basePrice} className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Related campaign">
              <RelatedCampaignSelect campaigns={data.campaignOptions} defaultValue={expedition.relatedCampaignId} />
            </Field>
            <Field label="Replace image">
              <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
            </Field>
          </div>
          <Field label="Summary">
            <textarea name="summary" defaultValue={expedition.summary} className={adminTextareaClassName} required />
          </Field>
          <Field label="Trip detail content JSON">
            <textarea name="metadataJson" defaultValue={expedition.metadataJson} className={`${adminTextareaClassName} min-h-96 font-mono text-xs`} spellCheck={false} />
          </Field>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Save className="size-4" aria-hidden="true" />
            Save Expedition
          </Button>
        </form>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Review moderation</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Approve completed-participant reviews before they appear on the public expedition page.</p>
          </div>
          <MessageSquareText className="size-5 text-kelp-700" aria-hidden="true" />
        </div>

        <div className="divide-y divide-ocean-900/10">
          {expedition.reviews.map((review) => (
            <article key={review.id} className="p-4">
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-ocean-900">{review.reviewerName}</h3>
                    <ReviewStatusBadge status={review.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {review.reviewerEmail} / {review.bookingCode} / {review.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">
                  <Star className="size-3.5 fill-ocean-500" aria-hidden="true" />
                  {review.rating} / 5
                </span>
              </div>

              <div className="mt-4 rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
                {review.title ? <p className="font-bold text-ocean-900">{review.title}</p> : null}
                <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/68">{review.body}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                  Last updated {review.updatedAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} / Booking {review.bookingStatus}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={moderateExpeditionReviewAction}>
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="status" value="published" />
                  <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-3" disabled={review.status === "published"}>
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Approve
                  </Button>
                </form>
                <form action={moderateExpeditionReviewAction}>
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="reviewId" value={review.id} />
                  <input type="hidden" name="status" value="rejected" />
                  <Button type="submit" tone="ghost" className="min-h-10 rounded-lg px-3 text-coral-700 hover:bg-coral-100" disabled={review.status === "rejected"}>
                    <XCircle className="size-4" aria-hidden="true" />
                    Reject
                  </Button>
                </form>
                <form action={moderateExpeditionReviewAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="reviewId" value={review.id} />
                  <select name="status" defaultValue={review.status} className={adminSelectClassName} aria-label="Review moderation status">
                    {expeditionReviewStatuses.map((status) => (
                      <option key={status} value={status}>
                        {expeditionReviewStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" tone="light" className="min-h-10 rounded-lg px-3">
                    <Save className="size-4" aria-hidden="true" />
                    Set status
                  </Button>
                </form>
              </div>
            </article>
          ))}
          {expedition.reviews.length === 0 ? (
            <p className="p-4 text-sm font-semibold text-ocean-900/58">No participant reviews have been submitted for this expedition.</p>
          ) : null}
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Departures</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Only open departures can be booked from checkout.</p>
          </div>
          <CalendarDays className="size-5 text-kelp-700" aria-hidden="true" />
        </div>

        <div className="grid gap-3 p-4">
          {expedition.departures.map((departure) => (
            <div key={departure.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ocean-900">
                    {departure.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} - {departure.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {departure.availableSeats} of {departure.capacity} seats available / {departure.seatsBooked} booked
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                    {departure.availabilityLabel} / Minimum {departure.minParticipants} / {departure.availabilityMessage}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminStatusBadge value={departure.status} />
                  <AdminStatusBadge value={`${departure.bookingCount} bookings`} />
                </div>
              </div>

              <form action={updateExpeditionDepartureAction} className="mt-3 grid gap-2">
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="departureId" value={departure.id} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Starts at">
                    <input name="startsAt" type="datetime-local" defaultValue={formatDateTimeInput(departure.startsAt)} className={adminInputClassName} required />
                  </Field>
                  <Field label="Ends at">
                    <input name="endsAt" type="datetime-local" defaultValue={formatDateTimeInput(departure.endsAt)} className={adminInputClassName} required />
                  </Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Capacity">
                    <input name="capacity" type="number" min={departure.seatsBooked} defaultValue={departure.capacity} className={adminInputClassName} required />
                  </Field>
                  <Field label="Status">
                    <select name="status" defaultValue={departure.status} className={adminSelectClassName}>
                      {departureStatuses.map((status) => (
                        <option key={status} value={status}>
                          {labelize(status)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="Meeting point">
                    <input name="meetingPoint" defaultValue={departure.meetingPoint ?? ""} className={adminInputClassName} />
                  </Field>
                  <Field label="Trip leader">
                    <input name="guide" defaultValue={departure.guide ?? ""} className={adminInputClassName} />
                  </Field>
                </div>
                <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                  <Field label="Minimum">
                    <input name="minParticipants" type="number" min={1} defaultValue={departure.minParticipants} className={adminInputClassName} />
                  </Field>
                  <Field label="Weather advisory">
                    <input name="weatherAdvisory" defaultValue={departure.weatherAdvisory ?? ""} className={adminInputClassName} />
                  </Field>
                </div>
                <Button type="submit" tone="secondary" className="w-fit rounded-lg">
                  <Save className="size-4" aria-hidden="true" />
                  Save Departure
                </Button>
              </form>

              <form action={cancelExpeditionDepartureAction} className="mt-3 rounded-lg border border-coral-700/20 bg-white p-3">
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="departureId" value={departure.id} />
                <label className="grid gap-1.5 text-sm font-bold text-ocean-900">
                  Cancellation reason
                  <input name="reason" placeholder="Weather, operator change, or safety issue" className={adminInputClassName} disabled={departure.status === "cancelled"} />
                </label>
                <Button
                  type="submit"
                  tone="ghost"
                  className="mt-3 w-fit rounded-lg text-coral-700 hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={departure.status === "cancelled"}
                >
                  <XCircle className="size-4" aria-hidden="true" />
                  Cancel departure and bookings
                </Button>
              </form>

              <form action={deleteExpeditionDepartureAction} className="mt-3 rounded-lg border border-coral-700/20 bg-white p-3">
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="departureId" value={departure.id} />
                <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                  <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" disabled={departure.bookingCount > 0} required />
                  Delete this departure. Departures with bookings cannot be deleted.
                </label>
                <Button
                  type="submit"
                  tone="ghost"
                  className="mt-3 w-fit rounded-lg text-coral-700 hover:bg-coral-100 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={departure.bookingCount > 0}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete Departure
                </Button>
              </form>
            </div>
          ))}
          {expedition.departures.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/58">No departures scheduled.</p> : null}
        </div>

        <div className="border-t border-ocean-900/10 p-4">
          <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3">
            <h3 className="font-bold text-ocean-900">Add departure</h3>
            <form action={createExpeditionDepartureAction} className="mt-3 grid gap-2">
              <input type="hidden" name="returnTo" value={returnTo} />
              <input type="hidden" name="expeditionId" value={expedition.id} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Starts at">
                  <input name="startsAt" type="datetime-local" className={adminInputClassName} required />
                </Field>
                <Field label="Ends at">
                  <input name="endsAt" type="datetime-local" className={adminInputClassName} required />
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Field label="Capacity">
                  <input name="capacity" type="number" min={1} defaultValue={12} className={adminInputClassName} required />
                </Field>
                <Field label="Booked seats">
                  <input name="seatsBooked" type="number" min={0} defaultValue={0} className={adminInputClassName} />
                </Field>
                <Field label="Status">
                  <select name="status" defaultValue="open" className={adminSelectClassName}>
                    {departureStatuses.map((status) => (
                      <option key={status} value={status}>
                        {labelize(status)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Meeting point">
                  <input name="meetingPoint" placeholder={expedition.region} className={adminInputClassName} />
                </Field>
                <Field label="Trip leader">
                  <input name="guide" placeholder="Field team leader" className={adminInputClassName} />
                </Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                <Field label="Minimum">
                  <input name="minParticipants" type="number" min={1} defaultValue={6} className={adminInputClassName} />
                </Field>
                <Field label="Weather advisory">
                  <input name="weatherAdvisory" className={adminInputClassName} />
                </Field>
              </div>
              <Button type="submit" className="w-fit rounded-lg">
                <CalendarPlus className="size-4" aria-hidden="true" />
                Add Departure
              </Button>
            </form>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-coral-700/20 bg-white p-4 shadow-soft">
        <h2 className="text-xl font-bold tracking-normal text-ocean-900">Delete expedition</h2>
        <p className="mt-1 text-sm font-semibold text-ocean-900/58">Expeditions with bookings cannot be deleted.</p>
        <form action={deleteExpeditionAction} className="mt-4">
          <input type="hidden" name="returnTo" value="/admin/expeditions" />
          <input type="hidden" name="expeditionId" value={expedition.id} />
          <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
            <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" disabled={expedition.bookingCount > 0} required />
            Delete this expedition and its departures.
          </label>
          <Button
            type="submit"
            className="mt-3 w-fit rounded-lg bg-coral-500 hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={expedition.bookingCount > 0}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete Expedition
          </Button>
        </form>
      </section>
    </div>
  );
}
