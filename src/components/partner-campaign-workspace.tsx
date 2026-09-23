import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  ImageIcon,
  MapPinned,
  Pencil,
  Target,
  Trash2
} from "lucide-react";

import { CampaignContentDepthEditor } from "@/components/campaign-content-depth-editor";
import {
  CampaignActivityForm,
  CampaignActivityList,
  CampaignFields,
  StatusBadge,
  imageBackground,
  type PartnerPortalData
} from "@/components/partner-portal-ui";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { deletePartnerCampaignAction, updatePartnerCampaignAction } from "@/lib/portal-actions";
import { formatCurrency } from "@/lib/utils";

type Campaign = PartnerPortalData["campaigns"][number];

type PartnerCampaignWorkspaceProps = {
  data: PartnerPortalData;
  campaignId: string;
  savedMessage?: string | null;
  errorMessage?: string | null;
};

function fundingProgress(raisedAmount: string | number, goalAmount: string | number) {
  const raised = Number(raisedAmount);
  const goal = Number(goalAmount);

  if (!Number.isFinite(raised) || !Number.isFinite(goal) || goal <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((raised / goal) * 100));
}

function campaignImpactLabel(campaign: Campaign) {
  const primary = campaign.impactTargets.find((target) => target.isPrimary) ?? campaign.impactTargets[0];

  if (primary) {
    return `${primary.target.toLocaleString("id-ID")} ${primary.unit}`;
  }

  return `${Number(campaign.impactTarget).toLocaleString("id-ID")} ${campaign.impactUnit}`;
}

export function PartnerCampaignWorkspace({
  data,
  campaignId,
  savedMessage,
  errorMessage
}: PartnerCampaignWorkspaceProps) {
  const campaign = data.campaigns.find((item) => item.id === campaignId);

  if (!campaign) {
    return null;
  }

  const returnTo = `/partner/campaigns/${campaign.id}`;
  const campaignUpdates = data.updates.filter((item) => item.campaignId === campaign.id);
  const campaignEvidence = data.evidence.filter((item) => item.campaignId === campaign.id);
  const campaignActivities = data.activities.filter((item) => item.campaignId === campaign.id);
  const campaignImpactSites = data.impactSites.filter((item) => item.campaignId === campaign.id);
  const campaignMedia = data.campaignMediaItems.filter((item) => item.campaignId === campaign.id);
  const campaignBudget = data.campaignBudgetLineItems.filter((item) => item.campaignId === campaign.id);
  const campaignTimeline = data.campaignTimelinePhases.filter((item) => item.campaignId === campaign.id);
  const campaignTeam = data.organizationTeamMembers.filter((item) => item.organizationId === campaign.organizationId);
  const plannedBudget = campaignBudget.reduce((total, item) => total + item.amount, 0);
  const verifiedSpend = campaignEvidence
    .filter((item) => item.verificationStatus === "verified")
    .reduce((total, item) => total + (item.financeSpendAmount ?? 0), 0);
  const verifiedEvidence = campaignEvidence.filter((item) => item.verificationStatus === "verified").length;
  const needsActionEvidence = campaignEvidence.filter(
    (item) => item.verificationStatus === "needs_clarification" || item.verificationStatus === "rejected"
  ).length;
  const progress = fundingProgress(campaign.raisedAmount, campaign.goalAmount);

  return (
    <div className="space-y-6">
      <Link href="/partner/campaigns" className="inline-flex items-center gap-2 text-sm font-bold text-ocean-900/62 hover:text-coral-700">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Campaigns
      </Link>

      <section className="overflow-hidden rounded-xl border border-ocean-900/10 bg-white shadow-soft">
        <div className="min-h-52 bg-ocean-900 bg-cover bg-center p-5 text-white" style={imageBackground(campaign.imageUrl)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={campaign.status} />
                <span className="rounded-full bg-white/16 px-2.5 py-1 text-xs font-bold">{campaign.category}</span>
              </div>
              <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-normal">{campaign.title}</h1>
              <p className="mt-2 text-sm font-semibold text-white/78">
                {campaign.partner} · {campaign.region}
              </p>
            </div>
            <Link
              href={`/campaigns/${campaign.slug}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-ocean-900 hover:bg-sand-50"
            >
              View public page
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-4">
          <article className="rounded-lg bg-sand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Funding</p>
            <MetricValue className="mt-2 text-ocean-900">{formatCurrency(Number(campaign.raisedAmount), campaign.currency)}</MetricValue>
            <p className="mt-1 text-xs font-semibold text-ocean-900/58">of {formatCurrency(Number(campaign.goalAmount), campaign.currency)}</p>
          </article>
          <article className="rounded-lg bg-sand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Primary impact</p>
            <p className="mt-2 text-lg font-bold text-ocean-900">{campaignImpactLabel(campaign)}</p>
            <p className="mt-1 text-xs font-semibold text-ocean-900/58">Campaign target</p>
          </article>
          <article className="rounded-lg bg-sand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Updates</p>
            <MetricValue className="mt-2 text-ocean-900">{campaignActivities.length.toLocaleString("id-ID")}</MetricValue>
            <p className="mt-1 text-xs font-semibold text-ocean-900/58">campaign activity records</p>
          </article>
          <article className="rounded-lg bg-sand-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Verified evidence</p>
            <MetricValue className="mt-2 text-ocean-900">{verifiedEvidence.toLocaleString("id-ID")}</MetricValue>
            <p className="mt-1 text-xs font-semibold text-ocean-900/58">
              {needsActionEvidence > 0 ? `${needsActionEvidence} need action` : "No pending partner action"}
            </p>
          </article>
        </div>
      </section>

      {savedMessage ? (
        <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p>
      ) : null}

      <FormTabs
        ariaLabel={`${campaign.title} campaign workspace`}
        tabs={[
          { id: "overview", label: "Overview", description: "Campaign health" },
          { id: "funding", label: "Funding & impact", description: "Goal, budget, outcomes" },
          { id: "public", label: "Public page", description: "Story and media" },
          { id: "timeline", label: "Timeline", description: "Delivery phases", badge: campaignTimeline.length.toLocaleString("id-ID") },
          {
            id: "activity",
            label: "Updates & evidence",
            description: "Field proof and verification",
            badge: campaignActivities.length.toLocaleString("id-ID")
          },
          { id: "settings", label: "Settings", description: "Core campaign data" }
        ]}
      >
        <div className="grid gap-5">
          <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <article className="rounded-lg border border-ocean-900/10 bg-white p-5">
              <h2 className="text-xl font-bold text-ocean-900">Campaign summary</h2>
              <p className="mt-3 text-sm leading-7 text-ocean-900/68">{campaign.summary}</p>
              <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.12em] text-coral-700">Story</h3>
              <p className="mt-2 text-sm leading-7 text-ocean-900/68">
                {campaign.story || "Add the campaign story from Settings so supporters understand the problem, intervention, and expected impact."}
              </p>
            </article>

            <article className="rounded-lg border border-ocean-900/10 bg-sand-50 p-5">
              <h2 className="text-lg font-bold text-ocean-900">Funding progress</h2>
              <div className="mt-4">
                <ProgressMeter value={progress} label={`${campaign.title} funding progress`} trackClassName="bg-white" />
                <p className="mt-3 text-sm font-bold text-ocean-900">
                  {formatCurrency(Number(campaign.raisedAmount), campaign.currency)} / {formatCurrency(Number(campaign.goalAmount), campaign.currency)}
                </p>
                <p className="mt-1 text-xs font-semibold text-ocean-900/54">{campaign.donorCount.toLocaleString("id-ID")} donors</p>
              </div>
            </article>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <MapPinned className="size-5 text-kelp-700" aria-hidden="true" />
              <h2 className="text-xl font-bold text-ocean-900">Impact sites</h2>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {campaignImpactSites.length > 0 ? (
                campaignImpactSites.map((site) => (
                  <article key={site.id} className="rounded-lg border border-ocean-900/10 bg-white p-4">
                    <p className="font-bold text-ocean-900">{site.name}</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.type} · {site.region}</p>
                    <p className="mt-3 text-xs font-bold text-ocean-900/48">
                      {site.progress}% progress · {site.evidenceCount} evidence records
                    </p>
                  </article>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/54">
                  No impact site is linked to this campaign yet.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-5">
          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex items-center gap-2 text-ocean-900/52">
                <BadgeDollarSign className="size-4" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-[0.1em]">Funding goal</p>
              </div>
              <p className="mt-3 text-xl font-bold text-ocean-900">{formatCurrency(Number(campaign.goalAmount), campaign.currency)}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">
                {plannedBudget > 0 ? "Synced from the campaign budget plan." : "Uses the impact estimate until a budget plan is added."}
              </p>
            </article>
            <article className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex items-center gap-2 text-ocean-900/52">
                <Target className="size-4" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-[0.1em]">Planned budget</p>
              </div>
              <p className="mt-3 text-xl font-bold text-ocean-900">{formatCurrency(plannedBudget, campaign.currency)}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">Sum of campaign budget categories.</p>
            </article>
            <article className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex items-center gap-2 text-ocean-900/52">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-[0.1em]">Verified actual spend</p>
              </div>
              <p className="mt-3 text-xl font-bold text-ocean-900">{formatCurrency(verifiedSpend, campaign.currency)}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">Calculated only from verified evidence-backed expenses.</p>
            </article>
          </section>

          <section className="rounded-lg border border-ocean-900/10 bg-white p-5">
            <h2 className="text-xl font-bold text-ocean-900">Impact targets</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {campaign.impactTargets.map((target) => (
                <article key={target.id} className="rounded-lg bg-sand-50 p-4">
                  <p className="text-sm font-bold text-ocean-900">{target.label}</p>
                  <p className="mt-2 text-lg font-bold text-ocean-900">
                    {target.target.toLocaleString("id-ID")} {target.unit}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/54">
                    {target.unitCost ? `${formatCurrency(target.unitCost, campaign.currency)} estimated / unit` : "Unit cost not set"}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <CampaignContentDepthEditor
            campaign={campaign}
            mediaItems={campaignMedia}
            budgetLineItems={campaignBudget}
            timelinePhases={campaignTimeline}
            teamMembers={campaignTeam}
            evidenceSpends={campaignEvidence.map((item) => ({
              id: item.id,
              title: item.title,
              category: item.financeCategory ?? null,
              amount: item.financeSpendAmount ?? 0,
              currency: item.financeSpendCurrency ?? campaign.currency,
              verificationStatus: item.verificationStatus
            }))}
            section="budget"
            returnTo={returnTo}
            canManage={data.capabilities.canUpdateCampaign}
          />
        </div>

        <div className="grid gap-5">
          <section className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
            <article className="rounded-lg border border-ocean-900/10 bg-white p-5">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-5 text-kelp-700" aria-hidden="true" />
                <h2 className="text-xl font-bold text-ocean-900">Public story</h2>
              </div>
              <p className="mt-4 text-sm font-bold text-ocean-900">{campaign.title}</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/68">{campaign.summary}</p>
              <p className="mt-4 text-sm leading-6 text-ocean-900/62">
                {campaign.story || "No long-form story has been added yet."}
              </p>
              <Link href={`/campaigns/${campaign.slug}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-coral-700">
                Preview public page
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </article>
            <div className="min-h-72 rounded-lg bg-ocean-900 bg-cover bg-center p-6 text-white" style={imageBackground(campaign.imageUrl)}>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/72">Public preview</p>
              <h3 className="mt-16 max-w-xl text-3xl font-bold">{campaign.title}</h3>
              <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/78">{campaign.summary}</p>
            </div>
          </section>

          <CampaignContentDepthEditor
            campaign={campaign}
            mediaItems={campaignMedia}
            budgetLineItems={campaignBudget}
            timelinePhases={campaignTimeline}
            teamMembers={campaignTeam}
            section="media"
            returnTo={returnTo}
            canManage={data.capabilities.canUpdateCampaign}
          />
        </div>

        <CampaignContentDepthEditor
          campaign={campaign}
          mediaItems={campaignMedia}
          budgetLineItems={campaignBudget}
          timelinePhases={campaignTimeline}
          teamMembers={campaignTeam}
          section="timeline"
          returnTo={returnTo}
          canManage={data.capabilities.canUpdateCampaign}
        />

        <div className="grid gap-5">
          <section className="grid gap-3 md:grid-cols-3">
            <article className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Activity</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{campaignActivities.length.toLocaleString("id-ID")}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">updates and proof records</p>
            </article>
            <article className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Verified</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{verifiedEvidence.toLocaleString("id-ID")}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">evidence records accepted</p>
            </article>
            <article className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-ocean-900/48">Needs action</p>
              <p className="mt-2 text-2xl font-bold text-ocean-900">{needsActionEvidence.toLocaleString("id-ID")}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">clarification or replacement requested</p>
            </article>
          </section>

          <CampaignActivityForm
            campaigns={[campaign]}
            impactSites={campaignImpactSites}
            canCreateActivity={data.capabilities.canCreateActivity}
            lockedCampaignId={campaign.id}
            redirectTo={returnTo}
          />
          <CampaignActivityList activities={campaignActivities} />
        </div>

        <div className="grid gap-5">
          {data.capabilities.canUpdateCampaign ? (
            <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <Pencil className="size-5 text-kelp-700" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-bold text-ocean-900">Campaign settings</h2>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">
                    Edit core campaign details. Funding goal is managed from the Budget Plan after budget lines exist.
                  </p>
                </div>
              </div>
              <form action={updatePartnerCampaignAction} encType="multipart/form-data" className="mt-5 grid gap-4">
                <input type="hidden" name="campaignId" value={campaign.id} />
                <input type="hidden" name="redirectTo" value={returnTo} />
                <CampaignFields campaign={campaign} organizations={data.organizations} impactSites={campaignImpactSites} />
                {campaign.imageUrl ? (
                  <label className="flex items-center gap-2 text-sm font-bold text-ocean-900">
                    <input name="removeImage" type="checkbox" className="size-4 accent-coral-500" />
                    Remove current hero image
                  </label>
                ) : null}
                <Button type="submit" tone="secondary" className="w-fit">
                  Save campaign
                </Button>
              </form>
            </section>
          ) : null}

          {data.capabilities.canDeleteCampaign ? (
            <section className="rounded-lg border border-coral-700/20 bg-white p-5">
              <div className="flex items-center gap-2 text-coral-700">
                <Trash2 className="size-5" aria-hidden="true" />
                <h2 className="text-lg font-bold">Delete campaign</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">
                Deletion is blocked when the campaign already has donations, sponsorships, corporate portfolio links, or related expeditions.
              </p>
              <form action={deletePartnerCampaignAction} className="mt-4 grid gap-3">
                <input type="hidden" name="campaignId" value={campaign.id} />
                <input type="hidden" name="redirectTo" value="/partner/campaigns" />
                <label className="flex items-start gap-2 text-sm font-bold text-ocean-900">
                  <input name="confirmDelete" type="checkbox" value="delete" className="mt-1 size-4 accent-coral-500" required />
                  I understand this permanently deletes the campaign when there is no protected history.
                </label>
                <Button type="submit" className="w-fit bg-coral-500 hover:bg-coral-700">
                  Delete campaign
                </Button>
              </form>
            </section>
          ) : null}
        </div>
      </FormTabs>
    </div>
  );
}
