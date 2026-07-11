import Link from "next/link";
import { ArrowUpRight, CalendarDays, CalendarPlus, MessageSquareText, Plus, ShipWheel, Users } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminPanelClassName } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Expeditions"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "departure-created": "Departure created.",
  "departure-deleted": "Departure deleted.",
  "departure-updated": "Departure updated.",
  "expedition-created": "Expedition created.",
  "expedition-deleted": "Expedition deleted.",
  "expedition-updated": "Expedition updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing related campaign or leave the field empty.",
  "departure-capacity": "Capacity cannot be lower than seats already booked.",
  "departure-delete": "Confirm departure deletion by checking the delete box.",
  "departure-duplicate": "That expedition already has a departure with the same start time.",
  "departure-has-bookings": "Departures with bookings cannot be deleted.",
  "departure-invalid": "Enter valid departure dates and capacity.",
  "departure-missing": "Departure record was not found.",
  "expedition-delete": "Confirm expedition deletion by checking the delete box.",
  "expedition-has-bookings": "Expeditions with bookings cannot be deleted.",
  "expedition-invalid": "Enter a title, slug, region, duration, price, and summary.",
  "expedition-missing": "Expedition record was not found.",
  "expedition-slug": "That expedition slug is already in use."
};

type AdminExpeditionsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function AdminExpeditionsPage({ searchParams }: AdminExpeditionsPageProps) {
  await requireRole(["admin"], "/admin/expeditions");
  const params = await searchParams;
  const data = await getAdminOperationsData();

  const scheduledDepartures = data.expeditionCatalog.reduce((total, expedition) => total + expedition.departures.length, 0);
  const totalSeats = data.expeditionCatalog.reduce(
    (total, expedition) => total + expedition.departures.reduce((departureTotal, departure) => departureTotal + departure.availableSeats, 0),
    0
  );
  const openDepartures = data.expeditionCatalog.reduce(
    (total, expedition) => total + expedition.departures.filter((departure) => departure.status === "open").length,
    0
  );
  const pendingReviews = data.expeditionCatalog.reduce((total, expedition) => total + expedition.reviews.filter((review) => review.status === "pending").length, 0);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions"
        title="Expedition management"
        description="Review the trip catalog, available departures, booking counts, and open a focused workspace for schedule changes."
        actionHref="/admin/expeditions/new"
        actionLabel="New expedition"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="Expedition summary">
        {[
          { label: "Catalog rows", value: data.expeditionCatalog.length.toLocaleString("id-ID"), icon: ShipWheel },
          { label: "Departures", value: scheduledDepartures.toLocaleString("id-ID"), icon: CalendarDays },
          { label: "Open departures", value: openDepartures.toLocaleString("id-ID"), icon: CalendarPlus },
          { label: "Available seats", value: totalSeats.toLocaleString("id-ID"), icon: Users },
          { label: "Pending reviews", value: pendingReviews.toLocaleString("id-ID"), icon: MessageSquareText }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Trip catalog</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Public trip records and their active departure footprint.</p>
          </div>
          <Link
            href="/admin/expeditions/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
          >
            <Plus className="size-4" aria-hidden="true" />
            New expedition
          </Link>
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.expeditionCatalog.map((expedition) => (
            <article key={expedition.id} className="p-4">
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold tracking-normal text-ocean-900">{expedition.title}</h3>
                    {expedition.relatedCampaignTitle ? <AdminStatusBadge value="published" /> : <AdminStatusBadge value="draft" />}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    {expedition.region} / {expedition.durationDays} days / {formatCurrency(expedition.basePrice)}
                  </p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/44">
                    {expedition.departures.length.toLocaleString("id-ID")} departures / {expedition.bookingCount.toLocaleString("id-ID")} bookings /{" "}
                    {expedition.reviews.filter((review) => review.status === "pending").length.toLocaleString("id-ID")} pending reviews
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Link href={`/expeditions/${expedition.slug}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700">
                    Public
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link href={`/admin/expeditions/${expedition.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700">
                    Manage
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {data.expeditionCatalog.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title="No expeditions yet"
              description="Create an expedition before adding departures, booking capacity, and field team guidance."
              actionHref="/admin/expeditions/new"
              actionLabel="Create expedition"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
