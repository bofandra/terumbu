import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Impact Sites"
};

export const dynamic = "force-dynamic";

export default async function AdminImpactSitesPage() {
  await requireRole(["admin"], "/admin/impact-sites");
  const data = await getAdminOperationsData();

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-coral-700 hover:text-coral-500">Admin overview</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">Impact site management</h1>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {data.impactSites.map((site) => (
            <article key={site.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{site.ecosystemType}</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{site.name}</h2>
              <p className="mt-1 text-sm text-ocean-900/58">{site.region} · {site.campaignTitle ?? "No campaign"}</p>
              <p className="mt-4 text-sm font-bold text-kelp-700">{site.progress}% progress · {site.evidenceCount} evidence records</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
