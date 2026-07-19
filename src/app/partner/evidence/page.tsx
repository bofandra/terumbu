import { Camera, FileCheck2, Kanban, MessageSquare, RotateCcw } from "lucide-react";

import { EvidenceKanbanBoard, type EvidenceKanbanCard } from "@/components/evidence-kanban-board";
import { PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { reviseEvidenceAction } from "@/lib/portal-actions";
import { getPartnerPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Partner Evidence"
};

export const dynamic = "force-dynamic";

type PartnerEvidencePageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

const statusMessages: Record<string, string> = {
  "evidence-resubmitted": "Evidence revision submitted for admin review.",
  "evidence-revision": "Complete the title and replacement evidence file.",
  "evidence-missing": "Evidence record was not found.",
  "evidence-state": "This evidence is not waiting for partner revision."
};

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

export default async function PartnerEvidencePage({ searchParams }: PartnerEvidencePageProps) {
  const params = await searchParams;
  const user = await requireRole(["partner", "admin"], "/partner/evidence");
  const data = await getPartnerPortalData(user.id);
  const pending = data.evidence.filter((item) => item.verificationStatus === "submitted" || item.verificationStatus === "in_review");
  const needsResponse = data.evidence.filter((item) => item.verificationStatus === "needs_clarification" || item.verificationStatus === "rejected");
  const verified = data.evidence.filter((item) => item.verificationStatus === "verified");
  const evidenceByCampaign = new Map<string, typeof data.evidence>();

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
        { label: "Evidence", value: `${verifiedEvidence}/${evidence.length} verified` }
      ],
      evidence
    };
  });
  const savedMessage = params?.saved ? statusMessages[params.saved] ?? "Evidence saved." : null;
  const errorMessage = params?.error ? statusMessages[params.error] ?? "Evidence could not be saved with the current input or permission." : null;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Evidence kanban"
        description="Track evidence status by campaign, respond to admin clarification requests, and resubmit without creating duplicates."
        actionHref="/partner/activity"
        actionLabel="Submit activity"
      />

      {savedMessage ? (
        <p className="rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="Evidence status summary">
        {[
          { label: "Campaign cards", value: campaignCards.length, icon: Kanban },
          { label: "Evidence records", value: data.evidence.length, icon: FileCheck2 },
          { label: "Pending review", value: pending.length, icon: MessageSquare },
          { label: "Needs response", value: needsResponse.length, icon: RotateCcw },
          { label: "Verified", value: verified.length, icon: Camera }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
                  <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value.toLocaleString("id-ID")}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg bg-ocean-50 text-ocean-700"><Icon className="size-5" aria-hidden="true" /></span>
              </div>
            </article>
          );
        })}
      </section>

      <EvidenceKanbanBoard
        cards={campaignCards}
        revisionAction={data.capabilities.canReviseEvidence ? reviseEvidenceAction : undefined}
        returnTo="/partner/evidence"
        readOnlyNote="Evidence status is managed in the Admin platform. Partner users can inspect review state here and revise only when admin asks for clarification or rejects evidence."
        emptyMessage="No campaign evidence cards are available yet. Use the Activity page to submit verification photos, field reports, or other records."
      />
    </div>
  );
}
