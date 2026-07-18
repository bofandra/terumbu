import { AlertTriangle, ArrowRight, CircleDollarSign, ExternalLink, FileCheck2, Kanban, MessageSquare, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { updateCorporateEvidenceStatusAction } from "@/lib/corporate-actions";
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

const contributionColumns = [
  { id: "pledged", label: "Pledged", description: "Funding intent logged" },
  { id: "committed", label: "Committed", description: "Approved support" },
  { id: "disbursed", label: "Disbursed", description: "Funds released" },
  { id: "verified", label: "Verified", description: "Funding verified" },
  { id: "cancelled", label: "Cancelled", description: "No longer active" }
];

const evidenceStatuses = [
  { value: "submitted", label: "Submitted" },
  { value: "in_review", label: "In review" },
  { value: "needs_clarification", label: "Needs clarification" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" }
];

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function contributionColumnId(status: string) {
  return contributionColumns.some((column) => column.id === status) ? status : "committed";
}

function evidenceStatusClass(status: string) {
  if (status === "verified") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "needs_clarification" || status === "rejected") {
    return "bg-coral-100 text-coral-700";
  }

  if (status === "in_review") {
    return "bg-ocean-50 text-ocean-700";
  }

  return "bg-sand-100 text-ocean-900/62";
}

function contributionTypeLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function CorporateBoardPage({ searchParams }: CorporateBoardPageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/board");
  const data = await requireCorporateDashboardData(user.id, "/corporate/board", params?.programId);
  const currentBoardHref = `/corporate/board?programId=${encodeURIComponent(data.program.programId)}`;
  const canVerifyEvidence = data.capabilities.canUpdateEvidenceStatus;

  const evidenceByCampaign = new Map<string, typeof data.evidenceReviewQueue>();

  for (const evidence of data.evidenceReviewQueue) {
    const rows = evidenceByCampaign.get(evidence.campaignId) ?? [];
    rows.push(evidence);
    evidenceByCampaign.set(evidence.campaignId, rows);
  }

  const fundingCards = data.contributions.map((contribution) => {
    const evidence = evidenceByCampaign.get(contribution.campaignId) ?? [];
    const verifiedEvidence = evidence.filter((item) => item.verificationStatus === "verified").length;
    const pendingEvidence = evidence.length - verifiedEvidence;

    return {
      ...contribution,
      columnId: contributionColumnId(contribution.status),
      evidence,
      verifiedEvidence,
      pendingEvidence
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
            One board represents one corporate program. Each card is one funding contribution, tagged to its campaign, with submitted campaign evidence ready for corporate review.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/corporate/projects?programId=${encodeURIComponent(data.program.programId)}`} tone="ghost">
            Funded Campaigns
            <ArrowRight size={17} aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href={`/corporate/funding?programId=${encodeURIComponent(data.program.programId)}`} tone="secondary">
            Funding
            <CircleDollarSign size={17} aria-hidden="true" />
          </ButtonLink>
        </div>
      </div>

      {params?.saved ? (
        <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Evidence review saved on this board.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Board action could not be saved with the current input or permission.</p>
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
          { label: "Funding cards", value: fundingCards.length.toLocaleString("id-ID"), icon: Kanban },
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

      <section className="mt-6 overflow-x-auto pb-3" aria-label="Funding kanban columns">
        <div className="grid min-w-[1320px] grid-cols-5 gap-4">
          {contributionColumns.map((column) => {
            const cards = fundingCards.filter((card) => card.columnId === column.id);

            return (
              <section key={column.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3" aria-labelledby={`column-${column.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id={`column-${column.id}`} className="font-bold text-ocean-900">{column.label}</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">{column.description}</p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-ocean-900 ring-1 ring-ocean-900/10">
                    {cards.length.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="mt-3 grid gap-3">
                  {cards.map((card) => (
                    <article key={card.id} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-normal text-ocean-900/46">{card.referenceCode}</p>
                          <h3 className="mt-2 text-base font-bold leading-6 text-ocean-900">{card.campaignTitle}</h3>
                        </div>
                        <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold capitalize text-ocean-700">
                          {contributionTypeLabel(card.contributionType)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link href={`/campaigns/${card.campaignSlug}`} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-coral-100 px-3 text-xs font-bold text-coral-700 hover:bg-coral-500 hover:text-white">
                          Campaign
                          <ExternalLink size={13} aria-hidden="true" />
                        </Link>
                        <span className="inline-flex min-h-8 items-center rounded-full bg-sand-100 px-3 text-xs font-bold text-ocean-900">
                          {card.publicGoalLabel}
                        </span>
                      </div>

                      <dl className="mt-4 grid gap-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="font-semibold text-ocean-900/58">Amount</dt>
                          <dd className="font-bold text-ocean-900">{formatCurrency(card.amountValue)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="font-semibold text-ocean-900/58">Contribution date</dt>
                          <dd className="font-bold text-ocean-900">{formatDate(card.contributionDate)}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="font-semibold text-ocean-900/58">Evidence</dt>
                          <dd className="font-bold text-ocean-900">{card.verifiedEvidence}/{card.evidence.length} verified</dd>
                        </div>
                      </dl>

                      {card.notes ? <p className="mt-3 text-xs font-semibold leading-5 text-ocean-900/58">{card.notes}</p> : null}

                      <div className="mt-4 border-t border-ocean-900/10 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-ocean-900">Campaign evidence</p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-xs font-bold",
                              card.evidence.length === 0 ? "bg-sand-100 text-ocean-900/62" : card.pendingEvidence > 0 ? "bg-coral-100 text-coral-700" : "bg-kelp-100 text-kelp-700"
                            )}
                          >
                            {card.evidence.length === 0 ? "No evidence" : card.pendingEvidence > 0 ? `${card.pendingEvidence} pending` : "Clear"}
                          </span>
                        </div>

                        <div className="mt-3 divide-y divide-ocean-900/10">
                          {card.evidence.map((evidence) => (
                            <div key={`${card.id}-${evidence.id}`} className="py-3 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-bold leading-5 text-ocean-900">{evidence.title}</p>
                                  <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">
                                    {evidence.evidenceCode} · {evidence.evidenceType} · {evidence.stageLabel}
                                  </p>
                                </div>
                                <span className={cn("rounded-full px-2 py-1 text-xs font-bold", evidenceStatusClass(evidence.verificationStatus))}>
                                  {evidence.statusLabel}
                                </span>
                              </div>

                              {evidence.metricLabel && evidence.metricValue ? (
                                <p className="mt-2 inline-flex rounded-lg bg-sand-100 px-2 py-1 text-xs font-bold text-ocean-900">
                                  {evidence.metricLabel}: {evidence.metricValue}
                                </p>
                              ) : null}

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Link href={evidence.sourceHref} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-ocean-50 px-3 text-xs font-bold text-ocean-900 hover:bg-sand-100">
                                  Source
                                  <ExternalLink size={13} aria-hidden="true" />
                                </Link>
                                <Link href={evidence.fileUrl} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-ocean-50 px-3 text-xs font-bold text-ocean-900 hover:bg-sand-100">
                                  File
                                  <ExternalLink size={13} aria-hidden="true" />
                                </Link>
                              </div>

                              {canVerifyEvidence ? (
                                <form action={updateCorporateEvidenceStatusAction} className="mt-3 grid gap-2">
                                  <input type="hidden" name="programId" value={data.program.programId} />
                                  <input type="hidden" name="evidenceId" value={evidence.id} />
                                  <input type="hidden" name="returnTo" value={currentBoardHref} />
                                  <label className="grid gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                    Review status
                                    <select name="verificationStatus" defaultValue={evidence.verificationStatus} className="min-h-10 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold normal-case text-ocean-900 outline-none">
                                      {evidenceStatuses.map((status) => (
                                        <option key={status.value} value={status.value}>{status.label}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <textarea
                                    name="reviewNote"
                                    defaultValue={evidence.latestReviewNote ?? ""}
                                    placeholder="Note required for clarification or rejection"
                                    className="min-h-20 rounded-lg border border-ocean-900/12 bg-white px-3 py-2 text-sm font-semibold leading-6 text-ocean-900 outline-none"
                                  />
                                  <Button type="submit" tone="secondary" className="min-h-10 px-4 py-2 text-xs">
                                    <ShieldCheck size={15} aria-hidden="true" />
                                    Save Review
                                  </Button>
                                </form>
                              ) : (
                                <p className="mt-3 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-semibold leading-5 text-ocean-900/62">
                                  Your corporate role can inspect evidence but cannot change verification status.
                                </p>
                              )}
                            </div>
                          ))}
                          {card.evidence.length === 0 ? (
                            <p className="py-3 text-xs font-semibold leading-5 text-ocean-900/56">
                              No evidence has been submitted for this campaign yet.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}

                  {cards.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white/70 p-4 text-sm font-semibold leading-6 text-ocean-900/58">
                      No funding cards in this column.
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </section>

      {fundingCards.length === 0 ? (
        <section className="mt-6 rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold leading-6 text-ocean-900/62 shadow-soft">
          <div className="flex items-start gap-3">
            <MessageSquare size={20} aria-hidden="true" className="mt-0.5 text-coral-500" />
            <p>
              This program has no funding cards yet. Create a campaign contribution from Funded Campaigns, then the card will appear on this board automatically.
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
