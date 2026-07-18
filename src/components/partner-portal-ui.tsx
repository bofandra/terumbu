import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Camera,
  ClipboardList,
  FileCheck2,
  Globe2,
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

import { CampaignContentDepthEditor } from "@/components/campaign-content-depth-editor";
import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import {
  createCampaignActivityAction,
  createPartnerImpactSiteAction,
  createPartnerCampaignAction,
  deletePartnerImpactSiteAction,
  deletePartnerCampaignAction,
  updatePartnerImpactSiteAction,
  updatePartnerCampaignAction
} from "@/lib/portal-actions";
import type { getPartnerPortalData } from "@/lib/queries";
import { evidenceSourceHref } from "@/lib/domain";
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

const partnerCampaignStatuses = ["draft", "review"];

export const inputClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500";
export const textareaClassName =
  "min-h-28 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500";

const badgeClasses: Record<string, string> = {
  archived: "bg-ocean-900/8 text-ocean-900/62",
  basic: "bg-ocean-900/8 text-ocean-900/70",
  completed: "bg-kelp-100 text-kelp-700",
  document: "bg-ocean-50 text-ocean-700",
  draft: "bg-ocean-900/8 text-ocean-900/62",
  field: "bg-kelp-100 text-kelp-700",
  funded: "bg-kelp-100 text-kelp-700",
  in_review: "bg-sand-100 text-ocean-900",
  needs_clarification: "bg-coral-100 text-coral-700",
  published: "bg-ocean-50 text-ocean-700",
  rejected: "bg-coral-100 text-coral-700",
  review: "bg-sand-100 text-ocean-900",
  submitted: "bg-sand-100 text-ocean-900",
  verified: "bg-kelp-100 text-kelp-700"
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

function statusOptionsForCampaign(campaign?: Campaign) {
  return campaign && !partnerCampaignStatuses.includes(campaign.status) ? [campaign.status, ...partnerCampaignStatuses] : partnerCampaignStatuses;
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

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("grid min-w-0 gap-1.5 text-sm font-bold text-ocean-900", className)}>
      <span>{label}</span>
      {children}
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
  const pendingEvidence = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const metrics: Array<{ label: string; value: string; detail: string; icon: LucideIcon }> = [
    { label: "Campaigns", value: data.campaigns.length.toLocaleString("id-ID"), detail: `${formatCurrency(totalRaised)} raised`, icon: Megaphone },
    { label: "Expeditions", value: data.expeditions.length.toLocaleString("id-ID"), detail: `${data.expeditions.reduce((total, expedition) => total + expedition.departures.length, 0)} departures`, icon: ShipWheel },
    { label: "Evidence pending", value: pendingEvidence.toLocaleString("id-ID"), detail: `${data.evidence.length} evidence records`, icon: FileCheck2 },
    { label: "Activity", value: data.activities.length.toLocaleString("id-ID"), detail: `${data.updates.length} public / ${data.evidence.length} evidence`, icon: ClipboardList }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-4" aria-label="Partner metrics">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ocean-900/58">{metric.label}</p>
                <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
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

export function CampaignFields({ campaign, organizations }: { campaign?: Campaign; organizations: Organization[] }) {
  const hasOrganizations = organizations.length > 0;

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Organization">
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
        <Field label="Campaign title">
          <input name="title" defaultValue={campaign?.title} placeholder="Campaign title" className={inputClassName} required />
        </Field>
        <Field label="Category">
          <input name="category" defaultValue={campaign?.category} placeholder="Coral Restoration" className={inputClassName} required />
        </Field>
      </div>

      <Field label="Region">
        <input name="region" defaultValue={campaign?.region} placeholder="Raja Ampat, Southwest Papua" className={inputClassName} required />
      </Field>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Goal amount">
          <input name="goalAmount" type="number" min="1000" step="1000" defaultValue={campaign ? Math.round(Number(campaign.goalAmount)) : undefined} className={inputClassName} required />
        </Field>
        <Field label="Impact target">
          <input name="impactTarget" type="number" min="1" step="1" defaultValue={campaign?.impactTarget} className={inputClassName} required />
        </Field>
        <Field label="Impact unit">
          <input name="impactUnit" defaultValue={campaign?.impactUnit} placeholder="coral fragments" className={inputClassName} required />
        </Field>
      </div>

      <Field label="Campaign end date">
        <input name="endsAt" type="date" defaultValue={campaign ? dateValue(campaign.endsAt) : undefined} className={inputClassName} />
      </Field>

      <Field label="Summary">
        <textarea name="summary" defaultValue={campaign?.summary} placeholder="Public campaign summary" className={textareaClassName} required />
      </Field>

      <Field label="Story">
        <textarea name="story" defaultValue={campaign?.story ?? ""} placeholder="Campaign story" className={textareaClassName} />
      </Field>

      <Field label={campaign ? "Replace image" : "Upload image"}>
        <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} />
      </Field>
    </>
  );
}

export function CampaignCreateForm({ organizations, canCreateCampaign }: { organizations: Organization[]; canCreateCampaign: boolean }) {
  const hasOrganizations = organizations.length > 0;
  const canSubmit = hasOrganizations && canCreateCampaign;

  return (
    <form action={createPartnerCampaignAction} data-testid="partner-create-campaign-form" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
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
        <CampaignFields organizations={organizations} />
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
      {["basic", "document", "field"].map((status) => (
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
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Campaign">
          <ImpactSiteCampaignSelect campaigns={campaigns} defaultValue={site?.campaignId} disabled={disabled} />
        </Field>
        <Field label="Verification">
          <ImpactSiteVerificationSelect defaultValue={site?.verification} disabled={disabled} />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Site name">
          <input name="name" defaultValue={site?.name} placeholder="Raja Ampat Reef Garden" className={inputClassName} disabled={disabled} required />
        </Field>
        <Field label="Ecosystem type">
          <input name="ecosystemType" defaultValue={site?.type} placeholder="Coral" className={inputClassName} disabled={disabled} required />
        </Field>
        <Field label="Region">
          <input name="region" defaultValue={site?.region} placeholder="Southwest Papua" className={inputClassName} disabled={disabled} required />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Field label="Latitude">
          <input name="latitude" type="number" min="-90" max="90" step="0.000001" defaultValue={site?.latitude} placeholder="-0.234900" className={inputClassName} disabled={disabled} required />
        </Field>
        <Field label="Longitude">
          <input name="longitude" type="number" min="-180" max="180" step="0.000001" defaultValue={site?.longitude} placeholder="130.516600" className={inputClassName} disabled={disabled} required />
        </Field>
        <Field label="Progress">
          <input name="progress" type="number" min="0" max="100" step="1" defaultValue={site?.progress ?? 0} className={inputClassName} disabled={disabled} />
        </Field>
        <Field label="Evidence records">
          <input name="evidenceCount" type="number" min="0" step="1" defaultValue={site?.evidenceCount ?? 0} className={inputClassName} disabled={disabled} />
        </Field>
        <Field label="Latest survey">
          <input name="latestSurvey" type="date" defaultValue={site?.latestSurvey ?? ""} className={inputClassName} disabled={disabled} />
        </Field>
      </div>
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
                  <p>{site.evidenceCount.toLocaleString("id-ID")} evidence records</p>
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

function CampaignPublicDataPanel({
  campaign,
  updates,
  evidence,
  impactSites,
  sponsoredEcosystems,
  donorActivity
}: {
  campaign: Campaign;
  updates: CampaignUpdate[];
  evidence: CampaignEvidence[];
  impactSites: CampaignImpactSite[];
  sponsoredEcosystems: CampaignSponsorship[];
  donorActivity: CampaignDonation[];
}) {
  const mediaRecords = [
    campaign.imageUrl
      ? {
          key: `${campaign.id}-hero`,
          label: "Campaign hero",
          detail: campaign.title,
          imageUrl: campaign.imageUrl
        }
      : null,
    ...updates
      .filter((update) => isImageRecord(update.imageUrl))
      .map((update) => ({
        key: update.id,
        label: "Update image",
        detail: update.title,
        imageUrl: update.imageUrl
      })),
    ...evidence
      .filter((item) => isImageRecord(item.fileUrl))
      .map((item) => ({
        key: item.evidenceCode,
        label: "Evidence image",
        detail: item.title,
        imageUrl: item.fileUrl
      }))
  ].filter((item): item is { key: string; label: string; detail: string; imageUrl: string } => Boolean(item));

  const verifiedEvidence = evidence.filter((item) => item.verificationStatus === "verified").length;

  return (
    <details className="mt-3 rounded-lg border border-ocean-900/10 bg-white">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-ocean-900">
        <BadgeCheck className="size-4" aria-hidden="true" />
        Public page data
      </summary>
      <div className="grid gap-5 border-t border-ocean-900/10 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Campaign copy</h4>
            <dl className="mt-3 grid gap-2 text-sm">
              <div>
                <dt className="font-bold text-ocean-900">Summary</dt>
                <dd className="mt-1 leading-6 text-ocean-900/64">{campaign.summary}</dd>
              </div>
              <div>
                <dt className="font-bold text-ocean-900">Story</dt>
                <dd className="mt-1 leading-6 text-ocean-900/64">{campaign.story || "Story content will appear after the campaign narrative is completed."}</dd>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="font-bold text-ocean-900">Category</dt>
                  <dd className="mt-1 text-ocean-900/64">{campaign.category}</dd>
                </div>
                <div>
                  <dt className="font-bold text-ocean-900">Region</dt>
                  <dd className="mt-1 text-ocean-900/64">{campaign.region}</dd>
                </div>
              </div>
            </dl>
          </section>

          <section>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Partner profile</h4>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-sand-50 bg-cover bg-center text-sm font-black text-ocean-900 ring-1 ring-ocean-900/10" style={imageBackground(campaign.partnerLogoUrl)}>
                {campaign.partnerLogoUrl ? null : initialsForName(campaign.partner)}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-ocean-900">{campaign.partner}</p>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                  {labelize(campaign.partnerType)} / {campaign.verificationLabel}
                </p>
                {campaign.partnerWebsiteUrl ? (
                  <Link href={campaign.partnerWebsiteUrl} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-coral-700 hover:text-coral-500">
                    <Globe2 className="size-4" aria-hidden="true" />
                    Website
                  </Link>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-ocean-900/64">{campaign.partnerDescription || "Partner details will appear after the organization profile is completed."}</p>
          </section>
        </div>

        <section>
          <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Public media</h4>
          {mediaRecords.length > 0 ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {mediaRecords.map((item) => (
                <figure key={item.key} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-sand-50">
                  <div className="min-h-32 bg-ocean-900/10 bg-cover bg-center" style={imageBackground(item.imageUrl)} />
                  <figcaption className="p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">{item.label}</p>
                    <p className="mt-1 text-sm font-bold text-ocean-900">{item.detail}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <EmptyRecord>No campaign, update, or evidence images attached yet.</EmptyRecord>
            </div>
          )}
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Impact sites</h4>
            <div className="mt-3 grid gap-2">
              {impactSites.length > 0 ? (
                impactSites.map((site) => (
                  <div key={`${site.name}-${site.latitude}-${site.longitude}`} className="rounded-lg bg-sand-50 p-3 text-sm">
                    <p className="font-bold text-ocean-900">{site.name}</p>
                    <p className="mt-1 text-ocean-900/62">
                      {site.type} / {site.region}
                    </p>
                    <p className="mt-2 text-xs font-bold text-ocean-900/50">
                      {site.progress}% progress / {site.evidenceCount} evidence records / {site.latestSurvey || "Survey date pending"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyRecord>No impact sites linked to this campaign.</EmptyRecord>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Activity</h4>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="rounded-lg bg-sand-50 p-3">
                <p className="font-bold text-ocean-900">{updates.length.toLocaleString("id-ID")} public updates</p>
                <p className="mt-1 text-ocean-900/62">{updates[0] ? `Latest: ${updates[0].title} / ${dateLabel(updates[0].publishedAt)}` : "Updates will appear after publication."}</p>
              </div>
              <div className="rounded-lg bg-sand-50 p-3">
                <p className="font-bold text-ocean-900">
                  {evidence.length.toLocaleString("id-ID")} evidence records / {verifiedEvidence.toLocaleString("id-ID")} verified
                </p>
                <p className="mt-1 text-ocean-900/62">{evidence[0] ? `Latest: ${evidence[0].title} / ${dateLabel(evidence[0].createdAt)}` : "Evidence will appear after field submission."}</p>
              </div>
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Donor activity</h4>
            <div className="mt-3 grid gap-2">
              {donorActivity.length > 0 ? (
                donorActivity.slice(0, 4).map((donation) => (
                  <div key={`${donation.createdAt.toISOString()}-${donation.amount}`} className="rounded-lg bg-sand-50 p-3 text-sm">
                    <p className="font-bold text-ocean-900">{donation.donorName || "Anonymous supporter"} / {formatCurrency(donation.amount)}</p>
                    <p className="mt-1 text-ocean-900/62">{dateLabel(donation.createdAt)}{donation.message ? ` / ${donation.message}` : ""}</p>
                  </div>
                ))
              ) : (
                <EmptyRecord>Paid donor activity will appear after checkout confirmations.</EmptyRecord>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Sponsorship records</h4>
            <div className="mt-3 grid gap-2">
              {sponsoredEcosystems.length > 0 ? (
                sponsoredEcosystems.slice(0, 4).map((item) => (
                  <div key={item.code} className="rounded-lg bg-sand-50 p-3 text-sm">
                    <p className="font-bold text-ocean-900">{item.code} / {item.label}</p>
                    <p className="mt-1 text-ocean-900/62">
                      {item.status} / {item.fragments.toLocaleString("id-ID")} fragments / {item.siteName || item.region || "Site pending"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyRecord>No sponsorship records linked to this campaign.</EmptyRecord>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href={`/campaigns/${campaign.slug}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ocean-900 px-3 text-sm font-bold text-white hover:bg-ocean-700">
            <ArrowUpRight className="size-4" aria-hidden="true" />
            View public page
          </Link>
          <Link href="/partner/activity" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">
            <Camera className="size-4" aria-hidden="true" />
            Add activity
          </Link>
        </div>
      </div>
    </details>
  );
}

export function CampaignList({
  campaigns,
  organizations,
  updates,
  evidence,
  impactSites,
  sponsoredEcosystems,
  donorActivity,
  campaignMediaItems,
  campaignBudgetLineItems,
  campaignTimelinePhases,
  organizationTeamMembers,
  canCreateCampaign,
  canDeleteCampaign,
  canUpdateCampaign
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
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Edit campaign records and images.</p>
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
          const campaignImpactSites = impactSites.filter((site) => site.campaignId === campaign.id);
          const campaignSponsorships = sponsoredEcosystems.filter((item) => item.campaignId === campaign.id);
          const campaignDonations = donorActivity.filter((donation) => donation.campaignId === campaign.id);
          const campaignMedia = campaignMediaItems.filter((item) => item.campaignId === campaign.id);
          const campaignBudget = campaignBudgetLineItems.filter((item) => item.campaignId === campaign.id);
          const campaignTimeline = campaignTimelinePhases.filter((item) => item.campaignId === campaign.id);
          const campaignTeam = organizationTeamMembers.filter((item) => item.organizationId === campaign.organizationId);

          return (
            <article key={campaign.id} className="overflow-hidden rounded-lg border border-ocean-900/10 bg-sand-50">
              <div className="min-h-44 bg-ocean-900 bg-cover bg-center p-4 text-white" style={imageBackground(campaign.imageUrl)}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={campaign.status} />
                  <span className="rounded-full bg-white/14 px-2.5 py-1 text-xs font-bold">{campaign.category}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <h3 className="text-lg font-bold tracking-normal text-ocean-900">{campaign.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                      {campaign.partner} / {campaign.region}
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
                    {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/58">{campaign.donorCount.toLocaleString("id-ID")} donors</p>
                </div>

                {canUpdateCampaign ? (
                  <details className="mt-4 rounded-lg border border-ocean-900/10 bg-white">
                    <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-ocean-900">
                      <Pencil className="size-4" aria-hidden="true" />
                      Edit campaign
                    </summary>
                    <form action={updatePartnerCampaignAction} className="grid gap-4 border-t border-ocean-900/10 p-4">
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <input type="hidden" name="redirectTo" value="/partner/campaigns" />
                      <CampaignFields campaign={campaign} organizations={organizations} />
                      <label className="flex items-center gap-2 text-sm font-bold text-ocean-900">
                        <input name="removeImage" type="checkbox" className="size-4 accent-coral-500" />
                        Remove current image
                      </label>
                      <Button type="submit" tone="secondary" className="w-fit">
                        <Save className="size-4" aria-hidden="true" />
                        Save Campaign
                      </Button>
                    </form>
                  </details>
                ) : null}

                <CampaignPublicDataPanel
                  campaign={campaign}
                  updates={campaignUpdates}
                  evidence={campaignEvidence}
                  impactSites={campaignImpactSites}
                  sponsoredEcosystems={campaignSponsorships}
                  donorActivity={campaignDonations}
                />

                <div className="mt-4">
                  <CampaignContentDepthEditor
                    campaign={campaign}
                    mediaItems={campaignMedia}
                    budgetLineItems={campaignBudget}
                    timelinePhases={campaignTimeline}
                    teamMembers={campaignTeam}
                    returnTo="/partner/campaigns"
                    canManage={canUpdateCampaign}
                  />
                </div>

                {canDeleteCampaign ? (
                  <details className="mt-3 rounded-lg border border-coral-700/20 bg-white">
                    <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-coral-700">
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete campaign
                    </summary>
                    <form action={deletePartnerCampaignAction} className="grid gap-3 border-t border-coral-700/20 p-4">
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <input type="hidden" name="redirectTo" value="/partner/campaigns" />
                      <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                        <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" required />
                        Delete this campaign only if it has no donations, sponsorships, corporate portfolio links, or related expeditions.
                      </label>
                      <Button type="submit" className="w-fit bg-coral-500 hover:bg-coral-700">
                        <Trash2 className="size-4" aria-hidden="true" />
                        Delete Campaign
                      </Button>
                    </form>
                  </details>
                ) : null}
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
  canCreateActivity
}: {
  campaigns: Campaign[];
  impactSites: CampaignImpactSite[];
  canCreateActivity: boolean;
}) {
  const hasCampaigns = campaigns.length > 0;
  const canSubmit = hasCampaigns && canCreateActivity;

  return (
    <form action={createCampaignActivityAction} data-testid="partner-activity-form" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <input type="hidden" name="redirectTo" value="/partner/activity" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Add activity</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">
            {canCreateActivity
              ? "Create one campaign activity for public progress, verification evidence, or both."
              : "Your partner role can review activity, but cannot submit new field activity."}
          </p>
        </div>
        <ClipboardList className="size-5 text-kelp-700" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Campaign">
            <select name="campaignId" className={inputClassName} disabled={!canSubmit} required>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Impact site">
            <select name="impactSiteId" className={inputClassName} disabled={!canSubmit || impactSites.length === 0}>
              <option value="">No site selected</option>
              {impactSites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name} / {site.campaignTitle}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Activity use">
            <select name="activityUse" defaultValue="public_update" className={inputClassName} disabled={!canSubmit}>
              <option value="public_update">Public update</option>
              <option value="evidence">Evidence only</option>
              <option value="update_and_evidence">Public update + evidence</option>
            </select>
          </Field>
        </div>
        <Field label="Activity title">
          <input name="title" placeholder="Activity title" className={inputClassName} disabled={!canSubmit} required />
        </Field>
        <Field label="Field note">
          <textarea name="body" placeholder="Progress note or reviewer context" className={textareaClassName} disabled={!canSubmit} required />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Evidence type">
            <select name="evidenceType" defaultValue="field_photo" className={inputClassName} disabled={!canSubmit}>
              <option value="field_photo">Field photo</option>
              <option value="document">Document</option>
              <option value="field_report">Field report</option>
            </select>
          </Field>
          <Field label="Upload attachment">
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} disabled={!canSubmit} />
          </Field>
        </div>
      </div>
      <Button type="submit" className="mt-5" disabled={!canSubmit}>
        <ClipboardList className="size-4" aria-hidden="true" />
        Save Activity
      </Button>
    </form>
  );
}

export function CampaignActivityList({ activities }: { activities: CampaignActivity[] }) {
  return (
    <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold tracking-normal text-ocean-900">Activity timeline</h2>
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
                      Public update
                    </Link>
                  ) : null}
                  {evidenceHref ? (
                    <Link href={evidenceHref} className="inline-flex text-sm font-bold text-ocean-900/62 hover:text-coral-500">
                      Evidence source
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
        {activities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ocean-900/14 p-4">
            <p className="font-bold text-ocean-900">No activity yet.</p>
            <p className="mt-2 text-sm leading-6 text-ocean-900/58">Add campaign activity when field teams have progress or proof to record.</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
