import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { AdminPageHeader, adminInputClassName, adminPanelClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { campaignCurrencies, impactSiteEcosystemTypes } from "@/lib/campaign-content";
import { requireRole } from "@/lib/auth";
import { createAdminCampaignAction } from "@/lib/portal-actions";
import { getAdminPortalData, getAdminUnassignedImpactSiteOptions } from "@/lib/queries";

export const metadata = {
  title: "New Project"
};

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "campaign-invalid": "Enter project title, partner, region, goal amount, and summary.",
  "campaign-slug": "That project title is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "impact-site-assigned": "Choose an unassigned impact site or create a new linked site.",
  "impact-site-invalid": "Enter valid impact site details.",
  "impact-site-missing": "Choose an existing unassigned impact site.",
  "organization-missing": "Choose an existing partner."
};

type AdminCampaignNewPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function Field({
  label,
  children,
  className = "",
  help
}: {
  label: string;
  children: ReactNode;
  className?: string;
  help?: string;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-bold text-ocean-900 ${className}`}>
      {label}
      {children}
      {help ? <span className="text-xs font-semibold leading-5 text-ocean-900/54">{help}</span> : null}
    </label>
  );
}

function OrganizationSelect({
  organizations
}: {
  organizations: Awaited<ReturnType<typeof getAdminPortalData>>["organizations"];
}) {
  return (
    <select name="organizationId" defaultValue={organizations[0]?.id} className={adminSelectClassName} required>
      {organizations.map((organization) => (
        <option key={organization.id} value={organization.id}>
          {organization.name} / {labelize(organization.type)}
        </option>
      ))}
    </select>
  );
}

export default async function AdminCampaignNewPage({ searchParams }: AdminCampaignNewPageProps) {
  await requireRole(["admin"], "/admin/campaigns/new");
  const params = await searchParams;
  const [data, unassignedImpactSites] = await Promise.all([getAdminPortalData(), getAdminUnassignedImpactSiteOptions()]);
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects"
        title="Create project"
        description="Start with the basics. Add story, media, and impact site details after creation."
        actionHref="/admin/campaigns"
        actionLabel="Back to projects"
      />

      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Project</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Only the required setup fields are shown.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createAdminCampaignAction} encType="multipart/form-data" className="grid gap-4 p-4">
          <input type="hidden" name="errorReturnTo" value="/admin/campaigns/new" />
          <input type="hidden" name="savedReturnTo" value="/admin/campaigns" />
          <input type="hidden" name="status" value="draft" />

          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Project title">
              <input name="title" placeholder="Restore Raja Ampat Reefs" className={adminInputClassName} required />
            </Field>
            <Field label="Partner">
              <OrganizationSelect organizations={data.organizations} />
            </Field>
          </div>
          <Field label="Goal amount" help="Use IDR. Currency and status can be changed later.">
            <input name="goalAmount" type="number" min={1} step="1" placeholder="50000000" className={adminInputClassName} required />
          </Field>
          <Field label="Short summary">
            <textarea name="summary" placeholder="One or two sentences describing the project." className={adminTextareaClassName} required />
          </Field>

          <details className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-ocean-900">Optional impact site and public defaults</summary>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <Field label="Impact site link">
                  <select name="impactLinkMode" defaultValue="none" className={adminSelectClassName}>
                    <option value="none">No impact site yet</option>
                    <option value="existing">Link unassigned impact site</option>
                    <option value="new">Create new impact site</option>
                  </select>
                </Field>
                <Field label="Existing impact site">
                  <select name="existingImpactSiteId" defaultValue="" className={adminSelectClassName}>
                    <option value="">Choose when linking existing</option>
                    {unassignedImpactSites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name} / {site.ecosystemType} / {site.region}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                <Field label="New site name">
                  <input name="impactSiteName" placeholder="Raja Ampat Reef Garden" className={adminInputClassName} />
                </Field>
                <Field label="Ecosystem type">
                  <select name="impactSiteEcosystemType" defaultValue="Coral" className={adminSelectClassName}>
                    {impactSiteEcosystemTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Region">
                  <input name="impactSiteRegion" placeholder="Raja Ampat" className={adminInputClassName} />
                </Field>
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                <Field label="Latitude">
                  <input name="impactSiteLatitude" type="number" min="-90" max="90" step="0.000001" placeholder="-0.234900" className={adminInputClassName} />
                </Field>
                <Field label="Longitude">
                  <input name="impactSiteLongitude" type="number" min="-180" max="180" step="0.000001" placeholder="130.516600" className={adminInputClassName} />
                </Field>
                <Field label="Currency">
                  <select name="currency" defaultValue="IDR" className={adminSelectClassName}>
                    {campaignCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fallback region">
                  <input name="region" placeholder="Indonesia" className={adminInputClassName} />
                </Field>
              </div>
            </div>
          </details>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg" disabled={data.organizations.length === 0}>
            <Plus className="size-4" aria-hidden="true" />
            Create project
          </Button>
        </form>
      </section>
    </div>
  );
}
