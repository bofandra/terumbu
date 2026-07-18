import Link from "next/link";
import { ArrowUpRight, ImagePlus, MapPinned, Save, ShieldCheck, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { CampaignContentDepthEditor } from "@/components/campaign-content-depth-editor";
import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireRole } from "@/lib/auth";
import { deleteAdminCampaignAction, updateAdminCampaignAction, updateCampaignStatusAction } from "@/lib/portal-actions";
import { getAdminOperationsData, getAdminPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Manage Admin Campaign"
};

export const dynamic = "force-dynamic";

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"];

const statusMessages: Record<string, string> = {
  "campaign-updated": "Campaign updated.",
  "campaign-content-deleted": "Campaign content deleted.",
  "campaign-content-saved": "Campaign content saved.",
  status: "Campaign status updated."
};

const errorMessages: Record<string, string> = {
  campaign: "Choose a campaign and valid status.",
  "campaign-content-delete": "Confirm content deletion by checking the delete box.",
  "campaign-content-invalid": "Enter the required content fields before saving.",
  "campaign-content-missing": "Campaign content record was not found.",
  "campaign-delete": "Confirm campaign deletion by checking the delete box.",
  "campaign-has-history": "Campaigns with donations, sponsorships, corporate portfolio links, or related expeditions cannot be deleted.",
  "campaign-invalid": "Enter campaign title, slug, organization, goal, impact target, summary, category, and region.",
  "campaign-missing": "Campaign record was not found.",
  "campaign-slug": "That campaign slug is already in use.",
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
  organizations: Awaited<ReturnType<typeof getAdminPortalData>>["organizations"];
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
  const [data, operations] = await Promise.all([getAdminPortalData(), getAdminOperationsData()]);
  const campaign = data.campaigns.find((item) => item.id === campaignId);

  if (!campaign) {
    notFound();
  }

  const returnTo = `/admin/campaigns/${campaign.id}`;
  const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);
  const hasHistory =
    campaign.donationRecordCount > 0 ||
    campaign.sponsorshipRecordCount > 0 ||
    campaign.corporatePortfolioCount > 0 ||
    campaign.relatedExpeditionCount > 0;
  const savedMessage = query?.saved ? statusMessages[query.saved] : null;
  const errorMessage = query?.error ? errorMessages[query.error] : null;
  const campaignMedia = data.campaignMediaItems.filter((item) => item.campaignId === campaign.id);
  const campaignBudget = data.campaignBudgetLineItems.filter((item) => item.campaignId === campaign.id);
  const campaignTimeline = data.campaignTimelinePhases.filter((item) => item.campaignId === campaign.id);
  const campaignTeam = data.organizationTeamMembers.filter((item) => item.organizationId === campaign.organizationId);
  const campaignImpactSites = operations.impactSites.filter((site) => site.campaignId === campaign.id);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns"
        title={campaign.title}
        description={`${campaign.partner} / ${campaign.region}`}
        actionHref="/admin/campaigns"
        actionLabel="Campaign list"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Campaign detail summary">
        {[
          { label: "Status", value: labelize(campaign.status) },
          { label: "Funding", value: `${progress}%` },
          { label: "Donors", value: campaign.donorCount.toLocaleString("id-ID") },
          { label: "Impact target", value: campaign.impactTarget.toLocaleString("id-ID") }
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
            <p className="mt-3 text-2xl font-bold capitalize tracking-normal text-ocean-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className={adminPanelClassName}>
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">Publishing and funding</h2>
              <AdminStatusBadge value={campaign.status} />
            </div>
            <div className="mt-4 max-w-2xl">
              <ProgressMeter value={progress} label={`${campaign.title} funding progress`} trackClassName="bg-sand-100" />
              <p className="mt-2 text-sm font-bold text-ocean-900">
                {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
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
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaign details</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Edit content, target numbers, media, and ownership.</p>
          </div>
          <Link href={`/campaigns/${campaign.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
            Public page
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <form action={updateAdminCampaignAction} className="grid gap-4 p-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="campaignId" value={campaign.id} />
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Organization" className="lg:col-span-2">
              <OrganizationSelect organizations={data.organizations} defaultValue={campaign.organizationId} />
            </Field>
            <Field label="Status">
              <StatusSelect defaultValue={campaign.status} />
            </Field>
            <Field label="End date">
              <input name="endsAt" type="date" defaultValue={dateValue(campaign.endsAt)} className={adminInputClassName} />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Title" className="lg:col-span-2">
              <input name="title" defaultValue={campaign.title} className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" defaultValue={campaign.slug} className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Category">
              <input name="category" defaultValue={campaign.category} className={adminInputClassName} required />
            </Field>
            <Field label="Region">
              <input name="region" defaultValue={campaign.region} className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Goal amount">
              <input name="goalAmount" type="number" min={1000} step={1000} defaultValue={Math.round(Number(campaign.goalAmount))} className={adminInputClassName} required />
            </Field>
            <Field label="Impact target">
              <input name="impactTarget" type="number" min={1} defaultValue={campaign.impactTarget} className={adminInputClassName} required />
            </Field>
            <Field label="Impact unit">
              <input name="impactUnit" defaultValue={campaign.impactUnit} className={adminInputClassName} required />
            </Field>
          </div>
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
          <Field label="Summary">
            <textarea name="summary" defaultValue={campaign.summary} className={adminTextareaClassName} required />
          </Field>
          <Field label="Story">
            <textarea name="story" defaultValue={campaign.story ?? ""} className={adminTextareaClassName} />
          </Field>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Save className="size-4" aria-hidden="true" />
            Save Campaign
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
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Delete campaign</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              Campaigns with donations, sponsorships, corporate portfolio links, or related expeditions are locked.
            </p>
          </div>
          {hasHistory ? <AdminStatusBadge value="archived" /> : null}
        </div>
        <form action={deleteAdminCampaignAction} className="mt-4">
          <input type="hidden" name="returnTo" value="/admin/campaigns" />
          <input type="hidden" name="campaignId" value={campaign.id} />
          <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
            <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" disabled={hasHistory} required />
            Delete this campaign.
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="submit" className="w-fit rounded-lg bg-coral-500 hover:bg-coral-700 disabled:cursor-not-allowed disabled:opacity-45" disabled={hasHistory}>
              <Trash2 className="size-4" aria-hidden="true" />
              Delete Campaign
            </Button>
            {hasHistory ? (
              <p className="text-xs font-bold text-ocean-900/52">
                Locked by {campaign.donationRecordCount} donations, {campaign.sponsorshipRecordCount} sponsorships, {campaign.corporatePortfolioCount} corporate links, {campaign.relatedExpeditionCount} expeditions.
              </p>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
