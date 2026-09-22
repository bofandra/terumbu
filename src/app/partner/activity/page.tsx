import { Camera, FileCheck2, Kanban, MessageSquare, RotateCcw } from "lucide-react";

import { EvidenceKanbanBoard, type EvidenceKanbanCard } from "@/components/evidence-kanban-board";
import { CampaignActivityForm, CampaignActivityList, PartnerPageHeader } from "@/components/partner-portal-ui";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { requireRole } from "@/lib/auth";
import { reviseEvidenceAction } from "@/lib/portal-actions";
import { getPartnerPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Partner Activity"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  activity: "Activity saved.",
  "evidence-resubmitted": "Activity revision submitted for admin review."
};

const errorMessages: Record<string, string> = {
  activity: "Enter an activity title and field note. Activity submissions with attachments also need a file.",
  "evidence-revision": "Complete the title and replacement activity file.",
  "evidence-missing": "Activity record was not found.",
  "evidence-state": "This activity is not waiting for partner revision.",
  "campaign-missing": "Choose an existing campaign.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "impact-site": "Choose an impact site linked to the selected campaign.",
  "partner-permission": "Your partner role cannot submit activity."
};

type PartnerActivityPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

const reviewCodes = new Set(["evidence-resubmitted", "evidence-revision", "evidence-missing", "evidence-state"]);

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

export default async function PartnerActivityPage({ searchParams }: PartnerActivityPageProps) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const params = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;
  const pending = data.evidence.filter((item) => item.verificationStatus === "submitted" || item.verificationStatus === "in_review");
  const needsResponse = data.evidence.filter((item) => item.verificationStatus === "needs_clarification" || item.verificationStatus === "rejected");
  const verified = data.evidence.filter((item) => item.verificationStatus === "verified");
  const evidenceByCampaign = new Map<string, typeof data.evidence>();
  const defaultTabId = reviewCodes.has(params?.saved ?? "") || reviewCodes.has(params?.error ?? "") ? "review" : "submit";

  for (const evidence of data.evidence) {
    const rows = evidenceByCampaign.get(evidence.campaignId) ?? [];
    rows.push(evidence);
    evidenceByCampaign.set(evidence.campaignId, rows);
  }

  const campaignCards: EvidenceKanbanCard[] = data.campaigns.map((campaign) => {
    const evidence = evidenceByCampaign.get(campaign.id) ?? [];
    const verifiedEvidence = evidence.filter((item) => item.verificationStatus === "verified").length;

    return {
      id: campaign.id,
      title: campaign.title,
      subtitle: `${campaign.partner} / ${campaign.region}`,
      code: campaign.slug,
      href: `/campaigns/${campaign.slug}`,
      tag: labelize(campaign.status),
      chips: [campaign.category, `${campaign.contentCompleteness}% content`],
      details: [
        { label: "Raised", value: formatCurrency(Number(campaign.raisedAmount)) },
        { label: "Goal", value: formatCurrency(Number(campaign.goalAmount)) },
        { label: "Reviewed activity", value: `${verifiedEvidence}/${evidence.length} verified` }
      ],
      evidence
    };
  });

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Field activity"
        description="Use one workflow for partner progress notes, verification attachments, review status, and revisions."
      />
      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}
      <FormTabs
        ariaLabel="Partner activity workspace"
        defaultTabId={defaultTabId}
        tabs={[
          { id: "submit", label: "Submit", description: "Post field activity" },
          { id: "timeline", label: "Timeline", description: "Submitted activity", badge: data.activities.length.toLocaleString("id-ID") },
          { id: "review", label: "Review", description: "Status and revisions", badge: data.evidence.length.toLocaleString("id-ID") }
        ]}
      >
        <CampaignActivityForm campaigns={data.campaigns} impactSites={data.impactSites} canCreateActivity={data.capabilities.canCreateActivity} />
        <CampaignActivityList activities={data.activities} />
        <div className="grid gap-5">
          <section className="grid gap-3 md:grid-cols-5" aria-label="Activity review summary">
            {[
              { label: "Campaign cards", value: campaignCards.length, icon: Kanban },
              { label: "Review records", value: data.evidence.length, icon: FileCheck2 },
              { label: "Pending review", value: pending.length, icon: MessageSquare },
              { label: "Needs response", value: needsResponse.length, icon: RotateCcw },
              { label: "Verified", value: verified.length, icon: Camera }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="min-w-0 rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                      <MetricValue className="mt-3 text-ocean-900">{item.value.toLocaleString("id-ID")}</MetricValue>
                    </div>
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ocean-50 text-ocean-700"><Icon className="size-5" aria-hidden="true" /></span>
                  </div>
                </article>
              );
            })}
          </section>

          <EvidenceKanbanBoard
            cards={campaignCards}
            revisionAction={data.capabilities.canReviseEvidence ? reviseEvidenceAction : undefined}
            returnTo="/partner/activity"
            readOnlyNote="Activity review status is managed in the Admin platform. Partner users can inspect review state here and revise only when admin asks for clarification or rejects a record."
            emptyMessage="No campaign activity cards are available yet. Use the Submit tab to post field photos, reports, or progress notes."
          />
        </div>
      </FormTabs>
    </div>
  );
}
