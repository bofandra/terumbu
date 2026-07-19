import { AlertTriangle, ExternalLink, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { evidenceVerificationStatuses, evidenceStatusLabel } from "@/lib/evidence-review-workflow";
import { cn } from "@/lib/utils";

type FormAction = (formData: FormData) => void | Promise<void>;

type KanbanDetail = {
  label: string;
  value: string;
};

export type EvidenceKanbanEvent = {
  id?: string;
  label: string;
  actor: string;
  occurredAt: Date;
  note?: string | null;
};

export type EvidenceKanbanEvidence = {
  id: string;
  title: string;
  evidenceCode: string;
  evidenceType: string;
  verificationStatus: string;
  statusLabel: string;
  assignedReviewerUserId?: string | null;
  fileUrl?: string | null;
  sourceHref?: string | null;
  stageLabel?: string | null;
  metricLabel?: string | null;
  metricValue?: string | number | null;
  latestReviewNote?: string | null;
  reviewEvents?: EvidenceKanbanEvent[];
};

export type EvidenceKanbanCard = {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  href?: string;
  tag?: string;
  chips?: string[];
  note?: string | null;
  details: KanbanDetail[];
  evidence: EvidenceKanbanEvidence[];
};

const evidenceColumns = [
  { id: "no_evidence", label: "No evidence", description: "Campaign evidence not submitted" },
  { id: "submitted", label: "Submitted", description: "Ready for admin review" },
  { id: "in_review", label: "In review", description: "Admin review in progress" },
  { id: "needs_clarification", label: "Needs clarification", description: "Partner action required" },
  { id: "verified", label: "Verified", description: "Evidence accepted" },
  { id: "rejected", label: "Rejected", description: "Evidence not accepted" }
];

function evidenceColumnId(evidence: { verificationStatus: string }[]) {
  if (evidence.length === 0) {
    return "no_evidence";
  }

  if (evidence.some((item) => item.verificationStatus === "rejected")) {
    return "rejected";
  }

  if (evidence.some((item) => item.verificationStatus === "needs_clarification")) {
    return "needs_clarification";
  }

  if (evidence.some((item) => item.verificationStatus === "submitted")) {
    return "submitted";
  }

  if (evidence.some((item) => item.verificationStatus === "in_review")) {
    return "in_review";
  }

  return "verified";
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

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function evidenceCanBeRevised(status: string) {
  return status === "needs_clarification" || status === "rejected";
}

export function EvidenceKanbanBoard({
  cards,
  reviewAction,
  revisionAction,
  returnTo,
  readOnlyNote,
  emptyMessage = "No campaign cards available for this board."
}: {
  cards: EvidenceKanbanCard[];
  reviewAction?: FormAction;
  revisionAction?: FormAction;
  returnTo: string;
  readOnlyNote?: string;
  emptyMessage?: string;
}) {
  return (
    <section className="overflow-x-auto pb-3" aria-label="Evidence review kanban columns">
      <div className="grid min-w-[1584px] grid-cols-6 gap-4">
        {evidenceColumns.map((column) => {
          const columnCards = cards.filter((card) => evidenceColumnId(card.evidence) === column.id);

          return (
            <section key={column.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-3" aria-labelledby={`column-${column.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id={`column-${column.id}`} className="font-bold text-ocean-900">{column.label}</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">{column.description}</p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-ocean-900 ring-1 ring-ocean-900/10">
                  {columnCards.length.toLocaleString("id-ID")}
                </span>
              </div>

              <div className="mt-3 grid gap-3">
                {columnCards.map((card) => {
                  const verifiedEvidence = card.evidence.filter((item) => item.verificationStatus === "verified").length;
                  const pendingEvidence = card.evidence.length - verifiedEvidence;

                  return (
                    <article key={card.id} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-normal text-ocean-900/46">{card.code}</p>
                          <h3 className="mt-2 text-base font-bold leading-6 text-ocean-900">{card.title}</h3>
                          <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">{card.subtitle}</p>
                        </div>
                        {card.tag ? (
                          <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold capitalize text-ocean-700">
                            {card.tag}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.href ? (
                          <Link href={card.href} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-coral-100 px-3 text-xs font-bold text-coral-700 hover:bg-coral-500 hover:text-white">
                            Campaign
                            <ExternalLink size={13} aria-hidden="true" />
                          </Link>
                        ) : null}
                        {card.chips?.map((chip) => (
                          <span key={chip} className="inline-flex min-h-8 items-center rounded-full bg-sand-100 px-3 text-xs font-bold text-ocean-900">
                            {chip}
                          </span>
                        ))}
                      </div>

                      <dl className="mt-4 grid gap-2 text-sm">
                        {card.details.map((detail) => (
                          <div key={detail.label} className="flex justify-between gap-3">
                            <dt className="font-semibold text-ocean-900/58">{detail.label}</dt>
                            <dd className="text-right font-bold text-ocean-900">{detail.value}</dd>
                          </div>
                        ))}
                      </dl>

                      {card.note ? <p className="mt-3 text-xs font-semibold leading-5 text-ocean-900/58">{card.note}</p> : null}

                      <div className="mt-4 border-t border-ocean-900/10 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-ocean-900">Campaign evidence</p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-xs font-bold",
                              card.evidence.length === 0 ? "bg-sand-100 text-ocean-900/62" : pendingEvidence > 0 ? "bg-coral-100 text-coral-700" : "bg-kelp-100 text-kelp-700"
                            )}
                          >
                            {card.evidence.length === 0 ? "No evidence" : pendingEvidence > 0 ? `${pendingEvidence} pending` : "Clear"}
                          </span>
                        </div>

                        <div className="mt-3 divide-y divide-ocean-900/10">
                          {card.evidence.map((evidence) => (
                            <div key={`${card.id}-${evidence.id}`} className="py-3 first:pt-0 last:pb-0">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <p className="font-bold leading-5 text-ocean-900">{evidence.title}</p>
                                  <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">
                                    {evidence.evidenceCode} / {evidence.evidenceType}
                                    {evidence.stageLabel ? ` / ${evidence.stageLabel}` : ""}
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

                              {evidence.latestReviewNote ? (
                                <p className="mt-2 rounded-lg bg-coral-100 px-2 py-1.5 text-xs font-semibold leading-5 text-coral-700">
                                  Latest note: {evidence.latestReviewNote}
                                </p>
                              ) : null}

                              <div className="mt-2 flex flex-wrap gap-2">
                                {evidence.sourceHref ? (
                                  <Link href={evidence.sourceHref} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-ocean-50 px-3 text-xs font-bold text-ocean-900 hover:bg-sand-100">
                                    Source
                                    <ExternalLink size={13} aria-hidden="true" />
                                  </Link>
                                ) : null}
                                {evidence.fileUrl ? (
                                  <Link href={evidence.fileUrl} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-ocean-50 px-3 text-xs font-bold text-ocean-900 hover:bg-sand-100">
                                    File
                                    <ExternalLink size={13} aria-hidden="true" />
                                  </Link>
                                ) : null}
                              </div>

                              {reviewAction ? (
                                <form action={reviewAction} className="mt-3 grid gap-2">
                                  <input type="hidden" name="evidenceId" value={evidence.id} />
                                  <input type="hidden" name="redirectTo" value={returnTo} />
                                  <label className="grid gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                    Review status
                                    <select name="status" defaultValue={evidence.verificationStatus} className="min-h-10 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold normal-case text-ocean-900 outline-none">
                                      {evidenceVerificationStatuses.map((status) => (
                                        <option key={status} value={status}>{evidenceStatusLabel(status)}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className="grid gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                    Reviewer
                                    <select name="reviewerAssignment" defaultValue={evidence.assignedReviewerUserId ? "keep" : "assign_me"} className="min-h-10 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold normal-case text-ocean-900 outline-none">
                                      <option value="assign_me">Assign to me</option>
                                      <option value="keep">Keep current</option>
                                      <option value="clear">Clear assignment</option>
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
                                    Save review
                                  </Button>
                                </form>
                              ) : null}

                              {!reviewAction && revisionAction && evidenceCanBeRevised(evidence.verificationStatus) ? (
                                <form action={revisionAction} className="mt-3 grid gap-2 rounded-lg bg-sand-50 p-3">
                                  <input type="hidden" name="evidenceId" value={evidence.id} />
                                  <input type="hidden" name="redirectTo" value={returnTo} />
                                  <label className="grid gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                    Title
                                    <input name="title" defaultValue={evidence.title} className="min-h-10 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold normal-case text-ocean-900 outline-none" required />
                                  </label>
                                  <label className="grid gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                    Response note
                                    <textarea name="body" placeholder="Explain what changed in this revision." className="min-h-20 rounded-lg border border-ocean-900/12 bg-white px-3 py-2 text-sm font-semibold leading-6 normal-case text-ocean-900 outline-none" />
                                  </label>
                                  <label className="grid gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                    Replace file
                                    <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="min-h-10 rounded-lg border border-ocean-900/12 bg-white px-3 py-2 text-sm font-semibold normal-case text-ocean-900 outline-none" required />
                                  </label>
                                  <Button type="submit" className="min-h-10 px-4 py-2 text-xs">
                                    <RotateCcw size={15} aria-hidden="true" />
                                    {evidence.verificationStatus === "needs_clarification" ? "Submit clarification" : "Resubmit evidence"}
                                  </Button>
                                </form>
                              ) : null}

                              {readOnlyNote && !reviewAction ? (
                                <p className="mt-3 rounded-lg bg-ocean-50 px-3 py-2 text-xs font-semibold leading-5 text-ocean-900/62">
                                  {readOnlyNote}
                                </p>
                              ) : null}

                              {evidence.reviewEvents?.length ? (
                                <details className="mt-3 rounded-lg bg-sand-50 px-3 py-2">
                                  <summary className="cursor-pointer text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                    Audit trail
                                  </summary>
                                  <div className="mt-2 grid gap-2">
                                    {evidence.reviewEvents.slice(-4).map((event, index) => (
                                      <div key={event.id ?? `${evidence.id}-${index}`} className="rounded-lg bg-white px-3 py-2">
                                        <p className="text-xs font-bold text-ocean-900">{event.label}</p>
                                        <p className="mt-1 text-xs text-ocean-900/52">{event.actor} / {formatDate(event.occurredAt)}</p>
                                        {event.note ? <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/62">{event.note}</p> : null}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ) : null}
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
                  );
                })}

                {columnCards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white/70 p-4 text-sm font-semibold leading-6 text-ocean-900/58">
                    No campaign cards in this column.
                  </div>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      {cards.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold leading-6 text-ocean-900/62 shadow-soft">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 text-coral-500" />
            <p>{emptyMessage}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
