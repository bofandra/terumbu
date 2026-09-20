import Link from "next/link";
import { ArrowUpRight, ImagePlus, MapPinned, Save, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AdminAlert } from "@/components/admin/admin-alert";
import {
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { AdminConfirmSubmit } from "@/components/admin/admin-confirm-submit";
import { CampaignContentDepthEditor } from "@/components/campaign-content-depth-editor";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { campaignCategories, campaignCurrencies, campaignImpactUnits, campaignStatuses } from "@/lib/campaign-content";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { deleteAdminCampaignAction, updateAdminCampaignAction, updateCampaignStatusAction } from "@/lib/portal-actions";
import { getAdminCampaignWorkspaceData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Manage Donation"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "campaign-created": "Campaign created with its impact relationship.",
  "campaign-updated": "Campaign updated.",
  "campaign-content-deleted": "Campaign content deleted.",
  "campaign-content-saved": "Campaign content saved.",
  status: "Project status updated."
};

const errorMessages: Record<string, string> = {
  campaign: "Choose a campaign and valid status.",
  "campaign-content-delete": "Confirm content deletion by checking the delete box.",
  "campaign-content-invalid": "Enter the required content fields before saving.",
  "campaign-content-missing": "Campaign content record was not found.",
  "campaign-delete": "Confirm campaign deletion before submitting.",
  "campaign-has-history": "Projects with donations, sponsorships, corporate portfolio links, or related expeditions cannot be deleted.",
  "campaign-invalid": "Enter project title, slug, organization, goal, impact target, summary, category, and region.",
  "campaign-missing": "Campaign record was not found.",
  "campaign-slug": "That project slug is already in use.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "organization-missing": "Choose an existing partner organization."
};

type AdminCampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function fundingProgress(raisedAmount: string | number, goalAmount: string | number) {
  const raised = Number(raisedAmount);
  const goal = Number(goalAmount);

  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((raised / goal) * 100));
}

function labelize(value: string) {
  return value.replace(/_/g, " ");
}

function dateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

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

function OrganizationSelect({
  organizations,
  defaultValue
}: {
  organizations: NonNullable<Awaited<ReturnType<typeof getAdminCampaignWorkspaceData>>>["organizations"];
  defaultValue?: string;
}) {
  return (
    <select name="organizationId" defaultValue={defaultValue ?? organizations[0]?.id} className={adminSelectClassName} required>
      {organizations.map((organization) => (
        <option key={organization.id} value={organization.id}>
          {organization.name} / {labelize(organization.type)} / {organization.verification}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({ defaultValue = "draft" }: { defaultValue?: string }) {
  return (
    <select name="status" defaultValue={defaultValue} className={adminSelectClassName}>
      {campaignStatuses.map((status) => (
        <option key={status} value={status}>
          {labelize(status)}
        </option>
      ))}
    </select>
  );
}

export default async function AdminCampaignDetailPage({ params, searchParams }: AdminCampaignDetailPageProps) {
  const { campaignId } = await params;
  await requireRole(["admin"], `/admin/campaigns/${campaignId}`);
  const query = await searchParams;
  const data = await observeAdminDataLoader("admin.campaign.workspace", () => getAdminCampaignWorkspaceData(campaignId));

  if (!data) {
    notFound();
  }

  const campaign = data.campaign;

  const returnTo = `/admin/campaigns/${campaign.id}`;
  const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);
  const hasHistory =
    campaign.donationRecordCount > 0 ||
    campaign.sponsorshipRecordCount > 0 ||
    campaign.corporatePortfolioCount > 0 ||
    campaign.relatedExpeditionCount > 0;
  const savedMessage = query?.saved ? statusMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;
  const campaignMedia = data.mediaItems;
  const campaignBudget = data.budgetLineItems;
  const campaignTimeline = data.timelinePhases;
  const campaignTeam = data.teamMembers;
  const campaignImpactSites = data.impactSites;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Donations"
        title={campaign.title}
        description={`${campaign.partner} / ${campaign.region}`}
        actionHref="/admin/campaigns"
        actionLabel="Donations"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Donation detail summary">
        {[
          { label: "Status", value: labelize(campaign.status) },
          { label: "Funding", value: `${progress}%` },
          { label: "Donors", value: campaign.donorCount.toLocaleString("id-ID") },
          { label: "Impact target", value: campaign.impactTarget.toLocaleString("id-ID") }
        ].map((item) => (
          <article key={item.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
            <MetricValue className="mt-3 capitalize text-ocean-900">{item.value}</MetricValue>
          </article>
        ))}
      </section>

      <FormTabs
        ariaLabel="Donation management workflows"
        tabs={[
          { id: "publishing", label: "Publishing", description: "Status and funding" },
          { id: "details", label: "Details", description: "Content and ownership" },
          { id: "impact-sites", label: "Impact Sites", description: "Linked locations", badge: campaignImpactSites.length.toLocaleString("id-ID") },
          { id: "content", label: "Content", description: "Media, budget, timeline" },
          { id: "danger", label: "Danger", description: "Delete donation" }
        ]}
      >
      <section className={adminPanelClassName}>
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Publishing and funding</h2>
              <AdminStatusBadge value={campaign.status} />
            </div>
            <div className="mt-4 max-w-2xl">
              <ProgressMeter value={progress} label={`${campaign.title} funding progress`} trackClassName="bg-sand-100" />
              <p className="mt-2 min-w-0 break-words text-sm font-bold text-ocean-900 [overflow-wrap:anywhere]">
                {formatCurrency(Number(campaign.raisedAmount), campaign.currency)} / {formatCurrency(Number(campaign.goalAmount), campaign.currency)}
              </p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">
                {campaign.donorCount.toLocaleString("id-ID")} donors / {campaign.impactTarget.toLocaleString("id-ID")} {campaign.impactUnit}
              </p>
            </div>
          </div>
          <form action={updateCampaignStatusAction} className="flex flex-wrap gap-2 lg:justify-end">
            <input type="hidden" name="returnTo" value={returnTo} />
            <input type="hidden" name="campaignId" value={campaign.id} />
            <StatusSelect defaultValue={campaign.status} />
            <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-4">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Status
            </Button>
          </form>
        </div>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Donation details</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Edit content, target numbers, media, and ownership.</p>
          </div>
          <Link href={`/campaigns/${campaign.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
            Public page
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <form action={updateAdminCampaignAction} encType="multipart/form-data" className="grid gap-4 p-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="campaignId" value={campaign.id} />
          <input type="hidden" name="status" value={campaign.status} />
          <Field label="Organization">
            <OrganizationSelect organizations={data.organizations} defaultValue={campaign.organizationId} />
          </Field>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Title">
              <input name="title" defaultValue={campaign.title} className={adminInputClassName} required />
            </Field>
            <Field label="Goal amount">
              <input name="goalAmount" type="number" min={1} step="0.01" defaultValue={Number(campaign.goalAmount)} className={adminInputClassName} required />
            </Field>
          </div>
          <Field label="Summary">
            <textarea name="summary" defaultValue={campaign.summary} className={adminTextareaClassName} required />
          </Field>
          <div className="grid gap-3 lg:grid-cols-2">
            {campaignImpactSites[0] ? (
              <Field label="Linked impact site region">
                <input type="hidden" name="region" value={campaignImpactSites[0].region} />
                <span className="flex min-h-10 items-center rounded-lg border border-ocean-900/10 bg-ocean-50 px-3 text-sm font-bold text-ocean-900">
                  {campaignImpactSites[0].name} / {campaignImpactSites[0].region}
                </span>
              </Field>
            ) : (
              <Field label="Region">
                <input name="region" defaultValue={campaign.region} className={adminInputClassName} required />
              </Field>
            )}
            <Field label="Category">
              <select name="category" defaultValue={campaign.category} className={adminSelectClassName} required>
                {campaign.category && !campaignCategories.includes(campaign.category as (typeof campaignCategories)[number]) ? (
                  <option value={campaign.category}>{campaign.category}</option>
                ) : null}
                {campaignCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <details className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
            <summary className="cursor-pointer text-sm font-bold text-ocean-900">Advanced public details</summary>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <Field label="Custom slug">
                  <input name="slug" defaultValue={campaign.slug} className={adminInputClassName} required />
                </Field>
                <Field label="End date">
                  <input name="endsAt" type="date" defaultValue={dateValue(campaign.endsAt)} className={adminInputClassName} />
                </Field>
              </div>
              <div className="grid gap-3 lg:grid-cols-4">
                <Field label="Currency">
                  <select name="currency" defaultValue={campaign.currency ?? "USD"} className={adminSelectClassName} required>
                    {campaignCurrencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Impact target">
                  <input name="impactTarget" type="number" min={1} defaultValue={campaign.impactTarget} className={adminInputClassName} required />
                </Field>
                <Field label="Impact unit">
                  <select name="impactUnit" defaultValue={campaign.impactUnit} className={adminSelectClassName} required>
                    {campaign.impactUnit && !campaignImpactUnits.includes(campaign.impactUnit as (typeof campaignImpactUnits)[number]) ? (
                      <option value={campaign.impactUnit}>{campaign.impactUnit}</option>
                    ) : null}
                    {campaignImpactUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cost per impact unit">
                  <input name="impactUnitCost" type="number" min={0} step="0.01" defaultValue={campaign.impactUnitCost ? Number(campaign.impactUnitCost) : undefined} placeholder="Auto-calculated if empty" className={adminInputClassName} />
                </Field>
              </div>
              <Field label="Story">
                <textarea name="story" defaultValue={campaign.story ?? ""} className={adminTextareaClassName} />
              </Field>
              <Field label="Replace image">
                <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
              </Field>
              {campaign.imageUrl ? (
                <label className="flex items-center gap-2 text-sm font-bold text-ocean-900">
                  <input name="removeImage" type="checkbox" className="size-4 accent-coral-500" />
                  <ImagePlus className="size-4 text-ocean-900/48" aria-hidden="true" />
                  Remove current image
                </label>
              ) : null}
            </div>
          </details>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Save className="size-4" aria-hidden="true" />
            Save donation
          </Button>
        </form>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Impact sites</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Field locations linked through impact_sites.campaign_id.</p>
          </div>
          <Link href="/admin/campaigns/impact-sites" className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
            Manage sites
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {campaignImpactSites.map((site) => (
            <article key={site.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{site.ecosystemType}</p>
                  <h3 className="mt-2 font-bold text-ocean-900">{site.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.region}</p>
                </div>
                <MapPinned className="size-5 text-kelp-700" aria-hidden="true" />
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 text-sm font-bold text-ocean-900">
                  <span>Progress</span>
                  <span>{site.progress}%</span>
                </div>
                <ProgressMeter value={site.progress} label={`${site.name} progress`} className="mt-2 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-white" />
              </div>
              <p className="mt-3 text-xs font-bold text-ocean-900/52">
                {site.evidenceCount.toLocaleString("id-ID")} evidence records / {site.latestSurvey ?? "Survey date pending"}
              </p>
            </article>
          ))}
          {campaignImpactSites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 md:col-span-2">
              <p className="font-bold text-ocean-900">No impact sites linked.</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">Create or assign a site from impact-site management.</p>
            </div>
          ) : null}
        </div>
      </section>

      <CampaignContentDepthEditor
        campaign={campaign}
        mediaItems={campaignMedia}
        budgetLineItems={campaignBudget}
        timelinePhases={campaignTimeline}
        teamMembers={campaignTeam}
        returnTo={returnTo}
        canManage
      />

      <section className="rounded-lg border border-coral-700/20 bg-white p-4 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Delete donation</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              Projects with donations, sponsorships, corporate portfolio links, or related expeditions are locked.
            </p>
          </div>
          {hasHistory ? <AdminStatusBadge value="archived" /> : null}
        </div>
        <form id={`delete-admin-campaign-${campaign.id}`} action={deleteAdminCampaignAction}>
          <input type="hidden" name="returnTo" value="/admin/campaigns" />
          <input type="hidden" name="campaignId" value={campaign.id} />
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {hasHistory ? (
            <p className="text-xs font-bold text-ocean-900/52">
              Locked by {campaign.donationRecordCount} donations, {campaign.sponsorshipRecordCount} sponsorships, {campaign.corporatePortfolioCount} corporate links, {campaign.relatedExpeditionCount} expeditions.
            </p>
          ) : (
            <AdminConfirmSubmit
              formId={`delete-admin-campaign-${campaign.id}`}
              title={`Delete ${campaign.title}?`}
              body="This permanently removes the project and its remaining unprotected records. This action cannot be undone from the admin portal."
              triggerLabel="Delete Campaign"
              submitLabel="Delete donation"
            />
          )}
        </div>
      </section>
      </FormTabs>
    </div>
  );
}
