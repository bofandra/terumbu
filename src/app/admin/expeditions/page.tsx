import { CalendarDays, ShipWheel, Users } from "lucide-react";

import { AdminPageHeader, AdminStatusBadge } from "@/components/admin-ui";
import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Expeditions"
};

export const dynamic = "force-dynamic";

export default async function AdminExpeditionsPage() {
  await requireRole(["admin"], "/admin/expeditions");
  const data = await getAdminOperationsData();

  const scheduledDepartures = data.expeditions.filter((expedition) => expedition.startsAt).length;
  const totalSeats = data.expeditions.reduce((total, expedition) => total + (expedition.availableSeats ?? 0), 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Expeditions"
        title="Expedition management"
        description="Review trip catalog records, departure timing, seat availability, and departure status."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Expedition summary">
        {[
          { label: "Catalog rows", value: data.expeditions.length.toLocaleString("id-ID"), icon: ShipWheel },
          { label: "Scheduled departures", value: scheduledDepartures.toLocaleString("id-ID"), icon: CalendarDays },
          { label: "Available seats", value: totalSeats.toLocaleString("id-ID"), icon: Users }
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

      <section className="grid gap-4 md:grid-cols-2">
        {data.expeditions.map((expedition) => (
          <article key={`${expedition.id}-${expedition.departureId ?? "catalog"}`} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-xl font-bold tracking-normal text-ocean-900">{expedition.title}</h2>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">{expedition.region}</p>
              </div>
              <AdminStatusBadge value={expedition.status ?? "draft"} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Price</p>
                <p className="mt-1 font-bold text-ocean-900">{formatCurrency(expedition.basePrice)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Departure</p>
                <p className="mt-1 font-bold text-ocean-900">
                  {expedition.startsAt ? expedition.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "No date"}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Seats</p>
                <p className="mt-1 font-bold text-ocean-900">{expedition.availableSeats ?? "N/A"}</p>
              </div>
            </div>
          </article>
        ))}
        {data.expeditions.length === 0 ? <p className="rounded-lg border border-ocean-900/10 bg-white p-4 text-sm font-semibold text-ocean-900/58 shadow-soft">No expeditions found.</p> : null}
      </section>
    </div>
  );
}
