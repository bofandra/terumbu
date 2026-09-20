import { Plus } from "lucide-react";
import type { ReactNode } from "react";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminFormDraftPersistence } from "@/components/admin/admin-form-draft-persistence";
import { AdminFormErrorSummary, type AdminFormErrorItem } from "@/components/admin/admin-form-error-summary";
import { AdminPageHeader, adminInputClassName, adminPanelClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { adminFormFieldNames } from "@/lib/admin-form-state";
import { requireRole } from "@/lib/auth";
import { campaignCurrencies, impactSiteEcosystemTypes } from "@/lib/campaign-content";
import { createAdminCampaignAction } from "@/lib/portal-actions";
import { getAdminPortalData, getAdminUnassignedImpactSiteOptions } from "@/lib/queries";

export const metadata = {
  title: "New Project"
};

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "campaign-invalid": "Some required project fields need attention. Your input has been preserved.",
  "campaign-slug": "That project title is already in use. Your input has been preserved.",
  "image-size": "Uploaded image is too large. Choose a smaller file and submit again.",
  "image-type": "Upload a supported image file and submit again.",
  "impact-site-assigned": "Choose an unassigned impact site or create a new linked site.",
  "impact-site-invalid": "Some new impact site fields need attention. Your input has been preserved.",
  "impact-site-missing": "Choose an existing unassigned impact site.",
  "organization-missing": "Choose an existing partner."
};

type SearchValue = string | string[] | undefined;
type AdminCampaignNewPageProps = {
  searchParams?: Promise<{
    error?: SearchValue;
    field?: SearchValue;
  }>;
};

const campaignFieldDefinitions: Record<string, Omit<AdminFormErrorItem, "message"> & { message: string }> = {
  organizationId: { fieldId: "campaign-organizationId", label: "Partner", message: "Choose an existing partner." },
  title: { fieldId: "campaign-title", label: "Project title", message: "Enter a unique project title." },
  goalAmount: { fieldId: "campaign-goalAmount", label: "Goal amount", message: "Enter an amount greater than zero." },
  summary: { fieldId: "campaign-summary", label: "Short summary", message: "Enter a short project summary." },
  existingImpactSiteId: { fieldId: "campaign-existingImpactSiteId", label: "Existing impact site", message: "Choose an available impact site." },
  impactSiteName: { fieldId: "campaign-impactSiteName", label: "New site name", message: "Enter a site name." },
  impactSiteRegion: { fieldId: "campaign-impactSiteRegion", label: "Impact site region", message: "Enter the impact site region." },
  impactSiteLatitude: { fieldId: "campaign-impactSiteLatitude", label: "Latitude", message: "Enter a latitude from -90 to 90." },
  impactSiteLongitude: { fieldId: "campaign-impactSiteLongitude", label: "Longitude", message: "Enter a longitude from -180 to 180." },
  imageFile: { fieldId: "campaign-imageFile", label: "Project image", message: "Choose a supported image file again." }
};

function first(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function campaignFieldErrors(fields: string[]) {
  return fields.flatMap((field) => {
    const definition = campaignFieldDefinitions[field];
    return definition ? [definition] : [];
  });
}

function fieldA11y(invalidFields: Set<string>, name: string) {
  return invalidFields.has(name) ? { "aria-invalid": true as const } : {};
}

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
  organizations,
  invalid
}: {
  organizations: Awaited<ReturnType<typeof getAdminPortalData>>["organizations"];
  invalid: boolean;
}) {
  return (
    <select id="campaign-organizationId" name="organizationId" defaultValue={organizations[0]?.id} className={adminSelectClassName} required aria-invalid={invalid || undefined}>
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
  const errorCode = first(params?.error);
  const errorMessage = errorCode ? errorMessages[errorCode] : null;
  const invalidFieldNames = adminFormFieldNames(params?.field);
  const invalidFields = new Set(invalidFieldNames);
  const fieldErrors = campaignFieldErrors(invalidFieldNames);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects"
        title="Create project"
        description="Start with the basics. Add story, media, and impact site details after creation."
        actionHref="/admin/campaigns"
        actionLabel="Back to projects"
      />

      {errorMessage ? <AdminAlert tone="error" title="Project was not created">{errorMessage}</AdminAlert> : null}
      <AdminFormErrorSummary errors={fieldErrors} />

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Project</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Only the required setup fields are shown.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form id="admin-campaign-create-form" action={createAdminCampaignAction} encType="multipart/form-data" className="grid gap-4 p-4">
          <AdminFormDraftPersistence
            formId="admin-campaign-create-form"
            storageKey="terumbu:admin:create-project"
            restore={Boolean(errorCode)}
            focusFieldId={fieldErrors[0]?.fieldId}
          />
          <input type="hidden" name="errorReturnTo" value="/admin/campaigns/new" />
          <input type="hidden" name="savedReturnTo" value="/admin/campaigns" />
          <input type="hidden" name="status" value="draft" />

          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Project title">
              <input id="campaign-title" name="title" placeholder="Restore Raja Ampat Reefs" className={adminInputClassName} required {...fieldA11y(invalidFields, "title")} />
            </Field>
            <Field label="Partner">
              <OrganizationSelect organizations={data.organizations} invalid={invalidFields.has("organizationId")} />
            </Field>
          </div>
          <Field label="Goal amount" help="Use IDR. Currency and status can be changed later.">
            <input id="campaign-goalAmount" name="goalAmount" type="number" min={1} step="1" placeholder="50000000" className={adminInputClassName} required {...fieldA11y(invalidFields, "goalAmount")} />
          </Field>
          <Field label="Short summary">
            <textarea id="campaign-summary" name="summary" placeholder="One or two sentences describing the project." className={adminTextareaClassName} required {...fieldA11y(invalidFields, "summary")} />
          </Field>

          <details className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-ocean-900">Optional impact site and public defaults</summary>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <Field label="Impact site link">
                  <select id="campaign-impactLinkMode" name="impactLinkMode" defaultValue="none" className={adminSelectClassName}>
                    <option value="none">No impact site yet</option>
                    <option value="existing">Link unassigned impact site</option>
                    <option value="new">Create new impact site</option>
                  </select>
                </Field>
                <Field label="Existing impact site">
                  <select id="campaign-existingImpactSiteId" name="existingImpactSiteId" defaultValue="" className={adminSelectClassName} {...fieldA11y(invalidFields, "existingImpactSiteId")}>
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
                  <input id="campaign-impactSiteName" name="impactSiteName" placeholder="Raja Ampat Reef Garden" className={adminInputClassName} {...fieldA11y(invalidFields, "impactSiteName")} />
                </Field>
                <Field label="Ecosystem type">
                  <select id="campaign-impactSiteEcosystemType" name="impactSiteEcosystemType" defaultValue="Coral" className={adminSelectClassName}>
                    {impactSiteEcosystemTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Region">
                  <input id="campaign-impactSiteRegion" name="impactSiteRegion" placeholder="Raja Ampat" className={adminInputClassName} {...fieldA11y(invalidFields, "impactSiteRegion")} />
                </Field>
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                <Field label="Latitude">
                  <input id="campaign-impactSiteLatitude" name="impactSiteLatitude" type="number" min="-90" max="90" step="0.000001" placeholder="-0.234900" className={adminInputClassName} {...fieldA11y(invalidFields, "impactSiteLatitude")} />
                </Field>
                <Field label="Longitude">
                  <input id="campaign-impactSiteLongitude" name="impactSiteLongitude" type="number" min="-180" max="180" step="0.000001" placeholder="130.516600" className={adminInputClassName} {...fieldA11y(invalidFields, "impactSiteLongitude")} />
                </Field>
                <Field label="Currency">
                  <select id="campaign-currency" name="currency" defaultValue="IDR" className={adminSelectClassName}>
                    {campaignCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fallback region">
                  <input id="campaign-region" name="region" placeholder="Indonesia" className={adminInputClassName} />
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
