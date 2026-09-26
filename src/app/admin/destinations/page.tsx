import Link from "next/link";
import { CalendarDays, MapPinned, Pencil, Plus, ShipWheel } from "lucide-react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminEmptyState, AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";
import { getAdminDestinations } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Destinations"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "destination-created": "Destination created.",
  "destination-updated": "Destination updated."
};

const errorMessages: Record<string, string> = {
  "destination-invalid": "Complete the required destination fields.",
  "destination-slug": "That destination slug is already in use.",
  "destination-missing": "Destination record was not found.",
  "destination-not-ready": "Add at least one conservation focus before publishing.",
  "image-size": "Uploaded hero image is too large.",
  "image-type": "Upload a supported hero image."
};

type AdminDestinationsPageProps = {
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminDestinationsPage({ searchParams }: AdminDestinationsPageProps) {
  await requireRole(["admin"], "/admin/destinations");
  const [destinations, params] = await Promise.all([getAdminDestinations(), searchParams]);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;
  const publishedCount = destinations.filter((destination) => destination.status === "published").length;
  const linkedExpeditions = destinations.reduce((total, destination) => total + destination.expeditionCount, 0);
  const linkedSites = destinations.reduce((total, destination) => total + destination.impactSiteCount, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Destinations"
        title="Destination CMS"
        description="Manage canonical destination facts used by public discovery, expeditions, and impact sites. Counts, starting prices, and next departures are calculated automatically."
        actionHref="/admin/destinations/new"
        actionLabel="New destination"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Destination summary">
        {[
          { label: "Destinations", value: destinations.length.toLocaleString("id-ID"), icon: MapPinned },
          { label: "Published", value: publishedCount.toLocaleString("id-ID"), icon: MapPinned },
          { label: "Linked expeditions", value: linkedExpeditions.toLocaleString("id-ID"), icon: ShipWheel },
          { label: "Linked impact sites", value: linkedSites.toLocaleString("id-ID"), icon: CalendarDays }
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{metric.label}</p>
                  <p className="mt-2 text-2xl font-bold text-ocean-900">{metric.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-sand-100 text-ocean-900">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      {destinations.length > 0 ? (
        <section className="grid gap-4">
          {destinations.map((destination) => (
            <article key={destination.id} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-ocean-900">{destination.name}</h2>
                    <AdminStatusBadge value={destination.status} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/54">
                    {destination.province} · {destination.islandGroup} · /{destination.slug}
                  </p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-ocean-900/64">{destination.summary}</p>
                </div>
                <Link
                  href={`/admin/destinations/${destination.id}`}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Manage
                </Link>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">Expeditions</p>
                  <p className="mt-1 font-bold text-ocean-900">{destination.expeditionCount}</p>
                </div>
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">Impact sites</p>
                  <p className="mt-1 font-bold text-ocean-900">{destination.impactSiteCount}</p>
                </div>
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">Starting price</p>
                  <p className="mt-1 font-bold text-ocean-900">
                    {destination.startingPrice && destination.startingCurrency
                      ? formatCurrency(destination.startingPrice, destination.startingCurrency)
                      : "No published price"}
                  </p>
                </div>
                <div className="rounded-lg bg-sand-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/46">Next departure</p>
                  <p className="mt-1 font-bold text-ocean-900">
                    {destination.nextDeparture
                      ? destination.nextDeparture.toLocaleDateString("en", { dateStyle: "medium" })
                      : "No open departure"}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <AdminEmptyState
          title="No destinations yet"
          description="Create the first managed destination before partners link expeditions and impact sites."
          actionHref="/admin/destinations/new"
          actionLabel="Create destination"
        />
      )}

      <Link href="/admin/destinations/new" className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-coral-700">
        <Plus className="size-4" aria-hidden="true" />
        Add another destination
      </Link>
    </div>
  );
}
