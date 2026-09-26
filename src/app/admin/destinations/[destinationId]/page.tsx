import { notFound } from "next/navigation";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminDestinationForm } from "@/components/admin-destination-form";
import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";
import { getAdminDestination } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Manage Destination"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
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

type AdminDestinationDetailPageProps = {
  params: Promise<{ destinationId: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminDestinationDetailPage({ params, searchParams }: AdminDestinationDetailPageProps) {
  const [{ destinationId }, query] = await Promise.all([params, searchParams]);
  await requireRole(["admin"], `/admin/destinations/${destinationId}`);
  const destination = await getAdminDestination(destinationId);

  if (!destination) notFound();

  const savedMessage = query?.saved ? statusMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Destinations"
        title={destination.name}
        description={`${destination.province} · ${destination.islandGroup} · canonical destination record`}
        actionHref="/admin/destinations"
        actionLabel="Destination list"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Derived destination data">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Status</p>
          <div className="mt-2"><AdminStatusBadge value={destination.status} /></div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Published expeditions</p>
          <p className="mt-2 text-xl font-bold text-ocean-900">{destination.expeditionCount}</p>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Public impact sites</p>
          <p className="mt-2 text-xl font-bold text-ocean-900">{destination.impactSiteCount}</p>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Starting price</p>
          <p className="mt-2 text-xl font-bold text-ocean-900">
            {destination.startingPrice && destination.startingCurrency
              ? formatCurrency(destination.startingPrice, destination.startingCurrency)
              : "—"}
          </p>
        </article>
      </section>

      <AdminDestinationForm destination={destination} returnTo={`/admin/destinations/${destination.id}`} />
    </div>
  );
}
