import Link from "next/link";
import { ArrowUpRight, FileCheck2, ImagePlus, MapPinned, Megaphone, Plus, ShieldCheck } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireRole } from "@/lib/auth";
import { updateCampaignStatusAction } from "@/lib/portal-actions";
import { getAdminPortalData, getAdminOperationsData } from "@/lib/queries";
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
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
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
  const [data, operations] = await Promise.all([getAdminPortalData(), getAdminOperationsData()]);

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
  const pendingEvidence = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns"
        title="Campaign management"
        description="Review the campaign portfolio, route evidence decisions, and jump into focused campaign editing when needed."
        actionHref="/admin/campaigns/new"
        actionLabel="New campaign"
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

      <section className="grid gap-3 md:grid-cols-3" aria-label="Campaign workspace shortcuts">
        {[
          { label: "Create campaign", detail: "Add a public fundraising record", href: "/admin/campaigns/new", icon: Plus },
          { label: "Impact sites", detail: `${operations.impactSites.length.toLocaleString("id-ID")} field locations`, href: "/admin/campaigns/impact-sites", icon: MapPinned },
          { label: "Evidence", detail: `${pendingEvidence.toLocaleString("id-ID")} records need decisions`, href: "/admin/campaigns/evidence", icon: FileCheck2 }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="group rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-coral-500">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700 group-hover:bg-coral-100 group-hover:text-coral-700">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <ArrowUpRight className="size-4 text-ocean-900/40 group-hover:text-coral-700" aria-hidden="true" />
              </div>
              <h2 className="mt-4 font-bold text-ocean-900">{item.label}</h2>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.detail}</p>
            </Link>
          );
        })}
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

            return (
              <article key={campaign.id} className="p-4">
                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.75fr_auto] xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold tracking-normal text-ocean-900">{campaign.title}</h3>
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
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-ocean-900/58">
                        Content depth {campaign.contentCompleteness.score}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <ProgressMeter value={progress} label={`${campaign.title} funding progress`} trackClassName="bg-sand-100" />
                    <p className="mt-2 text-sm font-bold text-ocean-900">
                      {formatCurrency(Number(campaign.raisedAmount))} / {formatCurrency(Number(campaign.goalAmount))}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ocean-900/54">
                      {campaign.donorCount.toLocaleString("id-ID")} donors / {campaign.impactTarget.toLocaleString("id-ID")} {campaign.impactUnit}
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto] xl:min-w-72 xl:grid-cols-1">
                    <form action={updateCampaignStatusAction} className="flex flex-wrap gap-2 xl:justify-end">
                      <input type="hidden" name="returnTo" value="/admin/campaigns" />
                      <input type="hidden" name="campaignId" value={campaign.id} />
                      <StatusSelect defaultValue={campaign.status} />
                      <Button type="submit" tone="secondary" className="min-h-10 rounded-lg px-4">
                        <ShieldCheck className="size-4" aria-hidden="true" />
                        Status
                      </Button>
                    </form>
                    <Link
                      href={`/admin/campaigns/${campaign.id}`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
                    >
                      Manage
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
          {data.campaigns.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title="No campaigns yet"
              description="Create a campaign to publish public fundraising pages, connect partners, and begin evidence tracking."
              actionHref="/admin/campaigns/new"
              actionLabel="Create campaign"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
