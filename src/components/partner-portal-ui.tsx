import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Camera,
  FileCheck2,
  Globe2,
  ImagePlus,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  UploadCloud,
  type LucideIcon
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  createCampaignUpdateAction,
  createPartnerCampaignAction,
  deletePartnerCampaignAction,
  submitEvidenceAction,
  updatePartnerCampaignAction
} from "@/lib/portal-actions";
import type { getPartnerPortalData } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export type PartnerPortalData = Awaited<ReturnType<typeof getPartnerPortalData>>;
type Campaign = PartnerPortalData["campaigns"][number];
type Organization = PartnerPortalData["organizations"][number];
type CampaignUpdate = PartnerPortalData["updates"][number];
type CampaignEvidence = PartnerPortalData["evidence"][number];
type CampaignImpactSite = PartnerPortalData["impactSites"][number];
type CampaignSponsorship = PartnerPortalData["sponsoredEcosystems"][number];
type CampaignDonation = PartnerPortalData["donorActivity"][number];

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"];

export const inputClassName =
  "min-h-11 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500";
export const textareaClassName =
  "min-h-28 w-full min-w-0 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/36 focus:border-coral-500";

const badgeClasses: Record<string, string> = {
  archived: "bg-ocean-900/8 text-ocean-900/62",
  completed: "bg-kelp-100 text-kelp-700",
  draft: "bg-ocean-900/8 text-ocean-900/62",
  funded: "bg-kelp-100 text-kelp-700",
  in_review: "bg-sand-100 text-ocean-900",
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
  return date?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "No date recorded";
}

function isImageRecord(value: string | null) {
  if (!value) {
    return false;
  }

  return value.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value);
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
    <header className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 md:flex-row md:items-end">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900 sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/62 sm:text-base">{description}</p>
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
    { label: "Evidence pending", value: pendingEvidence.toLocaleString("id-ID"), detail: `${data.evidence.length} evidence records`, icon: FileCheck2 },
    { label: "Recent updates", value: data.updates.length.toLocaleString("id-ID"), detail: "Published field notes", icon: ReceiptText }
  ];

  return (
    <section className="grid gap-3 md:grid-cols-3" aria-label="Partner metrics">
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
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
    <Link href={href} className="group rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-coral-500">
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
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Organization">
          <select name="organizationId" defaultValue={campaign?.organizationId ?? organizations[0]?.id} className={inputClassName} required>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={campaign?.status ?? "draft"} className={inputClassName}>
            {campaignStatuses.map((status) => (
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

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Upload image">
          <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} />
        </Field>
        <Field label="Image URL">
          <input name="imageUrl" placeholder="https://..." className={inputClassName} />
        </Field>
      </div>
    </>
  );
}

export function CampaignCreateForm({ organizations }: { organizations: Organization[] }) {
  return (
    <form action={createPartnerCampaignAction} data-testid="partner-create-campaign-form" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <input type="hidden" name="redirectTo" value="/partner/campaigns/new" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create campaign</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">New campaigns are stored directly in PostgreSQL.</p>
        </div>
        <Plus className="size-5 text-coral-700" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-4">
        <CampaignFields organizations={organizations} />
      </div>
      <Button type="submit" className="mt-5">
        <Plus className="size-4" aria-hidden="true" />
        Create Campaign
      </Button>
    </form>
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
                <dd className="mt-1 leading-6 text-ocean-900/64">{campaign.story || "No story recorded in database."}</dd>
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
            <p className="mt-3 text-sm leading-6 text-ocean-900/64">{campaign.partnerDescription || "No partner description recorded in database."}</p>
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
              <EmptyRecord>No campaign, update, or evidence images recorded in database.</EmptyRecord>
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
                      {site.progress}% progress / {site.evidenceCount} evidence records / {site.latestSurvey || "No survey date recorded"}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyRecord>No impact sites linked to this campaign.</EmptyRecord>
              )}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Updates and evidence</h4>
            <div className="mt-3 grid gap-2 text-sm">
              <div className="rounded-lg bg-sand-50 p-3">
                <p className="font-bold text-ocean-900">{updates.length.toLocaleString("id-ID")} updates</p>
                <p className="mt-1 text-ocean-900/62">{updates[0] ? `Latest: ${updates[0].title} / ${dateLabel(updates[0].publishedAt)}` : "No updates recorded in database."}</p>
              </div>
              <div className="rounded-lg bg-sand-50 p-3">
                <p className="font-bold text-ocean-900">
                  {evidence.length.toLocaleString("id-ID")} evidence records / {verifiedEvidence.toLocaleString("id-ID")} verified
                </p>
                <p className="mt-1 text-ocean-900/62">{evidence[0] ? `Latest: ${evidence[0].title} / ${dateLabel(evidence[0].createdAt)}` : "No evidence recorded in database."}</p>
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
                <EmptyRecord>No paid donor activity recorded for this campaign.</EmptyRecord>
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
                      {item.status} / {item.fragments.toLocaleString("id-ID")} fragments / {item.siteName || item.region || "No site recorded"}
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
          <Link href="/partner/updates" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">
            <Camera className="size-4" aria-hidden="true" />
            Add update image
          </Link>
          <Link href="/partner/evidence/submit" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">
            <MapPin className="size-4" aria-hidden="true" />
            Submit evidence
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
  donorActivity
}: {
  campaigns: Campaign[];
  organizations: Organization[];
  updates: CampaignUpdate[];
  evidence: CampaignEvidence[];
  impactSites: CampaignImpactSite[];
  sponsoredEcosystems: CampaignSponsorship[];
  donorActivity: CampaignDonation[];
}) {
  return (
    <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaigns</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Edit campaign records and images.</p>
        </div>
        <Link href="/partner/campaigns/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">
          <Plus className="size-4" aria-hidden="true" />
          New campaign
        </Link>
      </div>

      <div className="mt-5 grid gap-4">
        {campaigns.map((campaign) => {
          const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);
          const campaignUpdates = updates.filter((update) => update.campaignId === campaign.id);
          const campaignEvidence = evidence.filter((item) => item.campaignId === campaign.id);
          const campaignImpactSites = impactSites.filter((site) => site.campaignId === campaign.id);
          const campaignSponsorships = sponsoredEcosystems.filter((item) => item.campaignId === campaign.id);
          const campaignDonations = donorActivity.filter((donation) => donation.campaignId === campaign.id);

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
                  <div className="h-2 rounded-full bg-white">
                    <div className="h-2 rounded-full bg-coral-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2 text-sm font-bold text-ocean-900">
                    {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/58">{campaign.donorCount.toLocaleString("id-ID")} donors</p>
                </div>

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

                <CampaignPublicDataPanel
                  campaign={campaign}
                  updates={campaignUpdates}
                  evidence={campaignEvidence}
                  impactSites={campaignImpactSites}
                  sponsoredEcosystems={campaignSponsorships}
                  donorActivity={campaignDonations}
                />

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
                      Delete this campaign and its related donation, evidence, update, sponsorship, and portfolio records.
                    </label>
                    <Button type="submit" className="w-fit bg-coral-500 hover:bg-coral-700">
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete Campaign
                    </Button>
                  </form>
                </details>
              </div>
            </article>
          );
        })}
        {campaigns.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">No campaigns found.</p> : null}
      </div>
    </section>
  );
}

export function PublishUpdateForm({ campaigns }: { campaigns: Campaign[] }) {
  const hasCampaigns = campaigns.length > 0;

  return (
    <form action={createCampaignUpdateAction} data-testid="partner-update-form" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <input type="hidden" name="redirectTo" value="/partner/updates" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Publish update</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Field notes can include an uploaded image stored in the DB.</p>
        </div>
        <ImagePlus className="size-5 text-kelp-700" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-4">
        <Field label="Campaign">
          <select name="campaignId" className={inputClassName} disabled={!hasCampaigns} required>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Update title">
          <input name="title" placeholder="Update title" className={inputClassName} required />
        </Field>
        <Field label="Field update">
          <textarea name="body" placeholder="Field update" className={textareaClassName} required />
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Upload image">
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} />
          </Field>
          <Field label="Image URL">
            <input name="imageUrl" placeholder="https://..." className={inputClassName} />
          </Field>
        </div>
      </div>
      <Button type="submit" className="mt-5" disabled={!hasCampaigns}>
        <UploadCloud className="size-4" aria-hidden="true" />
        Publish Update
      </Button>
    </form>
  );
}

export function EvidenceSubmitForm({ campaigns }: { campaigns: Campaign[] }) {
  const hasCampaigns = campaigns.length > 0;

  return (
    <form action={submitEvidenceAction} data-testid="partner-evidence-form" className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <input type="hidden" name="redirectTo" value="/partner/evidence/submit" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Submit evidence</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Uploaded image evidence is saved to the evidence record.</p>
        </div>
        <FileCheck2 className="size-5 text-kelp-700" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-4">
        <Field label="Campaign">
          <select name="campaignId" className={inputClassName} disabled={!hasCampaigns} required>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Evidence title">
          <input name="title" placeholder="Evidence title" className={inputClassName} required />
        </Field>
        <Field label="Evidence type">
          <select name="evidenceType" defaultValue="field_photo" className={inputClassName}>
            <option value="field_photo">Field photo</option>
            <option value="document">Document</option>
            <option value="field_report">Field report</option>
          </select>
        </Field>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Upload image">
            <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={inputClassName} />
          </Field>
          <Field label="File URL">
            <input name="fileUrl" placeholder="https://..." className={inputClassName} />
          </Field>
        </div>
      </div>
      <Button type="submit" className="mt-5" disabled={!hasCampaigns}>
        <FileCheck2 className="size-4" aria-hidden="true" />
        Submit Evidence
      </Button>
    </form>
  );
}

export function EvidenceStatusList({ evidence }: { evidence: PartnerPortalData["evidence"] }) {
  return (
    <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold tracking-normal text-ocean-900">Evidence status</h2>
      <div className="mt-5 grid gap-3">
        {evidence.map((item) => (
          <article key={item.evidenceCode} className="grid gap-3 rounded-lg bg-sand-50 p-4 sm:grid-cols-[96px_1fr]">
            <div className="min-h-20 rounded-lg bg-ocean-900/10 bg-cover bg-center" style={imageBackground(item.fileUrl)} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-ocean-900">{item.title}</p>
                <StatusBadge value={item.verificationStatus} />
              </div>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.campaignTitle}</p>
              <p className="mt-2 text-xs font-bold text-ocean-900/48">
                {item.evidenceCode} / {item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
              </p>
            </div>
          </article>
        ))}
        {evidence.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">No evidence records found.</p> : null}
      </div>
    </section>
  );
}

export function RecentUpdatesList({ updates }: { updates: PartnerPortalData["updates"] }) {
  return (
    <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
      <h2 className="text-xl font-bold tracking-normal text-ocean-900">Recent updates</h2>
      <div className="mt-5 grid gap-3">
        {updates.map((item) => (
          <article key={`${item.campaignTitle}-${item.title}`} className="grid gap-3 rounded-lg bg-sand-50 p-4 sm:grid-cols-[96px_1fr]">
            <div className="min-h-20 rounded-lg bg-ocean-900/10 bg-cover bg-center" style={imageBackground(item.imageUrl)} />
            <div>
              <p className="font-bold text-ocean-900">{item.title}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.campaignTitle}</p>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-ocean-900/68">{item.body}</p>
              <p className="mt-3 text-xs font-bold text-ocean-900/48">
                {item.publishedAt?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "Draft"}
              </p>
            </div>
          </article>
        ))}
        {updates.length === 0 ? <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">No updates found.</p> : null}
      </div>
    </section>
  );
}
