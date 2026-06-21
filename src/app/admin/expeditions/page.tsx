import Link from "next/link";

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

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-coral-700 hover:text-coral-500">Admin overview</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">Expedition management</h1>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {data.expeditions.map((expedition) => (
            <article key={`${expedition.id}-${expedition.departureId ?? "catalog"}`} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">{expedition.title}</h2>
              <p className="mt-1 text-sm text-ocean-900/58">{expedition.region} · {formatCurrency(expedition.basePrice)}</p>
              <p className="mt-4 text-sm font-bold text-kelp-700">
                {expedition.startsAt ? expedition.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "No departure"} ·{" "}
                {expedition.availableSeats ?? "N/A"} seats · {expedition.status ?? "catalog"}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
