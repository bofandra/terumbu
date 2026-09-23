import { CheckCircle2, Clock3, RotateCcw } from "lucide-react";

import { EvidenceKanbanBoard, type EvidenceKanbanCard, type EvidenceKanbanLane } from "@/components/evidence-kanban-board";
import { CampaignActivityForm, CampaignActivityList, PartnerPageHeader } from "@/components/partner-portal-ui";
import { FormTabs } from "@/components/ui/form-tabs";
import { MetricValue } from "@/components/ui/metric-value";
import { requireRole } from "@/lib/auth";
import { reviseEvidenceAction } from "@/lib/portal-actions";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Activity"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  activity: "Project proof saved.",
  "evidence-resubmitted": "Activity revision submitted for admin review."
};

const errorMessages: Record<string, string> = {
  activity: "Enter a proof title and reviewer note. Proof submissions with attachments also need a file.",
  "evidence-revision": "Complete the title and replacement activity file.",
  "evidence-missing": "Activity record was not found.",
  "evidence-state": "This proof is not waiting for partner revision.",
  "campaign-missing": "Choose an existing donation project.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "impact-site": "Choose an impact site linked to the selected campaign.",
  "partner-permission": "Your partner role cannot submit project proof."
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

function laneForEvidenceStatus(status: string): EvidenceKanbanLane {
  if (status === "needs_clarification" || status === "rejected") {
    return "needs_action";
  }

  if (status === "verified") {
    return "verified";
  }

  return "awaiting_review";
}

function evidenceCardTitle(status: string) {
  if (status === "needs_clarification") {
    return "Answer admin clarification";
  }

  if (status === "rejected") {
    return "Replace rejected proof";
  }

  if (status === "in_review") {
    return "Admin review in progress";
  }

  if (status === "verified") {
    return "Verified proof";
  }

  return "Waiting for admin review";
}

function evidenceCardNote(item: { verificationStatus: string; latestReviewNote?: string | null }) {
  if (item.verificationStatus === "needs_clarification") {
    return item.latestReviewNote ?? "Admin needs more detail before this proof can be accepted.";
  }

  if (item.verificationStatus === "rejected") {
    return item.latestReviewNote ?? "This proof was rejected. Upload a corrected replacement.";
  }

  if (item.verificationStatus === "in_review") {
    return "No partner action needed while admin reviews this proof.";
  }

  if (item.verificationStatus === "verified") {
    return "This proof has been accepted and can support public project reporting.";
  }

  return "Submitted to admin. No partner action needed yet.";
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

  const missingProofCards: EvidenceKanbanCard[] = data.campaigns
    .filter((campaign) => !evidenceByCampaign.has(campaign.id))
    .map((campaign) => ({
      id: `${campaign.id}-missing-proof`,
      title: "Submit first verification proof",
      subtitle: "No field proof has been sent for admin review yet.",
      code: campaign.slug,
      tag: "Needs proof",
      chips: [campaign.category],
      note: "Add a field photo, document, or report from the Submit tab.",
      evidence: [],
      lane: "needs_action",
      campaignTitle: campaign.title,
      campaignHref: `/campaigns/${campaign.slug}`,
      context: campaign.region
    }));
  const evidenceCards: EvidenceKanbanCard[] = data.evidence.map((evidence) => {
    const metricChip = evidence.metricLabel && evidence.metricValue ? `${evidence.metricLabel}: ${evidence.metricValue}` : null;
    const location = evidence.siteName ? `${evidence.siteName}${evidence.siteRegion ? ` / ${evidence.siteRegion}` : ""}` : evidence.organizationName;
    const chips = [labelize(evidence.evidenceType), evidence.stageLabel, metricChip].filter((chip): chip is string => Boolean(chip));

    return {
      id: evidence.id,
      title: evidenceCardTitle(evidence.verificationStatus),
      subtitle: evidence.title,
      code: evidence.evidenceCode,
      tag: evidence.statusLabel,
      chips,
      note: evidenceCardNote(evidence),
      evidence: [evidence],
      lane: laneForEvidenceStatus(evidence.verificationStatus),
      campaignTitle: evidence.campaignTitle,
      campaignHref: `/campaigns/${evidence.campaignSlug}`,
      context: location
    };
  });
  const reviewCards = [...missingProofCards, ...evidenceCards];
  const needsActionCount = missingProofCards.length + needsResponse.length;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Project verification activity"
        description="Submit and track evidence for donation-backed projects. Expedition schedules and participant requests stay in Expeditions."
      />
      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}
      <FormTabs
        ariaLabel="Partner activity workspace"
        defaultTabId={defaultTabId}
        tabs={[
          { id: "submit", label: "Submit proof", description: "Project evidence" },
          { id: "timeline", label: "Timeline", description: "Submitted project activity", badge: data.activities.length.toLocaleString("id-ID") },
          { id: "review", label: "Verification queue", description: "Action status", badge: reviewCards.length.toLocaleString("id-ID") }
        ]}
      >
        <CampaignActivityForm campaigns={data.campaigns} impactSites={data.impactSites} canCreateActivity={data.capabilities.canCreateActivity} />
        <CampaignActivityList activities={data.activities} />
        <div className="grid gap-5">
          <section className="grid gap-3 md:grid-cols-3" aria-label="Project verification summary">
            {[
              { label: "Needs action", value: needsActionCount, icon: RotateCcw },
              { label: "Awaiting admin", value: pending.length, icon: Clock3 },
              { label: "Verified proof", value: verified.length, icon: CheckCircle2 }
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
            cards={reviewCards}
            revisionAction={data.capabilities.canReviseEvidence ? reviseEvidenceAction : undefined}
            returnTo="/partner/activity"
            readOnlyNote="This board tracks project donation evidence only. Use Expeditions for trips, departures, and participant requests."
            emptyMessage="No project verification items are available yet. Use Submit proof to post field photos, reports, or progress notes."
          />
        </div>
      </FormTabs>
    </div>
  );
}
