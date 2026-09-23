import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  FileCheck2,
  MapPinned,
  Megaphone,
  Pencil,
  Plus,
  Save,
  ShipWheel,
  Trash2,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

import { CampaignImpactTargetFields } from "@/components/campaign-impact-target-fields";
import { PartnerCampaignImpactPlanningFields } from "@/components/partner-campaign-impact-planning-fields";
import { PartnerCampaignImpactSiteSelector } from "@/components/partner-campaign-impact-site-selector";
import { Button } from "@/components/ui/button";
import { MetricValue } from "@/components/ui/metric-value";
import { ProgressMeter } from "@/components/ui/progress-meter";
import {
  campaignBudgetCategories,
  campaignCategories,
  campaignCurrencies,
  impactSiteEcosystemTypes,
  impactSiteVerificationStatuses,
  partnerCampaignStatuses
} from "@/lib/campaign-content";
import {
  createCampaignActivityAction,
  createPartnerImpactSiteAction,
  createPartnerCampaignAction,
  deletePartnerImpactSiteAction,
  updatePartnerImpactSiteAction,
  updatePartnerCampaignAction
} from "@/lib/portal-actions";
import type { getPartnerPortalData } from "@/lib/queries";
import { evidenceSourceHref } from "@/lib/domain";
import { MAX_DATABASE_IMAGE_BYTES } from "@/lib/storage";
import { cn, formatCurrency } from "@/lib/utils";

export type PartnerPortalData = Awaited<ReturnType<typeof getPartnerPortalData>>;
type Campaign = PartnerPortalData["campaigns"][number];
type Organization = PartnerPortalData["organizations"][number];
type CampaignActivity = PartnerPortalData["activities"][number];
type CampaignUpdate = PartnerPortalData["updates"][number];
type CampaignEvidence = PartnerPortalData["evidence"][number];
type CampaignImpactSite = PartnerPortalData["impactSites"][number];
type CampaignSponsorship = PartnerPortalData["sponsoredEcosystems"][number];
type CampaignDonation = PartnerPortalData["donorActivity"][number];
type CampaignMediaItem = PartnerPortalData["campaignMediaItems"][number];
type CampaignBudgetLineItem = PartnerPortalData["campaignBudgetLineItems"][number];
type CampaignTimelinePhase = PartnerPortalData["campaignTimelinePhases"][number];
type OrganizationTeamMember = PartnerPortalData["organizationTeamMembers"][number];

export const inputClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-kelp-500 focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2";
export const textareaClassName =
  "min-h-28 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-kelp-500 focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2";

const badgeClasses: Record<string, string> = {
  archived: "bg-ocean-900/8 text-ocean-900/62",
  basic: "bg-ocean-900/8 text-ocean-900/70",
  cancelled: "bg-coral-100 text-coral-700",
  completed: "bg-kelp-100 text-kelp-700",
  contacted: "bg-ocean-50 text-ocean-700",
  converted: "bg-kelp-100 text-kelp-700",
  declined: "bg-coral-100 text-coral-700",
  document: "bg-ocean-50 text-ocean-700",
  draft: "bg-ocean-900/8 text-ocean-900/62",
  field: "bg-kelp-100 text-kelp-700",
  funded: "bg-kelp-100 text-kelp-700",
  in_review: "bg-sand-100 text-ocean-900",
  needs_clarification: "bg-coral-100 text-coral-700",
  pending: "bg-sand-100 text-ocean-900",
  private_departure: "bg-ocean-50 text-ocean-700",
  published: "bg-ocean-50 text-ocean-700",
  question: "bg-ocean-50 text-ocean-700",
  rejected: "bg-coral-100 text-coral-700",
  review: "bg-sand-100 text-ocean-900",
  resolved: "bg-kelp-100 text-kelp-700",
  submitted: "bg-sand-100 text-ocean-900",
  verified: "bg-kelp-100 text-kelp-700",
  waitlist: "bg-sand-100 text-ocean-900"
};

export function labelize(value: string) {
  return value.replace(/_/g, " ");
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-bold capitalize", badgeClasses[value] ?? badgeClasses.draft)}>
      {labelize(value)}
    </span>
  );
}

function fundingProgress(raisedAmount: string | number, goalAmount: string | number) {
  const raised = Number(raisedAmount);
  const goal = Number(goalAmount);

  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((raised / goal) * 100));
}

function dateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function dateLabel(date: Date | null) {
  return date?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "Date pending";
}

function isImageRecord(value: string | null) {
  if (!value) {
    return false;
  }

  return value.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value);
}

function uploadSizeLabel(bytes: number) {
  const megabytes = bytes / 1_000_000;

  return `${Number.isInteger(megabytes) ? megabytes.toFixed(0) : megabytes.toFixed(1)} MB`;
}

const partnerImageUploadHelp = `PNG, JPG, WebP, or GIF up to ${uploadSizeLabel(MAX_DATABASE_IMAGE_BYTES)}.`;

function statusOptionsForCampaign(campaign?: Campaign) {
  return campaign && !partnerCampaignStatuses.includes(campaign.status as (typeof partnerCampaignStatuses)[number])
    ? [campaign.status, ...partnerCampaignStatuses]
    : partnerCampaignStatuses;
}

function impactSiteEcosystemOptionsForSite(site?: CampaignImpactSite) {
  return site?.type && !impactSiteEcosystemTypes.includes(site.type as (typeof impactSiteEcosystemTypes)[number])
    ? [site.type, ...impactSiteEcosystemTypes]
    : impactSiteEcosystemTypes;
}

function initialsForName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TE";
}

export function imageBackground(imageUrl: string | null) {
  if (!imageUrl) {
    return undefined;
  }

  return {
    backgroundImage: `linear-gradient(180deg, rgba(7,52,63,0.05), rgba(7,52,63,0.36)), url("${imageUrl}")`
  };
}

function RequiredMark() {
  return (
    <span className="font-bold text-coral-700" aria-hidden="true">
      *
    </span>
  );
}

export function Field({
  label,
  children,
  className,
  help,
  required = false
}: {
  label: string;
  children: ReactNode;
  className?: string;
  help?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("grid min-w-0 gap-1.5 text-sm font-bold text-ocean-900", className)}>
      <span className="flex items-center gap-1">
        {label}
        {required ? <RequiredMark /> : null}
      </span>
      {children}
      {help ? <span className="text-xs font-semibold leading-5 text-ocean-900/54">{help}</span> : null}
    </label>
  );
}

export function PartnerPageHeader({
  eyebrow = "Partner portal",
  title,
  description,
  actionHref,
  actionLabel
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <header className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-5 md:flex-row md:items-end">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900 sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/62">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-4 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
        >
          {actionLabel}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </header>
  );
}

export function PartnerMetricCards({ data }: { data: PartnerPortalData }) {
  const totalRaised = data.campaigns.reduce((total, campaign) => total + Number(campaign.raisedAmount), 0);
  const pendingActivityReviews = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const metrics: Array<{ label: string; value: string; detail: string; icon: LucideIcon }> = [
    { label: "Campaigns", value: data.campaigns.length.toLocaleString("id-ID"), detail: `${formatCurrency(totalRaised)} raised`, icon: Megaphone },
    { label: "Expeditions", value: data.expeditions.length.toLocaleString("id-ID"), detail: `${data.expeditions.reduce((total, expedition) => total + expedition.departures.length, 0)} departures`, icon: ShipWheel },
    { label: "Proof pending", value: pendingActivityReviews.toLocaleString("id-ID"), detail: `${data.evidence.length} review records`, icon: FileCheck2 },
    { label: "Project proof", value: data.activities.length.toLocaleString("id-ID"), detail: `${data.updates.length} public notes / ${data.evidence.length} review proofs`, icon: ClipboardList }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-4" aria-label="Partner metrics">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <article key={metric.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ocean-900/58">{metric.label}</p>
                <MetricValue className="mt-3 text-ocean-900">{metric.value}</MetricValue>
              </div>
              <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-ocean-900/62">{metric.detail}</p>
          </article>
        );
      })}
    </section>
  );
}

export function OperationCard({
  href,
  title,
  description,
  icon: Icon
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={href} className="group rounded-lg border border-ocean-900/10 bg-white p-4 transition hover:border-coral-500">
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700 group-hover:bg-coral-100 group-hover:text-coral-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <ArrowUpRight className="size-4 text-ocean-900/40 group-hover:text-coral-700" aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-lg font-bold tracking-normal text-ocean-900">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">{description}</p>
    </Link>
  );
}

export function CampaignFields({
  campaign,
  organizations,
  impactSites = []
}: {
  campaign?: Campaign;
  organizations: Organization[];
  impactSites?: CampaignImpactSite[];
}) {
  const hasOrganizations = organizations.length > 0;
  const singleOrganization = organizations.length === 1;
  const organizationValue = campaign?.organizationId ?? organizations[0]?.id ?? "";
  const selectedOrganization = organizations.find((organization) => organization.id === organizationValue);
  const linkedSite = campaign ? impactSites[0] : null;
  const categoryOptions = campaign?.category && !campaignCategories.includes(campaign.category as (typeof campaignCategories)[number])
    ? [campaign.category, ...campaignCategories]
    : campaignCategories;
  const createMode = !campaign;

  if (createMode) {
    return (
      <>
        {singleOrganization && selectedOrganization ? (
          <Field label="Organization" required>
            <input type="hidden" name="organizationId" value={selectedOrganization.id} />
            <span className="flex min-h-11 items-center rounded-lg border border-ocean-900/10 bg-ocean-50 px-3 text-sm font-bold text-ocean-900">
              {selectedOrganization.name}
            </span>
          </Field>
        ) : (
          <Field label="Organization" required>
            <select name="organizationId" defaultValue={organizationValue} className={inputClassName} disabled={!hasOrganizations} required>
              {hasOrganizations ? (
                organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))
              ) : (
                <option>No active partner access</option>
              )}
            </select>
          </Field>
        )}
        <input type="hidden" name="status" value="draft" />
        <input type="hidden" name="currency" value="USD" />

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Campaign title" required>
            <input name="title" placeholder="Restore Raja Ampat Reefs" className={inputClassName} required />
          </Field>
        </div>
        <Field label="Summary" required>
          <textarea name="summary" placeholder="One or two sentences for the public campaign card." className={textareaClassName} required />
        </Field>

        <details className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4" open>
          <summary className="cursor-pointer text-sm font-bold text-ocean-900">Impact plan and location</summary>
          <div className="mt-4 grid gap-4">
            <PartnerCampaignImpactPlanningFields inputClassName={inputClassName} />
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Campaign end date">
                <input name="endsAt" type="date" className={inputClassName} />
              </Field>
            </div>
            <Field label="Story">
              <textarea name="story" placeholder="Long-form public campaign story." className={textareaClassName} />
            </Field>
            <PartnerCampaignImpactSiteSelector impactSites={impactSites} inputClassName={inputClassName} />
            <Field label="Upload image" help={partnerImageUploadHelp}>
              <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} />
            </Field>
          </div>
        </details>
      </>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {singleOrganization && selectedOrganization ? (
          <Field label="Organization" required>
            <input type="hidden" name="organizationId" value={selectedOrganization.id} />
            <span className="flex min-h-11 items-center rounded-lg border border-ocean-900/10 bg-ocean-50 px-3 text-sm font-bold text-ocean-900">
              {selectedOrganization.name}
            </span>
          </Field>
        ) : (
          <Field label="Organization" required>
          <select name="organizationId" defaultValue={campaign?.organizationId ?? organizations[0]?.id} className={inputClassName} disabled={!hasOrganizations} required>
            {hasOrganizations ? (
              organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))
            ) : (
              <option>No active partner access</option>
            )}
          </select>
          </Field>
        )}
        <Field label="Status">
          <select name="status" defaultValue={campaign?.status ?? "draft"} className={inputClassName}>
            {statusOptionsForCampaign(campaign).map((status) => (
              <option key={status} value={status}>
                {labelize(status)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Campaign title" required>
          <input name="title" defaultValue={campaign?.title} placeholder="Campaign title" className={inputClassName} required />
        </Field>
        <Field label="Funding goal" help="Managed from the Budget Plan after budget lines are added." required>
          <input
            name="goalAmount"
            type="number"
            min="1"
            step="0.01"
            defaultValue={Number(campaign.goalAmount)}
            className={`${inputClassName} bg-ocean-50`}
            readOnly
            required
          />
        </Field>
      </div>

      <Field label="Summary" required>
        <textarea name="summary" defaultValue={campaign.summary} placeholder="Public campaign summary" className={textareaClassName} required />
      </Field>

      <div className="grid gap-3 md:grid-cols-2">
        {linkedSite ? (
          <Field label="Linked impact site region">
            <input type="hidden" name="region" value={linkedSite.region} />
            <span className="flex min-h-11 items-center rounded-lg border border-ocean-900/10 bg-ocean-50 px-3 text-sm font-bold text-ocean-900">
              {linkedSite.name} / {linkedSite.region}
            </span>
          </Field>
        ) : (
          <Field label="Region" required>
            <input name="region" defaultValue={campaign.region} placeholder="Raja Ampat, Southwest Papua" className={inputClassName} required />
          </Field>
        )}
        <Field label="Category" required>
          <select name="category" defaultValue={campaign.category} className={inputClassName} required>
            {categoryOptions.map((category) => (
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
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Currency" required>
              <select name="currency" defaultValue={campaign.currency ?? "USD"} className={inputClassName} required>
                {campaignCurrencies.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Campaign end date">
              <input name="endsAt" type="date" defaultValue={dateValue(campaign.endsAt)} className={inputClassName} />
            </Field>
          </div>
          <CampaignImpactTargetFields lines={campaign.impactTargets} inputClassName={inputClassName} />
          <Field label="Story">
            <textarea name="story" defaultValue={campaign.story ?? ""} placeholder="Campaign story" className={textareaClassName} />
          </Field>

          <Field label="Replace image" help={partnerImageUploadHelp}>
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} />
          </Field>
        </div>
      </details>
    </>
  );
}

export function CampaignCreateForm({
  organizations,
  impactSites,
  canCreateCampaign
}: {
  organizations: Organization[];
  impactSites: CampaignImpactSite[];
  canCreateCampaign: boolean;
}) {
  const hasOrganizations = organizations.length > 0;
  const canSubmit = hasOrganizations && canCreateCampaign;

  return (
    <form action={createPartnerCampaignAction} encType="multipart/form-data" data-testid="partner-create-campaign-form" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <input type="hidden" name="redirectTo" value="/partner/campaigns/new" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create campaign</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">
            {canCreateCampaign
              ? "New campaigns start as partner-managed records for review and publishing."
              : "Your partner role can view campaign records, but cannot create new campaigns."}
          </p>
        </div>
        <Plus className="size-5 text-coral-700" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-4">
        <CampaignFields organizations={organizations} impactSites={impactSites} />
      </div>
      <Button type="submit" className="mt-5" disabled={!canSubmit}>
        <Plus className="size-4" aria-hidden="true" />
        Create Campaign
      </Button>
    </form>
  );
}

function ImpactSiteCampaignSelect({
  campaigns,
  defaultValue,
  disabled
}: {
  campaigns: Campaign[];
  defaultValue?: string | null;
  disabled?: boolean;
}) {
  return (
    <select name="campaignId" defaultValue={defaultValue ?? campaigns[0]?.id} className={inputClassName} disabled={disabled || campaigns.length === 0} required>
      {campaigns.length > 0 ? (
        campaigns.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.title} / {labelize(campaign.status)}
          </option>
        ))
      ) : (
        <option>No campaign access</option>
      )}
    </select>
  );
}

function ImpactSiteVerificationSelect({ defaultValue = "basic", disabled }: { defaultValue?: string | null; disabled?: boolean }) {
  return (
    <select name="verification" defaultValue={defaultValue ?? "basic"} className={inputClassName} disabled={disabled}>
      {impactSiteVerificationStatuses.map((status) => (
        <option key={status} value={status}>
          {labelize(status)}
        </option>
      ))}
    </select>
  );
}

function ImpactSiteFields({
  campaigns,
  site,
  disabled
}: {
  campaigns: Campaign[];
  site?: CampaignImpactSite;
  disabled?: boolean;
}) {
  const ecosystemOptions = impactSiteEcosystemOptionsForSite(site);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Campaign" required>
          <ImpactSiteCampaignSelect campaigns={campaigns} defaultValue={site?.campaignId} disabled={disabled} />
        </Field>
        <Field label="Verification">
          <ImpactSiteVerificationSelect defaultValue={site?.verification} disabled={disabled} />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Site name" required>
          <input name="name" defaultValue={site?.name} placeholder="Raja Ampat Reef Garden" className={inputClassName} disabled={disabled} required />
        </Field>
        <Field label="Ecosystem type" required>
          <select name="ecosystemType" defaultValue={site?.type ?? "Coral"} className={inputClassName} disabled={disabled} required>
            {ecosystemOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Region" required>
          <input name="region" defaultValue={site?.region} placeholder="Southwest Papua" className={inputClassName} disabled={disabled} required />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Latitude" required>
          <input name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={site?.latitude} placeholder="-0.234900" className={inputClassName} disabled={disabled} required />
        </Field>
        <Field label="Longitude" required>
          <input name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={site?.longitude} placeholder="130.516600" className={inputClassName} disabled={disabled} required />
        </Field>
      </div>
      <details className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4" open={Boolean(site)}>
        <summary className="cursor-pointer text-sm font-bold text-ocean-900">Advanced tracking fields</summary>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Field label="Progress">
            <input name="progress" type="number" min="0" max="100" step="1" defaultValue={site?.progress ?? 0} className={inputClassName} disabled={disabled} />
          </Field>
          <Field label="Review records">
            <input name="evidenceCount" type="number" min="0" step="1" defaultValue={site?.evidenceCount ?? 0} className={inputClassName} disabled={disabled} />
          </Field>
          <Field label="Latest survey">
            <input name="latestSurvey" type="date" defaultValue={site?.latestSurvey ?? ""} className={inputClassName} disabled={disabled} />
          </Field>
        </div>
      </details>
    </>
  );
}

export function PartnerImpactSiteManagement({
  campaigns,
  impactSites,
  canManageImpactSites
}: {
  campaigns: Campaign[];
  impactSites: CampaignImpactSite[];
  canManageImpactSites: boolean;
}) {
  const canSubmit = campaigns.length > 0 && canManageImpactSites;

  return (
    <div className="grid gap-6">
      <form action={createPartnerImpactSiteAction} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <input type="hidden" name="redirectTo" value="/partner/impact-sites" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create impact site</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">
              {canManageImpactSites ? "Attach a field location to one of your campaigns." : "Your partner role can view impact sites, but cannot manage them."}
            </p>
          </div>
          <MapPinned className="size-5 text-kelp-700" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-4">
          <ImpactSiteFields campaigns={campaigns} disabled={!canSubmit} />
        </div>
        <Button type="submit" className="mt-5" disabled={!canSubmit}>
          <Plus className="size-4" aria-hidden="true" />
          Create Site
        </Button>
      </form>

      <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Impact sites</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{impactSites.length.toLocaleString("id-ID")} campaign-linked locations</p>
          </div>
          <MapPinned className="size-5 text-coral-700" aria-hidden="true" />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {impactSites.map((site) => (
            <article key={site.id} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-sand-50">
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{site.type}</p>
                    <h3 className="mt-2 text-lg font-bold tracking-normal text-ocean-900">{site.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.campaignTitle} / {site.region}</p>
                  </div>
                  <StatusBadge value={site.verification} />
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-sm font-bold text-ocean-900">
                    <span>Progress</span>
                    <span>{site.progress}%</span>
                  </div>
                  <ProgressMeter value={site.progress} label={`${site.name} progress`} className="mt-2 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-white" />
                </div>
                <div className="mt-4 grid gap-2 text-sm font-bold text-ocean-900/58">
                  <p>{site.evidenceCount.toLocaleString("id-ID")} activity records</p>
                  <p>{site.latestSurvey ? `Latest survey ${site.latestSurvey}` : "Survey date pending"}</p>
                  <p>{site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}</p>
                </div>
              </div>

              {canManageImpactSites ? (
                <details className="border-t border-ocean-900/10 bg-white">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
                    <Pencil className="size-4 text-coral-700" aria-hidden="true" />
                    Edit site
                  </summary>
                  <div className="border-t border-ocean-900/10 p-4">
                    <form action={updatePartnerImpactSiteAction} className="grid gap-4">
                      <input type="hidden" name="redirectTo" value="/partner/impact-sites" />
                      <input type="hidden" name="impactSiteId" value={site.id} />
                      <ImpactSiteFields campaigns={campaigns} site={site} />
                      <Button type="submit" className="w-fit">
                        <Save className="size-4" aria-hidden="true" />
                        Save Site
                      </Button>
                    </form>
                    <form action={deletePartnerImpactSiteAction} className="mt-5 border-t border-ocean-900/10 pt-4">
                      <input type="hidden" name="redirectTo" value="/partner/impact-sites" />
                      <input type="hidden" name="impactSiteId" value={site.id} />
                      <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                        <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" required />
                        Delete this site and detach linked field records from the site.
                      </label>
                      <Button type="submit" className="mt-3 w-fit bg-coral-500 hover:bg-coral-700">
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete Site
                      </Button>
                    </form>
                  </div>
                </details>
              ) : null}
            </article>
          ))}
          {impactSites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ocean-900/14 p-4 lg:col-span-2">
              <p className="font-bold text-ocean-900">No impact sites linked yet.</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/58">Create an impact site after the campaign location is confirmed.</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function EmptyRecord({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-ocean-900/14 p-3 text-sm font-semibold text-ocean-900/54">{children}</p>;
}

export function CampaignList({
  campaigns,
  updates,
  evidence,
  canCreateCampaign
}: {
  campaigns: Campaign[];
  organizations: Organization[];
  updates: CampaignUpdate[];
  evidence: CampaignEvidence[];
  impactSites: CampaignImpactSite[];
  sponsoredEcosystems: CampaignSponsorship[];
  donorActivity: CampaignDonation[];
  campaignMediaItems: CampaignMediaItem[];
  campaignBudgetLineItems: CampaignBudgetLineItem[];
  campaignTimelinePhases: CampaignTimelinePhase[];
  organizationTeamMembers: OrganizationTeamMember[];
  canCreateCampaign: boolean;
  canDeleteCampaign: boolean;
  canUpdateCampaign: boolean;
}) {
  return (
    <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaigns</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">
            Choose a campaign to manage funding, public content, delivery timeline, updates, and evidence in one workspace.
          </p>
        </div>
        {canCreateCampaign ? (
          <Link href="/partner/campaigns/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">
            <Plus className="size-4" aria-hidden="true" />
            New campaign
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-lg bg-ocean-50 px-3 text-sm font-bold text-ocean-700">Read only</span>
        )}
      </div>

      <div className="mt-5 grid gap-4">
        {campaigns.map((campaign) => {
          const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);
          const campaignUpdates = updates.filter((update) => update.campaignId === campaign.id);
          const campaignEvidence = evidence.filter((item) => item.campaignId === campaign.id);
          const verifiedEvidence = campaignEvidence.filter((item) => item.verificationStatus === "verified").length;

          return (
            <article key={campaign.id} className="grid overflow-hidden rounded-lg border border-ocean-900/10 bg-sand-50 md:grid-cols-[220px_1fr]">
              <div className="min-h-44 bg-ocean-900 bg-cover bg-center p-4 text-white md:min-h-full" style={imageBackground(campaign.imageUrl)}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={campaign.status} />
                  <span className="rounded-full bg-white/14 px-2.5 py-1 text-xs font-bold">{campaign.category}</span>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div>
                    <h3 className="text-xl font-bold tracking-normal text-ocean-900">{campaign.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                      {campaign.partner} · {campaign.region}
                    </p>
                  </div>
                  <Link href={`/campaigns/${campaign.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                    Public page
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>

                <div className="mt-4">
                  <ProgressMeter value={progress} label={`${campaign.title} funding progress`} trackClassName="bg-white" />
                  <p className="mt-2 text-sm font-bold text-ocean-900">
                    {formatCurrency(Number(campaign.raisedAmount), campaign.currency)} / {formatCurrency(Number(campaign.goalAmount), campaign.currency)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-ocean-900/52">
                  <span>{campaign.donorCount.toLocaleString("id-ID")} donors</span>
                  <span>{campaignUpdates.length.toLocaleString("id-ID")} updates</span>
                  <span>{verifiedEvidence.toLocaleString("id-ID")} verified evidence</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/partner/campaigns/${campaign.id}`}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ocean-900 px-4 text-sm font-bold text-white hover:bg-ocean-700"
                  >
                    Manage campaign
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}

        {campaigns.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 p-4">
            <p className="font-bold text-ocean-900">No partner campaigns yet.</p>
            <p className="mt-2 text-sm leading-6 text-ocean-900/58">Create a campaign before adding field activity.</p>
            {canCreateCampaign ? (
              <Link href="/partner/campaigns/new" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                Create campaign
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CampaignActivityForm({
  campaigns,
  impactSites,
  canCreateActivity,
  lockedCampaignId,
  redirectTo = "/partner/activity"
}: {
  campaigns: Campaign[];
  impactSites: CampaignImpactSite[];
  canCreateActivity: boolean;
  lockedCampaignId?: string;
  redirectTo?: string;
}) {
  const hasCampaigns = campaigns.length > 0;
  const canSubmit = hasCampaigns && canCreateActivity;
  const lockedCampaign = lockedCampaignId ? campaigns.find((campaign) => campaign.id === lockedCampaignId) : null;
  const visibleImpactSites = lockedCampaignId ? impactSites.filter((site) => site.campaignId === lockedCampaignId) : impactSites;

  return (
    <form action={createCampaignActivityAction} encType="multipart/form-data" data-testid="partner-activity-form" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">{lockedCampaign ? "Add campaign update or proof" : "Add project proof"}</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">
            {canCreateActivity
              ? lockedCampaign
                ? "This activity is automatically attached to the campaign you are managing."
                : "Submit one donation project update with optional proof for admin verification."
              : "Your partner role can review project activity, but cannot submit new proof."}
          </p>
        </div>
        <ClipboardList className="size-5 text-kelp-700" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Campaign" required>
            {lockedCampaign ? (
              <>
                <input type="hidden" name="campaignId" value={lockedCampaign.id} />
                <span className="flex min-h-11 items-center rounded-lg border border-ocean-900/10 bg-ocean-50 px-3 text-sm font-bold text-ocean-900">
                  {lockedCampaign.title}
                </span>
              </>
            ) : (
              <select name="campaignId" className={inputClassName} disabled={!canSubmit} required>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Impact site">
            <select name="impactSiteId" className={inputClassName} disabled={!canSubmit || visibleImpactSites.length === 0}>
              <option value="">No site selected</option>
              {visibleImpactSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}{lockedCampaign ? "" : ` / ${site.campaignTitle}`}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Update / proof title" required>
          <input name="title" placeholder="Field progress, monitoring report, or milestone update" className={inputClassName} disabled={!canSubmit} required />
        </Field>
        <Field label="Update note" required>
          <textarea name="body" placeholder="Explain what changed and, when evidence is attached, what it verifies." className={textareaClassName} disabled={!canSubmit} required />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Attachment type">
            <select name="evidenceType" defaultValue="field_photo" className={inputClassName} disabled={!canSubmit}>
              <option value="field_photo">Field photo</option>
              <option value="document">Document</option>
              <option value="field_report">Field report</option>
            </select>
          </Field>
          <Field label="Upload evidence" help={`${partnerImageUploadHelp} Optional; an uploaded file enters project verification review.`}>
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} disabled={!canSubmit} />
          </Field>
        </div>

        <div className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
          <p className="text-sm font-bold text-ocean-900">Evidence-backed expense <span className="font-semibold text-ocean-900/48">(optional)</span></p>
          <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">
            Use this only when the uploaded evidence proves a campaign expense. It counts as actual spend after admin verification.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field label="Budget category">
              <select name="financeCategory" defaultValue="" className={inputClassName} disabled={!canSubmit}>
                <option value="">No expense attached</option>
                {campaignBudgetCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Field label="Expense amount">
              <input name="financeSpendAmount" type="number" min="0" step="0.01" placeholder="0.00" className={inputClassName} disabled={!canSubmit} />
            </Field>
            <Field label="Currency">
              <select name="financeSpendCurrency" defaultValue={lockedCampaign?.currency ?? "USD"} className={inputClassName} disabled={!canSubmit}>
                {campaignCurrencies.map((currency) => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </div>
      <Button type="submit" className="mt-5" disabled={!canSubmit}>
        <ClipboardList className="size-4" aria-hidden="true" />
        Save update
      </Button>
    </form>
  );
}

export function CampaignActivityList({ activities }: { activities: CampaignActivity[] }) {
  return (
    <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold tracking-normal text-ocean-900">Project proof timeline</h2>
      <div className="mt-5 grid gap-3">
        {activities.map((item) => {
          const updateHref = item.sourceUpdateId ? `/campaigns/${item.campaignSlug}/updates/${item.sourceUpdateId}` : null;
          const evidenceHref = item.evidenceCode ? evidenceSourceHref(item.campaignSlug, item.evidenceCode) ?? item.evidenceFileUrl : item.evidenceFileUrl;
          const status = item.verificationStatus ?? item.visibilityStatus;
          const date = item.publishedAt ?? item.createdAt;

          return (
            <article key={item.id} className="grid gap-3 rounded-lg bg-sand-50 p-4 sm:grid-cols-[96px_1fr]">
              <div className="min-h-20 rounded-lg bg-ocean-900/10 bg-cover bg-center" style={imageBackground(isImageRecord(item.mediaUrl) ? item.mediaUrl : null)} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-ocean-900">{item.title}</p>
                  <StatusBadge value={status} />
                  <span className="inline-flex min-h-7 items-center rounded-full bg-white px-2.5 text-xs font-bold capitalize text-ocean-900/62">
                    {labelize(item.activityType)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.campaignTitle}</p>
                {item.body ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-ocean-900/68">{item.body}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-ocean-900/48">
                  <span>{item.activityCode} / {date.toLocaleDateString("id-ID", { dateStyle: "medium" })}</span>
                  {item.evidenceCode ? <span>{item.evidenceCode}</span> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {updateHref ? (
                    <Link href={updateHref} className="inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
                      Public note
                    </Link>
                  ) : null}
                  {evidenceHref ? (
                    <Link href={evidenceHref} className="inline-flex text-sm font-bold text-ocean-900/62 hover:text-coral-500">
                      Review source
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
        {activities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 p-4">
            <p className="font-bold text-ocean-900">No project proof yet.</p>
            <p className="mt-2 text-sm leading-6 text-ocean-900/58">Submit proof when field teams have progress, reports, or photos to verify.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
