import Link from "next/link";
import { ArrowUpRight, ImagePlus, Megaphone, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  AdminPageHeader,
  AdminStatusBadge,
  adminInputClassName,
  adminPanelClassName,
  adminSelectClassName,
  adminTextareaClassName
} from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createAdminCampaignAction, deleteAdminCampaignAction, updateAdminCampaignAction, updateCampaignStatusAction } from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Campaigns"
};

export const dynamic = "force-dynamic";

const campaignStatuses = ["draft", "review", "published", "funded", "completed", "archived"];

const statusMessages: Record<string, string> = {
  "campaign-created": "Campaign created.",
  "campaign-deleted": "Campaign deleted.",
  "campaign-updated": "Campaign updated.",
  status: "Campaign status updated."
};

const errorMessages: Record<string, string> = {
  campaign: "Choose a campaign and valid status.",
  "campaign-delete": "Confirm campaign deletion by checking the delete box.",
  "campaign-has-history": "Campaigns with donations, sponsorships, corporate portfolio links, or related expeditions cannot be deleted.",
  "campaign-invalid": "Enter campaign title, slug, organization, goal, impact target, summary, category, and region.",
  "campaign-missing": "Campaign record was not found.",
  "campaign-slug": "That campaign slug is already in use.",
  "image-invalid": "Upload a supported image file.",
  "image-too-large": "Uploaded image is too large.",
  "organization-missing": "Choose an existing partner organization."
};

type AdminCampaignsPageProps = {
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

export default async function AdminCampaignsPage({ searchParams }: AdminCampaignsPageProps) {
  await requireRole(["admin"], "/admin/campaigns");
  const params = await searchParams;
  const data = await getAdminPortalData();

  const totalRaised = data.campaigns.reduce((total, campaign) => total + Number(campaign.raisedAmount), 0);
  const reviewCount = data.campaigns.filter((campaign) => campaign.status === "review").length;
  const publishedCount = data.campaigns.filter((campaign) => campaign.status === "published").length;
  const historyLockedCount = data.campaigns.filter(
    (campaign) =>
      campaign.donationRecordCount > 0 ||
      campaign.sponsorshipRecordCount > 0 ||
      campaign.corporatePortfolioCount > 0 ||
      campaign.relatedExpeditionCount > 0
  ).length;
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns"
        title="Campaign management"
        description="Create and edit campaign records, control publication state, maintain media, and review partner submissions."
        actionHref="/admin"
        actionLabel="Overview"
      />

      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Campaign summary">
        {[
          { label: "Total campaigns", value: data.campaigns.length.toLocaleString("id-ID") },
          { label: "In review", value: reviewCount.toLocaleString("id-ID") },
          { label: "Published", value: publishedCount.toLocaleString("id-ID") },
          { label: "History locked", value: historyLockedCount.toLocaleString("id-ID") }
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Create campaign</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Create platform-owned campaigns or add partner submissions from the admin workspace.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createAdminCampaignAction} className="grid gap-4 p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Field label="Organization" className="lg:col-span-2">
              <OrganizationSelect organizations={data.organizations} />
            </Field>
            <Field label="Status">
              <StatusSelect />
            </Field>
            <Field label="End date">
              <input name="endsAt" type="date" className={adminInputClassName} />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Title" className="lg:col-span-2">
              <input name="title" placeholder="Restore Raja Ampat Reefs" className={adminInputClassName} required />
            </Field>
            <Field label="Slug">
              <input name="slug" placeholder="restore-raja-ampat-reefs" className={adminInputClassName} />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Category">
              <input name="category" placeholder="Coral Restoration" className={adminInputClassName} required />
            </Field>
            <Field label="Region">
              <input name="region" placeholder="Raja Ampat" className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <Field label="Goal amount">
              <input name="goalAmount" type="number" min={1000} step={1000} placeholder="500000000" className={adminInputClassName} required />
            </Field>
            <Field label="Impact target">
              <input name="impactTarget" type="number" min={1} placeholder="10000" className={adminInputClassName} required />
            </Field>
            <Field label="Impact unit">
              <input name="impactUnit" placeholder="coral fragments" className={adminInputClassName} required />
            </Field>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Field label="Upload image">
              <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
            </Field>
            <Field label="Image URL">
              <input name="imageUrl" type="url" placeholder="https://..." className={adminInputClassName} />
            </Field>
          </div>
          <Field label="Summary">
            <textarea name="summary" placeholder="Public campaign summary" className={adminTextareaClassName} required />
          </Field>
          <Field label="Story">
            <textarea name="story" placeholder="Long-form campaign story" className={adminTextareaClassName} />
          </Field>
          <Button type="submit" tone="secondary" className="w-fit rounded-lg" disabled={data.organizations.length === 0}>
            <Plus className="size-4" aria-hidden="true" />
            Create Campaign
          </Button>
        </form>
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Campaign catalog</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">{formatCurrency(totalRaised)} raised across all campaigns</p>
          </div>
          <Megaphone className="size-5 text-coral-700" aria-hidden="true" />
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.campaigns.map((campaign) => {
            const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);
            const hasHistory =
              campaign.donationRecordCount > 0 ||
              campaign.sponsorshipRecordCount > 0 ||
              campaign.corporatePortfolioCount > 0 ||
              campaign.relatedExpeditionCount > 0;

            return (
              <article key={campaign.id} className="p-4">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold tracking-normal text-ocean-900">{campaign.title}</h2>
                      <AdminStatusBadge value={campaign.status} />
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{campaign.partner} / {campaign.region}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link href={`/campaigns/${campaign.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                        Public page
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                      {campaign.imageUrl ? (
                        <span className="inline-flex items-center gap-2 text-sm font-bold text-ocean-900/58">
                          <ImagePlus className="size-4" aria-hidden="true" />
                          Media attached
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <div className="h-2 rounded-full bg-sand-100">
                      <div className="h-2 rounded-full bg-coral-500" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="mt-2 text-sm font-bold text-ocean-900">
                      {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ocean-900/54">
                      {campaign.donorCount.toLocaleString("id-ID")} donors / {campaign.impactTarget.toLocaleString("id-ID")} {campaign.impactUnit}
                    </p>
                  </div>

                  <form action={updateCampaignStatusAction} className="flex flex-wrap gap-2 lg:justify-end">
                    <input type="hidden" name="campaignId" value={campaign.id} />
                    <StatusSelect defaultValue={campaign.status} />
                    <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-4">
                      <ShieldCheck className="size-4" aria-hidden="true" />
                      Status
                    </Button>
                  </form>
                </div>

                <details className="mt-4 rounded-lg border border-ocean-900/10 bg-sand-50">
                  <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-bold text-ocean-900">
                    <Save className="size-4" aria-hidden="true" />
                    Edit campaign
                  </summary>
                  <form action={updateAdminCampaignAction} className="grid gap-4 border-t border-ocean-900/10 p-4">
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
                    <div className="grid gap-3 lg:grid-cols-2">
                      <Field label="Upload image">
                        <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={adminInputClassName} />
                      </Field>
                      <Field label="Image URL">
                        <input name="imageUrl" type="url" placeholder="https://..." className={adminInputClassName} />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold text-ocean-900">
                      <input name="removeImage" type="checkbox" className="size-4 accent-coral-500" />
                      Remove current image
                    </label>
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
                </details>

                <form action={deleteAdminCampaignAction} className="mt-3 rounded-lg border border-coral-700/20 bg-white p-3">
                  <input type="hidden" name="campaignId" value={campaign.id} />
                  <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                    <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" disabled={hasHistory} required />
                    Delete this campaign only if it has no donations, sponsorships, corporate portfolio links, or related expeditions.
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
              </article>
            );
          })}
          {data.campaigns.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No campaigns found.</p> : null}
        </div>
      </section>
    </div>
  );
}
