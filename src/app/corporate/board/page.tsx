import { AlertTriangle, ArrowRight, CircleDollarSign, FileCheck2, Kanban } from "lucide-react";
import Link from "next/link";

import { EvidenceKanbanBoard, type EvidenceKanbanCard } from "@/components/evidence-kanban-board";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Corporate Kanban Board"
};

export const dynamic = "force-dynamic";

type CorporateBoardPageProps = {
  searchParams?: Promise<{
    error?: string;
    programId?: string;
    saved?: string;
  }>;
};

function contributionTypeLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function CorporateBoardPage({ searchParams }: CorporateBoardPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/board");
  const data = await requireCorporateDashboardData(user.id, "/corporate/board", params?.programId);

  const evidenceByCampaign = new Map<string, typeof data.evidenceReviewQueue>();

  for (const evidence of data.evidenceReviewQueue) {
    const rows = evidenceByCampaign.get(evidence.campaignId) ?? [];
    rows.push(evidence);
    evidenceByCampaign.set(evidence.campaignId, rows);
  }

  const fundingCards: EvidenceKanbanCard[] = data.portfolio.map((funding) => {
    const evidence = evidenceByCampaign.get(funding.campaignId) ?? [];
    const ledgerContribution = funding.contributions[0] ?? null;
    const verifiedEvidence = evidence.filter((item) => item.verificationStatus === "verified").length;

    return {
      id: funding.campaignId,
      title: funding.campaignTitle,
      subtitle: `${funding.organizationName} / ${funding.region}`,
      code: ledgerContribution?.referenceCode ?? funding.campaignSlug,
      href: `/campaigns/${funding.campaignSlug}`,
      tag: ledgerContribution ? contributionTypeLabel(ledgerContribution.contributionType) : "allocation",
      chips: [ledgerContribution?.publicGoalLabel ?? "Corporate reporting"],
      note: ledgerContribution?.notes ?? null,
      details: [
        { label: "Allocation", value: formatCurrency(funding.allocationValue) },
        { label: "Ledger", value: formatCurrency(funding.contributionTotal) },
        { label: "Evidence", value: `${verifiedEvidence}/${evidence.length} verified` }
      ],
      evidence
    };
  });

  const pendingEvidenceCount = data.evidenceReviewQueue.filter((item) => item.verificationStatus !== "verified").length;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Kanban board</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.program.programName}</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-ocean-900/62">
            One board represents one corporate program. Each card is one campaign funding allocation, grouped by the current evidence review status for that campaign.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/corporate/projects?programId=${encodeURIComponent(data.program.programId)}`} tone="ghost">
            Funded Campaigns
            <ArrowRight size={17} aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href={`/corporate/funding?programId=${encodeURIComponent(data.program.programId)}`} tone="secondary">
            Finance
            <CircleDollarSign size={17} aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>

      {params?.saved ? (
        <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">
          Evidence review saved on this board.
        </p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">
          {params.error === "admin-only" ? "Evidence status is managed in the Admin platform." : "Board action could not be saved with the current input or permission."}
        </p>
      ) : null}

      <section className="mt-6 border-y border-ocean-900/10 bg-white/70 py-4" aria-label="Program boards">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg bg-ocean-900 px-3 py-2 text-sm font-bold text-white">
            <Kanban size={17} aria-hidden="true" />
            Boards
          </span>
          {data.programOptions.map((program) => {
            const current = program.programId === data.program.programId;

            return (
              <Link
                key={program.programId}
                href={`/corporate/board?programId=${encodeURIComponent(program.programId)}`}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-10 items-center rounded-lg border px-3 text-sm font-bold transition",
                  current ? "border-coral-500 bg-coral-100 text-coral-700" : "border-ocean-900/10 bg-white text-ocean-900 hover:bg-ocean-50"
                )}
              >
                {program.programName}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          { label: "Campaign cards", value: fundingCards.length.toLocaleString("id-ID"), icon: Kanban },
          { label: "Program budget", value: formatCurrency(data.financials.committedFunding), icon: CircleDollarSign },
          { label: "Evidence submitted", value: data.evidenceReviewQueue.length.toLocaleString("id-ID"), icon: FileCheck2 },
          { label: "Needs review", value: pendingEvidenceCount.toLocaleString("id-ID"), icon: AlertTriangle }
        ].map((metric) => {
          const Icon = metric.icon;

          return (
            <article key={metric.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
              <Icon size={20} aria-hidden="true" className="text-coral-500" />
              <p className="mt-3 text-sm font-bold text-ocean-900/56">{metric.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{metric.value}</p>
            </article>
          );
        })}
      </section>

      <div className="mt-6">
        <EvidenceKanbanBoard
          cards={fundingCards}
          returnTo={`/corporate/board?programId=${encodeURIComponent(data.program.programId)}`}
          readOnlyNote="Evidence status is managed in the Admin platform. Corporate users can inspect the source, file, and audit trail here."
          emptyMessage="This program has no campaign funding allocations yet. Create a funded campaign allocation, then the card will appear on this board automatically."
        />
      </div>
    </main>
  );
}
