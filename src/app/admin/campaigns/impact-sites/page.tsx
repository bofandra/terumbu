import { FileCheck2, MapPinned, Target } from "lucide-react";

import { AdminEmptyState, AdminPageHeader } from "@/components/admin-ui";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Campaign Impact Sites"
};

export const dynamic = "force-dynamic";

export default async function AdminCampaignImpactSitesPage() {
  await requireRole(["admin"], "/admin/campaigns/impact-sites");
  const data = await getAdminOperationsData();

  const totalEvidence = data.impactSites.reduce((total, site) => total + site.evidenceCount, 0);
  const averageProgress =
    data.impactSites.length > 0 ? Math.round(data.impactSites.reduce((total, site) => total + site.progress, 0) / data.impactSites.length) : 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns / Impact sites"
        title="Impact site management"
        description="Impact sites are the real conservation locations behind campaign claims: the reef, mangrove, or community area where progress and evidence are tracked."
        actionHref="/admin/campaigns"
        actionLabel="Campaigns"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Impact site summary">
        {[
          { label: "Sites", value: data.impactSites.length.toLocaleString("id-ID"), icon: MapPinned },
          { label: "Average progress", value: `${averageProgress}%`, icon: Target },
          { label: "Evidence records", value: totalEvidence.toLocaleString("id-ID"), icon: FileCheck2 }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-kelp-100 text-kelp-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {data.impactSites.map((site) => (
          <article key={site.id} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{site.ecosystemType}</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{site.name}</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.region}</p>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.campaignTitle ?? "No campaign linked"}</p>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3 text-sm font-bold text-ocean-900">
                <span>Progress</span>
                <span>{site.progress}%</span>
              </div>
              <ProgressMeter value={site.progress} label={`${site.name} progress`} className="mt-2 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-sand-100" />
            </div>

            <p className="mt-4 text-sm font-bold text-kelp-700">{site.evidenceCount.toLocaleString("id-ID")} evidence records</p>
          </article>
        ))}
        {data.impactSites.length === 0 ? (
          <AdminEmptyState
            className="md:col-span-2"
            title="No impact sites yet"
            description="Create or publish campaign impact locations before they can be tracked from the admin workspace."
            actionHref="/admin/campaigns"
            actionLabel="Manage campaigns"
          />
        ) : null}
      </section>
    </div>
  );
}
