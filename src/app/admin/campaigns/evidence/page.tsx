import { AlertTriangle, FileCheck2, Kanban, MessageSquare, ShieldCheck } from "lucide-react";

import { AdminPageHeader } from "@/components/admin-ui";
import { EvidenceKanbanBoard, type EvidenceKanbanCard } from "@/components/evidence-kanban-board";
import { requireRole } from "@/lib/auth";
import { verifyEvidenceAction } from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Admin Campaign Evidence"
};

export const dynamic = "force-dynamic";

type AdminCampaignEvidencePageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

const statusMessages: Record<string, string> = {
  evidence: "Evidence review status updated.",
  "review-note": "Add a review note for clarification or rejection.",
  "evidence-missing": "Evidence record was not found."
};

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

export default async function AdminCampaignEvidencePage({ searchParams }: AdminCampaignEvidencePageProps) {
  const params = await searchParams;

  await requireRole(["admin"], "/admin/campaigns/evidence");
  const data = await getAdminPortalData();

  const pendingCount = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const clarificationCount = data.evidence.filter((item) => item.verificationStatus === "needs_clarification").length;
  const submittedCount = data.evidence.filter((item) => item.verificationStatus === "submitted").length;
  const verifiedCount = data.evidence.filter((item) => item.verificationStatus === "verified").length;
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
  const savedMessage = params?.saved ? statusMessages[params.saved] ?? "Evidence review saved." : null;
  const errorMessage = params?.error ? statusMessages[params.error] ?? "Evidence status could not be saved with the current input or permission." : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns / Evidence"
        title="Evidence kanban"
        description="Review partner-submitted field records by campaign. Admin platform is the single place for evidence status decisions."
        actionHref="/admin/campaigns"
        actionLabel="Campaigns"
      />

      {savedMessage ? (
        <p className="rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p>
      ) : null}
      {errorMessage ? (
        <p className="rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-5" aria-label="Evidence summary">
        {[
          { label: "Campaign cards", value: campaignCards.length.toLocaleString("id-ID"), icon: Kanban },
          { label: "Submitted", value: submittedCount.toLocaleString("id-ID"), icon: FileCheck2 },
          { label: "Needs decision", value: pendingCount.toLocaleString("id-ID"), icon: AlertTriangle },
          { label: "Clarification", value: clarificationCount.toLocaleString("id-ID"), icon: MessageSquare },
          { label: "Verified", value: verifiedCount.toLocaleString("id-ID"), icon: ShieldCheck }
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <Icon className="size-5 text-coral-500" aria-hidden="true" />
              <p className="mt-3 text-sm font-bold text-ocean-900/58">{item.label}</p>
              <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
            </article>
          );
        })}
      </section>

      <EvidenceKanbanBoard
        cards={campaignCards}
        reviewAction={verifyEvidenceAction}
        returnTo="/admin/campaigns/evidence"
        emptyMessage="No campaign evidence cards are available yet. Partner submissions will appear here when field teams upload photos, survey notes, or verification records."
      />
    </div>
  );
}
