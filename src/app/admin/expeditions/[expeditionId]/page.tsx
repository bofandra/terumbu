import Link from "next/link";
import { ArrowUpRight, CalendarDays, MessageSquareText, ShieldCheck, Star, Users } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader, AdminStatusBadge, adminPanelClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { updateExpeditionPublicationStatusAction } from "@/lib/portal-actions";
import { getAdminExpeditionWorkspaceData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Expedition Monitoring"
};

export const dynamic = "force-dynamic";

type AdminExpeditionDetailPageProps = {
  params: Promise<{
    expeditionId: string;
  }>;
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const savedMessages: Record<string, string> = {
  "expedition-published": "Expedition approved and published.",
  "expedition-changes-requested": "Expedition returned to draft for partner revision."
};

const errorMessages: Record<string, string> = {
  "expedition-review": "Choose a valid publication decision.",
  "expedition-missing": "Expedition record was not found.",
  "expedition-review-state": "Only expeditions currently in review can be moderated."
};

export default async function AdminExpeditionDetailPage({ params, searchParams }: AdminExpeditionDetailPageProps) {
  const [{ expeditionId }, query] = await Promise.all([params, searchParams]);
  await requireRole(["admin"], `/admin/expeditions/${expeditionId}`);
  const data = await observeAdminDataLoader("admin.expedition.workspace", () => getAdminExpeditionWorkspaceData(expeditionId));

  if (!data) {
    notFound();
  }

  const expedition = data.expedition;
  const savedMessage = query?.saved ? savedMessages[query.saved] ?? "Expedition moderation saved." : null;
  const errorMessage = query?.error ? errorMessages[query.error] ?? "Expedition moderation could not be saved." : null;
  const openDepartures = expedition.departures.filter((departure) => departure.status === "open").length;
  const availableSeats = expedition.departures.reduce((total, departure) => total + departure.availableSeats, 0);
  const relatedCampaign = data.campaignOptions.find((campaign) => campaign.id === expedition.relatedCampaignId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions / Read only"
        title={expedition.title}
        description={`${expedition.region} / ${expedition.durationDays} days / ${formatCurrency(expedition.basePrice, expedition.currency)}`}
        actionHref="/admin/expeditions"
        actionLabel="Expedition list"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="rounded-lg border border-kelp-700/20 bg-kelp-100/50 p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-kelp-700" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-ocean-900">Partner-owned record</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/62">
              Platform admins can monitor expedition catalog data and operational activity, but cannot edit trip content, route, itinerary, departures, or delete the expedition. Those changes belong to the partner portal.
            </p>
            {expedition.relatedCampaignId ? (
              <Link href={`/admin/campaigns/${expedition.relatedCampaignId}`} className="mt-3 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
                View related donation →
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {expedition.status === "review" ? (
        <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Publication review</p>
              <h2 className="mt-2 text-xl font-bold text-ocean-900">Review partner expedition</h2>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/58">
                Approval changes only publication state. Trip content, itinerary, departures, and logistics remain partner-owned.
              </p>
            </div>
            <AdminStatusBadge value={expedition.status} />
          </div>
          <form action={updateExpeditionPublicationStatusAction} className="mt-5 grid gap-4">
            <input type="hidden" name="expeditionId" value={expedition.id} />
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Review note <span className="font-semibold text-ocean-900/42">(optional)</span>
              <textarea
                name="reviewNote"
                className="min-h-24 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none focus:border-kelp-500 focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
                placeholder="Add context when requesting revisions."
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="decision" value="publish">Approve & publish</Button>
              <Button type="submit" name="decision" value="request_changes" tone="secondary">Request changes</Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Expedition monitoring summary">
        {[
          { label: "Departures", value: expedition.departures.length.toLocaleString("id-ID"), icon: CalendarDays },
          { label: "Open", value: openDepartures.toLocaleString("id-ID"), icon: CalendarDays },
          { label: "Available seats", value: availableSeats.toLocaleString("id-ID"), icon: Users },
          { label: "Bookings", value: expedition.bookingCount.toLocaleString("id-ID"), icon: Users },
          { label: "Pending requests", value: expedition.pendingInterestRequestCount.toLocaleString("id-ID"), icon: MessageSquareText },
          { label: "Pending reviews", value: expedition.pendingReviewCount.toLocaleString("id-ID"), icon: Star }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <MetricValue className="mt-2 text-ocean-900">{item.value}</MetricValue>
                </div>
                <Icon className="size-5 text-ocean-700" aria-hidden="true" />
              </div>
            </article>
          );
        })}
      </section>

      <FormTabs
        ariaLabel="Expedition monitoring"
        tabs={[
          { id: "overview", label: "Overview", description: "Catalog snapshot" },
          { id: "departures", label: "Departures", description: "Schedules", badge: expedition.departures.length.toLocaleString("id-ID") },
          { id: "bookings", label: "Bookings", description: "Reservations", badge: expedition.bookingCount.toLocaleString("id-ID") },
          { id: "requests", label: "Requests", description: "Questions and demand", badge: expedition.interestRequestCount.toLocaleString("id-ID") },
          { id: "reviews", label: "Reviews", description: "Public feedback", badge: expedition.reviewCount.toLocaleString("id-ID") }
        ]}
      >
        <section className={adminPanelClassName}>
          <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-start">
            <div>
              <h2 className="text-xl font-bold text-ocean-900">Catalog snapshot</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">{expedition.summary}</p>
            </div>
            {expedition.status === "published" ? (
              <Link href={`/expeditions/${expedition.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                Public page
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            ) : (
              <AdminStatusBadge value={expedition.status} />
            )}
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-sand-50 p-4"><p className="text-sm font-semibold text-ocean-900/54">Region</p><p className="mt-2 font-bold text-ocean-900">{expedition.region}</p></div>
            <div className="rounded-lg bg-sand-50 p-4"><p className="text-sm font-semibold text-ocean-900/54">Duration</p><p className="mt-2 font-bold text-ocean-900">{expedition.durationDays} days</p></div>
            <div className="rounded-lg bg-sand-50 p-4"><p className="text-sm font-semibold text-ocean-900/54">Base price</p><p className="mt-2 font-bold text-ocean-900">{formatCurrency(expedition.basePrice, expedition.currency)}</p></div>
            <div className="rounded-lg bg-sand-50 p-4 sm:col-span-2 lg:col-span-3">
              <p className="text-sm font-semibold text-ocean-900/54">Related donation</p>
              <p className="mt-2 font-bold text-ocean-900">{expedition.relatedCampaignTitle ?? "Not linked"}</p>
              {relatedCampaign ? <p className="mt-1 text-sm font-semibold text-ocean-900/52">Partner: {relatedCampaign.organizationName}</p> : null}
            </div>
          </div>
        </section>

        <section className="grid gap-3">
          {expedition.departures.map((departure) => (
            <article key={departure.id} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-bold text-ocean-900">
                    {departure.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} – {departure.endsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/54">
                    {departure.meetingPoint ?? "Meeting point pending"} · {departure.guide ?? "Guide pending"}
                  </p>
                </div>
                <AdminStatusBadge value={departure.status} />
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4 text-sm">
                <div className="rounded-lg bg-sand-50 p-3"><p className="font-semibold text-ocean-900/48">Capacity</p><p className="mt-1 font-bold text-ocean-900">{departure.capacity}</p></div>
                <div className="rounded-lg bg-sand-50 p-3"><p className="font-semibold text-ocean-900/48">Booked seats</p><p className="mt-1 font-bold text-ocean-900">{departure.seatsBooked}</p></div>
                <div className="rounded-lg bg-sand-50 p-3"><p className="font-semibold text-ocean-900/48">Available</p><p className="mt-1 font-bold text-ocean-900">{departure.availableSeats}</p></div>
                <div className="rounded-lg bg-sand-50 p-3"><p className="font-semibold text-ocean-900/48">Minimum</p><p className="mt-1 font-bold text-ocean-900">{departure.minParticipants}</p></div>
              </div>
            </article>
          ))}
          {expedition.departures.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5 text-sm font-semibold text-ocean-900/54">No departures.</p> : null}
        </section>

        <section className="grid gap-3">
          {expedition.bookings.map((booking) => (
            <article key={booking.id} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-bold text-ocean-900">{booking.contactName} · {booking.bookingCode}</p>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/54">{booking.contactEmail} · {booking.participantsCount} participants</p>
                </div>
                <div className="flex gap-2"><AdminStatusBadge value={booking.status} /><AdminStatusBadge value={booking.paymentStatus} /></div>
              </div>
              <p className="mt-3 text-sm font-bold text-ocean-900">{formatCurrency(booking.totalAmount, booking.currency)}</p>
            </article>
          ))}
          {expedition.bookings.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5 text-sm font-semibold text-ocean-900/54">No bookings.</p> : null}
        </section>

        <section className="grid gap-3">
          {expedition.interestRequests.map((request) => (
            <article key={request.id} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-bold text-ocean-900">{request.contactName} · {request.requestCode}</p>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/54">{request.contactEmail} · {request.requestType}</p>
                </div>
                <AdminStatusBadge value={request.status} />
              </div>
              {request.message ? <p className="mt-3 rounded-lg bg-sand-50 p-3 text-sm font-semibold leading-6 text-ocean-900/62">{request.message}</p> : null}
            </article>
          ))}
          {expedition.interestRequests.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5 text-sm font-semibold text-ocean-900/54">No requests.</p> : null}
        </section>

        <section className="grid gap-3">
          {expedition.reviews.map((review) => (
            <article key={review.id} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-bold text-ocean-900">{review.reviewerName}</p>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/54">{review.rating}/5 · {review.reviewerEmail}</p>
                </div>
                <AdminStatusBadge value={review.status} />
              </div>
              {review.title ? <h3 className="mt-3 font-bold text-ocean-900">{review.title}</h3> : null}
              <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/62">{review.body}</p>
            </article>
          ))}
          {expedition.reviews.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5 text-sm font-semibold text-ocean-900/54">No reviews.</p> : null}
        </section>
      </FormTabs>
    </div>
  );
}
