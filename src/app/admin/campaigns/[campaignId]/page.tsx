import Link from "next/link";
import { ArrowUpRight, Building2, Image as ImageIcon, MapPinned, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader, AdminStatusBadge, adminPanelClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { updateCampaignStatusAction } from "@/lib/portal-actions";
import { getAdminCampaignWorkspaceData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Donation Monitoring"
};

export const dynamic = "force-dynamic";

type AdminCampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

const savedMessages: Record<string, string> = {
  "campaign-published": "Campaign approved and published.",
  "campaign-changes-requested": "Campaign returned to draft for partner revision."
};

const errorMessages: Record<string, string> = {
  campaign: "Choose a valid publication decision.",
  "campaign-missing": "Campaign was not found.",
  "campaign-review-state": "Only campaigns currently in review can be moderated."
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

export default async function AdminCampaignDetailPage({ params, searchParams }: AdminCampaignDetailPageProps) {
  const [{ campaignId }, query] = await Promise.all([params, searchParams]);
  await requireRole(["admin"], `/admin/campaigns/${campaignId}`);
  const data = await observeAdminDataLoader("admin.campaign.workspace", () => getAdminCampaignWorkspaceData(campaignId));

  if (!data) {
    notFound();
  }

  const campaign = data.campaign;
  const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);
  const savedMessage = query?.saved ? savedMessages[query.saved] ?? "Campaign moderation saved." : null;
  const errorMessage = query?.error ? errorMessages[query.error] ?? "Campaign moderation could not be saved." : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Donations / Read only"
        title={campaign.title}
        description={`${campaign.partner} / ${campaign.region}`}
        actionHref="/admin/campaigns"
        actionLabel="Donation list"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="rounded-lg border border-kelp-700/20 bg-kelp-100/50 p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-kelp-700" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-ocean-900">Partner-owned record</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/62">
              Platform admins can monitor this donation but cannot change campaign content, funding targets, status, impact sites, or partner-owned evidence. Use Partner management to manage the organization and its portal access.
            </p>
            <Link href={`/admin/partners/${campaign.organizationId}`} className="mt-3 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
              Manage partner organization →
            </Link>
          </div>
        </div>
      </section>

      {campaign.status === "review" ? (
        <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Publication review</p>
              <h2 className="mt-2 text-xl font-bold text-ocean-900">Review partner submission</h2>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-ocean-900/58">
                Approval only changes publication status. Campaign content, impact planning, funding targets, and evidence remain partner-owned.
              </p>
            </div>
            <AdminStatusBadge value={campaign.status} />
          </div>
          <form action={updateCampaignStatusAction} className="mt-5 grid gap-4">
            <input type="hidden" name="campaignId" value={campaign.id} />
            <input type="hidden" name="returnTo" value={`/admin/campaigns/${campaign.id}`} />
            <label className="grid gap-2 text-sm font-bold text-ocean-900">
              Review note <span className="font-semibold text-ocean-900/42">(optional)</span>
              <textarea
                name="reviewNote"
                className="min-h-24 rounded-lg border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold text-ocean-900 outline-none focus:border-kelp-500 focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
                placeholder="Add context for the partner when requesting revisions."
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="decision" value="publish">
                Approve & publish
              </Button>
              <Button type="submit" name="decision" value="request_changes" tone="secondary">
                Request changes
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Donation monitoring summary">
        {[
          { label: "Status", value: labelize(campaign.status) },
          { label: "Funding", value: `${progress}%` },
          { label: "Donors", value: campaign.donorCount.toLocaleString("id-ID") },
          { label: "Impact target", value: `${campaign.impactTarget.toLocaleString("id-ID")} ${campaign.impactUnit}` }
        ].map((item) => (
          <article key={item.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
            <MetricValue className="mt-3 capitalize text-ocean-900">{item.value}</MetricValue>
          </article>
        ))}
      </section>

      <FormTabs
        ariaLabel="Donation monitoring"
        tabs={[
          { id: "overview", label: "Overview", description: "Campaign snapshot" },
          { id: "impact-sites", label: "Impact sites", description: "Partner locations", badge: data.impactSites.length.toLocaleString("id-ID") },
          { id: "content", label: "Content snapshot", description: "Media, budget, timeline" }
        ]}
      >
        <section className={adminPanelClassName}>
          <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-ocean-900">Campaign overview</h2>
                <AdminStatusBadge value={campaign.status} />
              </div>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{campaign.summary}</p>
            </div>
            <Link href={`/campaigns/${campaign.slug}`} className="inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
              Public page
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <div className="rounded-lg bg-sand-50 p-4">
              <h3 className="font-bold text-ocean-900">Funding</h3>
              <ProgressMeter value={progress} label="Funding progress" className="mt-3" trackClassName="bg-white" />
              <p className="mt-3 font-bold text-ocean-900">
                {formatCurrency(Number(campaign.raisedAmount), campaign.currency)} / {formatCurrency(Number(campaign.goalAmount), campaign.currency)}
              </p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/54">{campaign.donorCount.toLocaleString("id-ID")} donors</p>
            </div>
            <dl className="grid gap-3 rounded-lg bg-sand-50 p-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="font-semibold text-ocean-900/54">Partner</dt><dd className="text-right font-bold text-ocean-900">{campaign.partner}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-semibold text-ocean-900/54">Category</dt><dd className="text-right font-bold text-ocean-900">{campaign.category}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-semibold text-ocean-900/54">Region</dt><dd className="text-right font-bold text-ocean-900">{campaign.region}</dd></div>
              <div className="flex justify-between gap-4"><dt className="font-semibold text-ocean-900/54">Related expeditions</dt><dd className="font-bold text-ocean-900">{campaign.relatedExpeditionCount}</dd></div>
            </dl>
            {campaign.story ? (
              <div className="rounded-lg border border-ocean-900/10 bg-white p-4 lg:col-span-2">
                <h3 className="font-bold text-ocean-900">Story</h3>
                <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-7 text-ocean-900/62">{campaign.story}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {data.impactSites.map((site) => (
            <article key={site.id} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{site.ecosystemType}</p>
                  <h3 className="mt-2 text-lg font-bold text-ocean-900">{site.name}</h3>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.region}</p>
                </div>
                <MapPinned className="size-5 text-kelp-700" aria-hidden="true" />
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                <p><span className="font-semibold text-ocean-900/54">Coordinates:</span> <span className="font-bold text-ocean-900">{site.latitude}, {site.longitude}</span></p>
                <p><span className="font-semibold text-ocean-900/54">Verification:</span> <span className="font-bold capitalize text-ocean-900">{site.verification}</span></p>
                <p><span className="font-semibold text-ocean-900/54">Evidence:</span> <span className="font-bold text-ocean-900">{site.evidenceCount}</span></p>
              </div>
              <ProgressMeter value={site.progress} label={`${site.name} progress`} className="mt-4 h-2" trackClassName="bg-sand-100" />
            </article>
          ))}
          {data.impactSites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-5 md:col-span-2">
              <p className="font-bold text-ocean-900">No impact site linked.</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/54">The partner must link an impact site before submitting field activity and evidence.</p>
            </div>
          ) : null}
        </section>

        <section className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Media", value: data.mediaItems.length, icon: ImageIcon },
              { label: "Budget lines", value: data.budgetLineItems.length, icon: Building2 },
              { label: "Timeline phases", value: data.timelinePhases.length, icon: MapPinned },
              { label: "Team members", value: data.teamMembers.length, icon: ShieldCheck }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-sm font-bold text-ocean-900/58">{item.label}</p><p className="mt-2 text-2xl font-bold text-ocean-900">{item.value}</p></div>
                    <Icon className="size-5 text-ocean-700" aria-hidden="true" />
                  </div>
                </article>
              );
            })}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className={adminPanelClassName}>
              <div className="border-b border-ocean-900/10 p-4"><h3 className="font-bold text-ocean-900">Budget snapshot</h3></div>
              <div className="divide-y divide-ocean-900/10">
                {data.budgetLineItems.map((line) => (
                  <div key={line.id} className="flex justify-between gap-4 p-4 text-sm">
                    <div><p className="font-bold text-ocean-900">{line.category}</p><p className="mt-1 font-semibold text-ocean-900/54">{line.description}</p></div>
                    <div className="text-right"><p className="font-bold text-ocean-900">{formatCurrency(line.amount, campaign.currency)}</p><p className="mt-1 text-xs font-semibold text-ocean-900/48">Spent {formatCurrency(line.spentAmount, campaign.currency)}</p></div>
                  </div>
                ))}
                {data.budgetLineItems.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/54">No budget lines.</p> : null}
              </div>
            </section>
            <section className={adminPanelClassName}>
              <div className="border-b border-ocean-900/10 p-4"><h3 className="font-bold text-ocean-900">Timeline snapshot</h3></div>
              <div className="divide-y divide-ocean-900/10">
                {data.timelinePhases.map((phase) => (
                  <div key={phase.id} className="p-4">
                    <div className="flex items-center justify-between gap-3"><p className="font-bold text-ocean-900">{phase.title}</p><AdminStatusBadge value={phase.status} /></div>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/54">{phase.description}</p>
                  </div>
                ))}
                {data.timelinePhases.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/54">No timeline phases.</p> : null}
              </div>
            </section>
          </div>
        </section>
      </FormTabs>
    </div>
  );
}
