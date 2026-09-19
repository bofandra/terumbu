import Link from "next/link";
import { ExternalLink, FileCheck2, History, MapPinned, MessageSquare, ShieldCheck, UserCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader, AdminStatusBadge, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { evidenceStatusLabel, evidenceVerificationStatuses } from "@/lib/evidence-review-workflow";
import { requireRole, safeRedirectPath } from "@/lib/auth";
import { verifyEvidenceAction } from "@/lib/portal-actions";
import { getAdminEvidenceReviewItem } from "@/lib/queries";

export const metadata = {
  title: "Review Evidence"
};

export const dynamic = "force-dynamic";

const directoryPath = "/admin/campaigns/evidence";

const statusMessages: Record<string, string> = {
  evidence: "Evidence review status updated.",
  "review-note": "Add a review note before requesting clarification or rejecting evidence.",
  "evidence-missing": "Evidence record was not found."
};

type AdminEvidenceDetailPageProps = {
  params: Promise<{
    evidenceId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    returnTo?: string;
  }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function detailReturnPath(evidenceId: string, returnTo: string) {
  return `/admin/campaigns/evidence/${evidenceId}?returnTo=${encodeURIComponent(returnTo)}`;
}

export default async function AdminEvidenceDetailPage({ params, searchParams }: AdminEvidenceDetailPageProps) {
  const user = await requireRole(["admin"], directoryPath);
  const [{ evidenceId }, query] = await Promise.all([params, searchParams]);
  const evidence = await getAdminEvidenceReviewItem(evidenceId);

  if (!evidence) {
    notFound();
  }

  const directoryReturnTo = safeRedirectPath(query?.returnTo, directoryPath);
  const redirectTo = detailReturnPath(evidence.id, directoryReturnTo);
  const savedMessage = query?.saved ? statusMessages[query.saved] ?? "Evidence review saved." : null;
  const errorMessage = query?.error
    ? statusMessages[query.error] ?? "Evidence status could not be saved with the current input or permission."
    : null;
  const assignmentLabel = evidence.assignedReviewerUserId === user.id
    ? "Assigned to you"
    : evidence.assignedReviewer
      ? evidence.assignedReviewer
      : "Unassigned";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects / Evidence / Review"
        title={evidence.title}
        description={`${evidence.evidenceCode} · ${evidence.campaignTitle} · ${evidence.partnerName}`}
        actionHref={directoryReturnTo}
        actionLabel="Back to review queue"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error">{errorMessage}</AdminAlert> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Evidence summary">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <ShieldCheck className="size-5 text-coral-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ocean-900/58">Status</p>
          <div className="mt-2"><AdminStatusBadge value={evidence.verificationStatus} /></div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <UserCheck className="size-5 text-ocean-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ocean-900/58">Reviewer</p>
          <p className="mt-2 font-bold text-ocean-900">{assignmentLabel}</p>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <FileCheck2 className="size-5 text-kelp-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ocean-900/58">Evidence type</p>
          <p className="mt-2 font-bold capitalize text-ocean-900">{evidence.evidenceType.replaceAll("_", " ")}</p>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <MapPinned className="size-5 text-coral-500" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ocean-900/58">Impact site</p>
          <p className="mt-2 font-bold text-ocean-900">{evidence.impactSiteName ?? "Not assigned"}</p>
          {evidence.impactSiteRegion ? <p className="mt-1 text-xs font-semibold text-ocean-900/52">{evidence.impactSiteRegion}</p> : null}
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <History className="size-5 text-ocean-700" aria-hidden="true" />
          <p className="mt-3 text-sm font-bold text-ocean-900/58">Submitted</p>
          <p className="mt-2 font-bold text-ocean-900">{formatDate(evidence.createdAt)}</p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="space-y-6">
          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft" aria-labelledby="evidence-context-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 id="evidence-context-title" className="text-lg font-bold text-ocean-900">Submission context</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Review the evidence source and project context before recording a decision.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/campaigns/${evidence.campaignSlug}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:text-coral-700">
                  Project <ExternalLink className="size-4" aria-hidden="true" />
                </Link>
                <Link href={evidence.fileUrl} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ocean-900 px-3 text-sm font-bold text-white hover:bg-ocean-700">
                  Open file <ExternalLink className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-sand-50 p-3">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Project</dt>
                <dd className="mt-1 font-bold text-ocean-900">{evidence.campaignTitle}</dd>
              </div>
              <div className="rounded-lg bg-sand-50 p-3">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Partner</dt>
                <dd className="mt-1 font-bold text-ocean-900">{evidence.partnerName}</dd>
              </div>
              <div className="rounded-lg bg-sand-50 p-3">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Stage</dt>
                <dd className="mt-1 font-bold text-ocean-900">{evidence.stageLabel}</dd>
              </div>
              <div className="rounded-lg bg-sand-50 p-3">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Uploaded by</dt>
                <dd className="mt-1 font-bold text-ocean-900">{evidence.uploadedBy ?? "Partner team"}</dd>
              </div>
            </dl>

            {evidence.observation ? (
              <div className="mt-4 rounded-lg border border-ocean-900/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">Observation</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/70">{evidence.observation}</p>
              </div>
            ) : null}

            {evidence.metricLabel && evidence.metricValue !== null && evidence.metricValue !== undefined ? (
              <div className="mt-4 inline-flex rounded-lg bg-kelp-100 px-3 py-2 text-sm font-bold text-kelp-700">
                {evidence.metricLabel}: {String(evidence.metricValue)}
              </div>
            ) : null}

            {evidence.latestReviewNote ? (
              <div className="mt-4 rounded-lg bg-coral-100 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-coral-700"><MessageSquare className="size-4" aria-hidden="true" /> Latest review note</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-coral-700">{evidence.latestReviewNote}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft" aria-labelledby="audit-title">
            <div>
              <h2 id="audit-title" className="text-lg font-bold text-ocean-900">Review history</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Status transitions, assignments, notes, and reviewer actions for this evidence record.</p>
            </div>

            <div className="mt-5 grid gap-3">
              {evidence.reviewEvents.length > 0 ? evidence.reviewEvents.slice().reverse().map((event) => (
                <article key={event.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ocean-900">{event.label}</p>
                      <p className="mt-1 text-xs font-semibold text-ocean-900/52">{event.actor}</p>
                    </div>
                    <time dateTime={event.occurredAt.toISOString()} className="text-xs font-semibold text-ocean-900/52">{formatDate(event.occurredAt)}</time>
                  </div>
                  {event.note ? <p className="mt-3 text-sm font-semibold leading-6 text-ocean-900/68">{event.note}</p> : null}
                  {event.fromStatus || event.toStatus ? (
                    <p className="mt-3 text-xs font-semibold text-ocean-900/48">
                      {event.fromStatus ? evidenceStatusLabel(event.fromStatus) : "—"} → {event.toStatus ? evidenceStatusLabel(event.toStatus) : "—"}
                    </p>
                  ) : null}
                </article>
              )) : (
                <p className="rounded-lg border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/58">No review events have been recorded yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-6 xl:self-start">
          <form action={verifyEvidenceAction} className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <input type="hidden" name="evidenceId" value={evidence.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <div>
              <h2 className="text-lg font-bold text-ocean-900">Review decision</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">Status changes are audited. Clarification and rejection require a review note.</p>
            </div>

            <label className="mt-5 grid gap-2 text-sm font-bold text-ocean-900">
              Status
              <select name="status" defaultValue={evidence.verificationStatus} className={adminSelectClassName}>
                {evidenceVerificationStatuses.map((status) => (
                  <option key={status} value={status}>{evidenceStatusLabel(status)}</option>
                ))}
              </select>
            </label>

            <label className="mt-4 grid gap-2 text-sm font-bold text-ocean-900">
              Reviewer assignment
              <select name="reviewerAssignment" defaultValue={evidence.assignedReviewerUserId ? "keep" : "assign_me"} className={adminSelectClassName}>
                <option value="assign_me">Assign to me</option>
                <option value="keep">Keep current assignment</option>
                <option value="clear">Clear assignment</option>
              </select>
            </label>

            <label className="mt-4 grid gap-2 text-sm font-bold text-ocean-900">
              Review note
              <textarea
                name="reviewNote"
                defaultValue={evidence.latestReviewNote ?? ""}
                placeholder="Required when requesting clarification or rejecting evidence"
                className={adminTextareaClassName}
              />
            </label>

            <Button type="submit" className="mt-5 min-h-11 w-full rounded-lg">
              Save review decision
            </Button>
          </form>
        </aside>
      </div>
    </div>
  );
}
