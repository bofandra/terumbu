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

export type EvidenceKanbanLane = "needs_action" | "awaiting_review" | "verified";

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
  observation?: string | null;
  reviewEvents?: EvidenceKanbanEvent[];
};

export type EvidenceKanbanCard = {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  tag?: string;
  chips?: string[];
  note?: string | null;
  details?: KanbanDetail[];
  evidence: EvidenceKanbanEvidence[];
  lane?: EvidenceKanbanLane;
  campaignTitle?: string;
  campaignHref?: string;
  context?: string | null;
};

const evidenceColumns: { id: EvidenceKanbanLane; label: string; description: string }[] = [
  { id: "needs_action", label: "Needs action", description: "Submit or revise proof" },
  { id: "awaiting_review", label: "Awaiting admin review", description: "Already sent to admin" },
  { id: "verified", label: "Verified", description: "Accepted evidence" }
];

function evidenceLaneId(evidence: { verificationStatus: string }[]): EvidenceKanbanLane {
  if (evidence.length === 0) {
    return "needs_action";
  }

  if (evidence.some((item) => item.verificationStatus === "needs_clarification" || item.verificationStatus === "rejected")) {
    return "needs_action";
  }

  if (evidence.some((item) => item.verificationStatus === "submitted" || item.verificationStatus === "in_review")) {
    return "awaiting_review";
  }

  return "verified";
}

function cardLaneId(card: EvidenceKanbanCard) {
  return card.lane ?? evidenceLaneId(card.evidence);
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

function cardNoteClass(lane: EvidenceKanbanLane) {
  if (lane === "needs_action") {
    return "bg-coral-100 text-coral-700";
  }

  if (lane === "verified") {
    return "bg-kelp-100 text-kelp-700";
  }

  return "bg-ocean-50 text-ocean-700";
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
  emptyMessage = "No project verification items are available for this board."
}: {
  cards: EvidenceKanbanCard[];
  reviewAction?: FormAction;
  revisionAction?: FormAction;
  returnTo: string;
  readOnlyNote?: string;
  emptyMessage?: string;
}) {
  return (
    <section className="overflow-x-auto pb-3" aria-label="Project verification swimlane">
      {readOnlyNote ? (
        <p className="mb-4 rounded-lg bg-ocean-50 px-4 py-3 text-sm font-semibold leading-6 text-ocean-900/68">
          {readOnlyNote}
        </p>
      ) : null}

      <div className="grid min-w-[960px] grid-cols-3 gap-4">
        {evidenceColumns.map((column) => {
          const columnCards = cards.filter((card) => cardLaneId(card) === column.id);

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
                  const lane = cardLaneId(card);
                  const primaryEvidence = card.evidence[0];

                  return (
                    <article key={card.id} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-normal text-ocean-900/46">{card.code}</p>
                          <h3 className="mt-2 text-base font-bold leading-6 text-ocean-900">{card.title}</h3>
                          <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">{card.subtitle}</p>
                        </div>
                        {card.tag ? (
                          <span className={cn("rounded-full px-3 py-1 text-xs font-bold capitalize", evidenceStatusClass(primaryEvidence?.verificationStatus ?? lane))}>
                            {card.tag}
                          </span>
                        ) : null}
                      </div>

                      {card.note ? (
                        <p className={cn("mt-3 rounded-lg px-3 py-2 text-xs font-semibold leading-5", cardNoteClass(lane))}>
                          {card.note}
                        </p>
                      ) : null}

                      {card.chips?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {card.chips.map((chip) => (
                            <span key={chip} className="inline-flex min-h-8 items-center rounded-full bg-sand-100 px-3 text-xs font-bold text-ocean-900">
                              {chip}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {card.details?.length ? (
                        <dl className="mt-4 grid gap-2 text-sm">
                          {card.details.map((detail) => (
                            <div key={detail.label} className="flex justify-between gap-3">
                              <dt className="font-semibold text-ocean-900/58">{detail.label}</dt>
                              <dd className="text-right font-bold text-ocean-900">{detail.value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}

                      {primaryEvidence ? (
                        <div className="mt-4 rounded-lg bg-sand-50 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold uppercase tracking-normal text-ocean-900/46">Evidence item</p>
                              <p className="mt-1 font-bold leading-5 text-ocean-900">{primaryEvidence.title}</p>
                              <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/54">
                                {primaryEvidence.evidenceType}
                                {primaryEvidence.stageLabel ? ` / ${primaryEvidence.stageLabel}` : ""}
                              </p>
                            </div>
                            <span className={cn("rounded-full px-2 py-1 text-xs font-bold", evidenceStatusClass(primaryEvidence.verificationStatus))}>
                              {primaryEvidence.statusLabel}
                            </span>
                          </div>

                          {primaryEvidence.metricLabel && primaryEvidence.metricValue ? (
                            <p className="mt-2 inline-flex rounded-lg bg-white px-2 py-1 text-xs font-bold text-ocean-900">
                              {primaryEvidence.metricLabel}: {primaryEvidence.metricValue}
                            </p>
                          ) : null}

                          {primaryEvidence.latestReviewNote && primaryEvidence.latestReviewNote !== card.note ? (
                            <p className="mt-2 rounded-lg bg-coral-100 px-2 py-1.5 text-xs font-semibold leading-5 text-coral-700">
                              Latest note: {primaryEvidence.latestReviewNote}
                            </p>
                          ) : null}

                          {primaryEvidence.observation ? (
                            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-ocean-900/62">
                              {primaryEvidence.observation}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {primaryEvidence.sourceHref ? (
                              <Link href={primaryEvidence.sourceHref} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-bold text-ocean-900 hover:bg-ocean-50">
                                Source
                                <ExternalLink size={13} aria-hidden="true" />
                              </Link>
                            ) : null}
                            {primaryEvidence.fileUrl ? (
                              <Link href={primaryEvidence.fileUrl} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white px-3 text-xs font-bold text-ocean-900 hover:bg-ocean-50">
                                File
                                <ExternalLink size={13} aria-hidden="true" />
                              </Link>
                            ) : null}
                          </div>

                          {reviewAction ? (
                            <form action={reviewAction} className="mt-3 grid min-w-0 gap-2">
                              <input type="hidden" name="evidenceId" value={primaryEvidence.id} />
                              <input type="hidden" name="redirectTo" value={returnTo} />
                              <label className="grid min-w-0 gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                Review status
                                <select name="status" defaultValue={primaryEvidence.verificationStatus} className="min-h-10 w-full min-w-0 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold normal-case text-ocean-900 outline-none">
                                  {evidenceVerificationStatuses.map((status) => (
                                    <option key={status} value={status}>{evidenceStatusLabel(status)}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid min-w-0 gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                Reviewer
                                <select name="reviewerAssignment" defaultValue={primaryEvidence.assignedReviewerUserId ? "keep" : "assign_me"} className="min-h-10 w-full min-w-0 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold normal-case text-ocean-900 outline-none">
                                  <option value="assign_me">Assign to me</option>
                                  <option value="keep">Keep current</option>
                                  <option value="clear">Clear assignment</option>
                                </select>
                              </label>
                              <textarea
                                name="reviewNote"
                                defaultValue={primaryEvidence.latestReviewNote ?? ""}
                                placeholder="Note required for clarification or rejection"
                                className="min-h-20 w-full min-w-0 rounded-lg border border-ocean-900/12 bg-white px-3 py-2 text-sm font-semibold leading-6 text-ocean-900 outline-none"
                              />
                              <Button type="submit" tone="secondary" className="min-h-10 px-4 py-2 text-xs">
                                <ShieldCheck size={15} aria-hidden="true" />
                                Save review
                              </Button>
                            </form>
                          ) : null}

                          {!reviewAction && revisionAction && evidenceCanBeRevised(primaryEvidence.verificationStatus) ? (
                            <form action={revisionAction} encType="multipart/form-data" className="mt-3 grid min-w-0 gap-2 rounded-lg bg-white p-3">
                              <input type="hidden" name="evidenceId" value={primaryEvidence.id} />
                              <input type="hidden" name="redirectTo" value={returnTo} />
                              <label className="grid min-w-0 gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                Title
                                <input name="title" defaultValue={primaryEvidence.title} className="min-h-10 w-full min-w-0 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold normal-case text-ocean-900 outline-none" required />
                              </label>
                              <label className="grid min-w-0 gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                Response note
                                <textarea name="body" placeholder="Explain what changed in this revision." className="min-h-20 w-full min-w-0 rounded-lg border border-ocean-900/12 bg-white px-3 py-2 text-sm font-semibold leading-6 normal-case text-ocean-900 outline-none" />
                              </label>
                              <label className="grid min-w-0 gap-1 text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                Replace file
                                <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="min-h-10 w-full min-w-0 rounded-lg border border-ocean-900/12 bg-white px-3 py-2 text-sm font-semibold normal-case text-ocean-900 outline-none" required />
                              </label>
                              <Button type="submit" className="min-h-10 px-4 py-2 text-xs">
                                <RotateCcw size={15} aria-hidden="true" />
                                {primaryEvidence.verificationStatus === "needs_clarification" ? "Submit clarification" : "Resubmit activity"}
                              </Button>
                            </form>
                          ) : null}

                          {primaryEvidence.reviewEvents?.length ? (
                            <details className="mt-3 rounded-lg bg-white px-3 py-2">
                              <summary className="cursor-pointer text-xs font-bold uppercase tracking-normal text-ocean-900/50">
                                Audit trail
                              </summary>
                              <div className="mt-2 grid gap-2">
                                {primaryEvidence.reviewEvents.slice(-4).map((event, index) => (
                                  <div key={event.id ?? `${primaryEvidence.id}-${index}`} className="rounded-lg bg-sand-50 px-3 py-2">
                                    <p className="text-xs font-bold text-ocean-900">{event.label}</p>
                                    <p className="mt-1 text-xs text-ocean-900/52">{event.actor} / {formatDate(event.occurredAt)}</p>
                                    {event.note ? <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/62">{event.note}</p> : null}
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-3">
                          <p className="text-sm font-bold text-ocean-900">No verification proof yet.</p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-ocean-900/58">
                            Use the Submit tab to add a field photo, report, or progress proof for admin review.
                          </p>
                        </div>
                      )}

                      {card.campaignTitle || card.context || card.campaignHref ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ocean-900/10 pt-3 text-xs font-bold text-ocean-900/54">
                          {card.campaignTitle ? <span>Project: {card.campaignTitle}</span> : null}
                          {card.context ? <span>{card.context}</span> : null}
                          {card.campaignHref ? (
                            <Link href={card.campaignHref} className="inline-flex items-center gap-1 text-coral-700 hover:text-coral-500">
                              Project detail
                              <ExternalLink size={13} aria-hidden="true" />
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}

                {columnCards.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ocean-900/14 bg-white/70 p-4 text-sm font-semibold leading-6 text-ocean-900/58">
                    No verification items in this lane.
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
