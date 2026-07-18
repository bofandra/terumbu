import Link from "next/link";
import { CheckCircle2, ClipboardList, Clock3, ExternalLink, MessageSquare, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { requireCorporateDashboardData } from "@/lib/corporate-access";
import { updateCorporateEvidenceStatusAction } from "@/lib/corporate-actions";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Corporate Evidence"
};

export const dynamic = "force-dynamic";

type CorporateEvidencePageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function statusClass(status: string) {
  if (["Approved", "verified"].includes(status)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "Needs clarification" || status === "Rejected") {
    return "bg-coral-100 text-coral-700";
  }

  if (status === "In review") {
    return "bg-ocean-50 text-ocean-700";
  }

  return "bg-sand-100 text-ocean-900/62";
}

export default async function CorporateEvidencePage({ searchParams }: CorporateEvidencePageProps) {
  const params = await searchParams;
  const user = await requireUser("/corporate/evidence");
  const data = await requireCorporateDashboardData(user.id, "/corporate/evidence");
  const canUpdateEvidenceStatus = data.capabilities.canUpdateEvidenceStatus;

  const reviewStages = [
    { label: "Submitted", count: data.evidenceReviewQueue.filter((item) => item.reviewStage === "Submitted").length, icon: ClipboardList },
    { label: "In review", count: data.evidenceReviewQueue.filter((item) => item.reviewStage === "In review").length, icon: Clock3 },
    { label: "Needs clarification", count: data.evidenceReviewQueue.filter((item) => item.reviewStage === "Needs clarification").length, icon: MessageSquare },
    { label: "Rejected", count: data.evidenceReviewQueue.filter((item) => item.reviewStage === "Rejected").length, icon: MessageSquare },
    { label: "Approved", count: data.evidenceReviewQueue.filter((item) => item.reviewStage === "Approved").length, icon: CheckCircle2 }
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-ocean-900/10 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Evidence center</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Verification workflow and audit trail</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Review submitted field records, request clarification, approve evidence for reports, and keep an immutable trail for auditors.
        </p>
      </div>

      {params?.saved ? (
        <p className="mt-6 rounded-lg border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Evidence review status updated.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-6 rounded-lg border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Evidence status could not be saved with the current input or permission.</p>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-5">
        {reviewStages.map((stage) => {
          const Icon = stage.icon;

          return (
            <article key={stage.label} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon size={22} aria-hidden="true" className="text-coral-500" />
              <p className="mt-4 text-sm font-bold text-ocean-900/56">{stage.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{stage.count.toLocaleString("id-ID")}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4">
        {data.evidenceReviewQueue.map((item) => (
          <article key={item.id} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/52">{item.evidenceType}</p>
                  <span className="rounded-full bg-ocean-50 px-2 py-1 text-xs font-bold text-ocean-900">{item.stageLabel}</span>
                  <span className={cn("rounded-full px-2 py-1 text-xs font-bold", statusClass(item.reviewStage))}>{item.reviewStage}</span>
                </div>
                <h2 className="mt-3 text-xl font-bold tracking-normal text-ocean-900">{item.title}</h2>
                <p className="mt-2 text-sm text-ocean-900/56">
                  {item.campaignTitle} · {item.siteName ?? item.siteRegion ?? "Program evidence"} · {item.organizationName}
                </p>
                {item.observation ? <p className="mt-3 text-sm leading-6 text-ocean-900/62">{item.observation}</p> : null}
                {item.metricLabel && item.metricValue ? (
                  <p className="mt-3 inline-flex rounded-lg bg-sand-50 px-3 py-2 text-xs font-bold text-ocean-900">
                    {item.metricLabel}: {item.metricValue}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={item.sourceHref} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-900 px-4 text-sm font-bold text-white hover:bg-ocean-700">
                    Source record
                  </Link>
                  <Link href={item.fileUrl} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-ocean-50 px-4 text-sm font-bold text-ocean-900 hover:bg-sand-50">
                    File
                    <ExternalLink size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>

              <aside className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 text-kelp-700" />
                  <div>
                    <p className="font-bold text-ocean-900">{item.nextAction}</p>
                    <p className="mt-1 text-xs leading-5 text-ocean-900/54">
                      Reviewer: {item.reviewer} · Added {formatDate(item.addedAt)}
                    </p>
                  </div>
                </div>
                <p className="mt-4 rounded-lg bg-white p-3 text-xs font-semibold leading-5 text-ocean-900/62">{item.internalNote}</p>
                {canUpdateEvidenceStatus ? (
                  <form action={updateCorporateEvidenceStatusAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input type="hidden" name="evidenceId" value={item.id} />
                    <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">
                      Review status
                      <select name="verificationStatus" defaultValue={item.verificationStatus} className="min-h-10 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold normal-case tracking-normal text-ocean-900 outline-none">
                        <option value="submitted">Submitted</option>
                        <option value="in_review">In review</option>
                        <option value="needs_clarification">Needs clarification</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46 sm:col-span-2">
                      Review note
                      <textarea name="reviewNote" defaultValue={item.latestReviewNote ?? ""} placeholder="Required for clarification or rejection" className="min-h-24 rounded-lg border border-ocean-900/12 bg-white px-3 py-2 text-sm font-semibold leading-6 normal-case tracking-normal text-ocean-900 outline-none" />
                    </label>
                    <Button type="submit" tone="light" className="self-end">
                      Save Review
                    </Button>
                  </form>
                ) : (
                  <p className="mt-4 rounded-lg border border-ocean-900/10 bg-white p-3 text-xs font-semibold leading-5 text-ocean-900/62">
                    Your corporate role can inspect evidence and audit history, but cannot change verification status.
                  </p>
                )}
                <div className="mt-4 border-t border-ocean-900/10 pt-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">Audit trail</p>
                  <div className="mt-3 grid gap-2">
                    {item.auditTrail.map((event) => (
                      <div key={`${item.id}-${event.label}-${event.actor}`} className="rounded-lg bg-white px-3 py-2">
                        <p className="text-sm font-bold text-ocean-900">{event.label}</p>
                        <p className="mt-1 text-xs text-ocean-900/52">{event.actor} · {formatDate(event.occurredAt)}</p>
                        {event.note ? <p className="mt-2 text-xs font-semibold leading-5 text-ocean-900/62">{event.note}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </article>
        ))}
        {data.evidenceReviewQueue.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ocean-900/14 bg-white p-6 text-sm font-semibold text-ocean-900/62 shadow-soft">
            Evidence records will appear here once funded campaigns submit field documentation.
          </p>
        ) : null}
      </section>
    </main>
  );
}
