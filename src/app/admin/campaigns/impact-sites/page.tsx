import { FileCheck2, MapPinned, Pencil, Plus, Save, Target, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  AdminEmptyState,
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireRole } from "@/lib/auth";
import { createAdminImpactSiteAction, deleteAdminImpactSiteAction, updateAdminImpactSiteAction } from "@/lib/portal-actions";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Campaign Impact Sites"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "impact-site-created": "Impact site created.",
  "impact-site-deleted": "Impact site deleted.",
  "impact-site-updated": "Impact site updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing campaign.",
  "impact-site-delete": "Confirm impact-site deletion by checking the delete box.",
  "impact-site-invalid": "Enter site name, ecosystem type, region, valid coordinates, progress between 0 and 100, and evidence count.",
  "impact-site-missing": "Impact site record was not found."
};

type AdminCampaignImpactSitesPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

type AdminOperationsData = Awaited<ReturnType<typeof getAdminOperationsData>>;
type CampaignOption = AdminOperationsData["campaignOptions"][number];
type ImpactSite = AdminOperationsData["impactSites"][number];

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

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function dateValue(value: string | null) {
  return value ?? "";
}

function CampaignSelect({ campaigns, defaultValue }: { campaigns: CampaignOption[]; defaultValue?: string | null }) {
  return (
    <select name="campaignId" defaultValue={defaultValue ?? ""} className={adminSelectClassName}>
      <option value="">Unassigned staging site</option>
      {campaigns.map((campaign) => (
        <option key={campaign.id} value={campaign.id}>
          {campaign.title} / {campaign.organizationName} / {labelize(campaign.status)}
        </option>
      ))}
    </select>
  );
}

function VerificationSelect({ defaultValue = "basic" }: { defaultValue?: string | null }) {
  return (
    <select name="verification" defaultValue={defaultValue ?? "basic"} className={adminSelectClassName}>
      {["basic", "document", "field"].map((status) => (
        <option key={status} value={status}>
          {labelize(status)}
        </option>
      ))}
    </select>
  );
}

function ImpactSiteFields({ campaigns, site }: { campaigns: CampaignOption[]; site?: ImpactSite }) {
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-3">
        <Field label="Linked campaign" className="lg:col-span-2">
          <CampaignSelect campaigns={campaigns} defaultValue={site?.campaignId} />
        </Field>
        <Field label="Verification">
          <VerificationSelect defaultValue={site?.verification} />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <Field label="Site name">
          <input name="name" defaultValue={site?.name} placeholder="Raja Ampat Reef Garden" className={adminInputClassName} required />
        </Field>
        <Field label="Ecosystem type">
          <input name="ecosystemType" defaultValue={site?.ecosystemType} placeholder="Coral" className={adminInputClassName} required />
        </Field>
        <Field label="Region">
          <input name="region" defaultValue={site?.region} placeholder="Southwest Papua" className={adminInputClassName} required />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-5">
        <Field label="Latitude">
          <input name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={site?.latitude} placeholder="-0.234900" className={adminInputClassName} required />
        </Field>
        <Field label="Longitude">
          <input name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={site?.longitude} placeholder="130.516600" className={adminInputClassName} required />
        </Field>
        <Field label="Progress">
          <input name="progress" type="number" min="0" max="100" step="1" defaultValue={site?.progress ?? 0} className={adminInputClassName} />
        </Field>
        <Field label="Evidence records">
          <input name="evidenceCount" type="number" min="0" step="1" defaultValue={site?.evidenceCount ?? 0} className={adminInputClassName} />
        </Field>
        <Field label="Latest survey">
          <input name="latestSurvey" type="date" defaultValue={dateValue(site?.latestSurvey ?? null)} className={adminInputClassName} />
        </Field>
      </div>
    </>
  );
}

export default async function AdminCampaignImpactSitesPage({ searchParams }: AdminCampaignImpactSitesPageProps) {
  await requireRole(["admin"], "/admin/campaigns/impact-sites");
  const params = await searchParams;
  const data = await getAdminOperationsData();

  const totalEvidence = data.impactSites.reduce((total, site) => total + site.evidenceCount, 0);
  const averageProgress =
    data.impactSites.length > 0 ? Math.round(data.impactSites.reduce((total, site) => total + site.progress, 0) / data.impactSites.length) : 0;
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns / Impact sites"
        title="Impact site management"
        description="Impact sites are the real conservation locations behind campaign claims: the reef, mangrove, or community area where progress and evidence are tracked."
        actionHref="/admin/campaigns"
        actionLabel="Campaigns"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

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

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create impact site</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Attach a physical conservation location to a campaign.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createAdminImpactSiteAction} className="grid gap-4 p-4">
          <input type="hidden" name="returnTo" value="/admin/campaigns/impact-sites" />
          <ImpactSiteFields campaigns={data.campaignOptions} />
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Plus className="size-4" aria-hidden="true" />
            Create Impact Site
          </Button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {data.impactSites.map((site) => (
          <article key={site.id} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-white shadow-soft">
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{site.ecosystemType}</p>
                  <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{site.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.region}</p>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.campaignTitle ?? "No campaign linked"}</p>
                </div>
                <AdminStatusBadge value={site.verification} />
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3 text-sm font-bold text-ocean-900">
                  <span>Progress</span>
                  <span>{site.progress}%</span>
                </div>
                <ProgressMeter value={site.progress} label={`${site.name} progress`} className="mt-2 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-sand-100" />
              </div>

              <div className="mt-4 grid gap-2 text-sm font-bold text-ocean-900/58 sm:grid-cols-2">
                <p>{site.evidenceCount.toLocaleString("id-ID")} evidence records</p>
                <p>{site.latestSurvey ? `Latest survey ${site.latestSurvey}` : "Survey date pending"}</p>
                <p className="sm:col-span-2">{site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}</p>
              </div>
            </div>

            <details className="border-t border-ocean-900/10">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                <Pencil className="size-4 text-coral-700" aria-hidden="true" />
                Edit site
              </summary>
              <div className="border-t border-ocean-900/10 p-5">
                <form action={updateAdminImpactSiteAction} className="grid gap-4">
                  <input type="hidden" name="returnTo" value="/admin/campaigns/impact-sites" />
                  <input type="hidden" name="impactSiteId" value={site.id} />
                  <ImpactSiteFields campaigns={data.campaignOptions} site={site} />
                  <Button type="submit" tone="secondary" className="w-fit rounded-lg">
                    <Save className="size-4" aria-hidden="true" />
                    Save Site
                  </Button>
                </form>
                <form action={deleteAdminImpactSiteAction} className="mt-5 border-t border-ocean-900/10 pt-4">
                  <input type="hidden" name="returnTo" value="/admin/campaigns/impact-sites" />
                  <input type="hidden" name="impactSiteId" value={site.id} />
                  <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                    <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" required />
                    Delete this site and detach linked evidence, activity, and sponsorship records from the site.
                  </label>
                  <Button type="submit" className="mt-3 w-fit rounded-lg bg-coral-500 hover:bg-coral-700">
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete Site
                  </Button>
                </form>
              </div>
            </details>
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
