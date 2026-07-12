import { FileCheck2, ShieldCheck } from "lucide-react";

import { AdminEmptyState, AdminPageHeader, AdminStatusBadge, adminPanelClassName, adminSelectClassName, adminTextareaClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { verifyEvidenceAction } from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";

export const metadata = {
  title: "Admin Campaign Evidence"
};

export const dynamic = "force-dynamic";

export default async function AdminCampaignEvidencePage() {
  await requireRole(["admin"], "/admin/campaigns/evidence");
  const data = await getAdminPortalData();

  const pendingCount = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const clarificationCount = data.evidence.filter((item) => item.verificationStatus === "needs_clarification").length;
  const verifiedCount = data.evidence.filter((item) => item.verificationStatus === "verified").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Campaigns / Evidence"
        title="Evidence review"
        description="Verify or reject partner-submitted field records that support public campaign claims."
        actionHref="/admin/campaigns"
        actionLabel="Campaigns"
      />

      <section className="grid gap-3 md:grid-cols-4" aria-label="Evidence summary">
        {[
          { label: "Evidence records", value: data.evidence.length.toLocaleString("id-ID") },
          { label: "Needs decision", value: pendingCount.toLocaleString("id-ID") },
          { label: "Clarification", value: clarificationCount.toLocaleString("id-ID") },
          { label: "Verified", value: verifiedCount.toLocaleString("id-ID") }
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/58">{item.label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
          </article>
        ))}
      </section>

      <section className={adminPanelClassName}>
        <div className="flex flex-col justify-between gap-3 border-b border-ocean-900/10 p-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Review queue</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Newest records and unresolved decisions</p>
          </div>
          <FileCheck2 className="size-5 text-kelp-700" aria-hidden="true" />
        </div>

        <div className="divide-y divide-ocean-900/10">
          {data.evidence.map((item) => (
            <form key={item.id} action={verifyEvidenceAction} className="p-4">
              <input type="hidden" name="evidenceId" value={item.id} />
              <input type="hidden" name="redirectTo" value="/admin/campaigns/evidence" />
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-normal text-ocean-900">{item.title}</h2>
                    <AdminStatusBadge value={item.verificationStatus} />
                    <span className="rounded-full bg-ocean-50 px-2 py-1 text-xs font-bold text-ocean-700">{item.reviewStage}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.campaignTitle}</p>
                  <p className="mt-2 text-xs font-bold text-ocean-900/48">
                    {item.evidenceCode} / {item.evidenceType} / {item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                  <a href={item.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-coral-700 hover:text-coral-500">Open evidence file</a>
                  {item.latestReviewNote ? (
                    <p className="mt-2 rounded-lg bg-coral-100 px-3 py-2 text-sm font-semibold leading-6 text-coral-700">Latest note: {item.latestReviewNote}</p>
                  ) : null}
                  {item.reviewEvents.length > 0 ? (
                    <div className="mt-4 grid gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">Audit trail</p>
                      {item.reviewEvents.slice(-4).map((event) => (
                        <div key={event.id} className="rounded-lg bg-sand-50 px-3 py-2 text-xs font-semibold leading-5 text-ocean-900/62">
                          <p className="font-bold text-ocean-900">{event.label}</p>
                          <p>{event.actor} / {event.occurredAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                          {event.note ? <p className="mt-1">{event.note}</p> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3 rounded-lg bg-sand-50 p-3">
                  <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">
                    Review status
                    <select name="status" defaultValue={item.verificationStatus} className={adminSelectClassName}>
                      <option value="submitted">Submitted</option>
                      <option value="in_review">In review</option>
                      <option value="needs_clarification">Needs clarification</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">
                    Reviewer
                    <select name="reviewerAssignment" defaultValue={item.assignedReviewerUserId ? "keep" : "assign_me"} className={adminSelectClassName}>
                      <option value="assign_me">Assign to me</option>
                      <option value="keep">Keep current</option>
                      <option value="clear">Clear assignment</option>
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/46">
                    Review note
                    <textarea name="reviewNote" defaultValue={item.latestReviewNote ?? ""} placeholder="Required for clarification or rejection" className={adminTextareaClassName} />
                  </label>
                  <Button type="submit" tone="secondary" className="min-h-10 px-4">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Save review
                  </Button>
                </div>
              </div>
            </form>
          ))}
          {data.evidence.length === 0 ? (
            <AdminEmptyState
              className="m-4"
              title="No evidence awaiting review"
              description="Partner submissions will appear here when field teams upload photos, survey notes, or verification records."
              actionHref="/partner/activity"
              actionLabel="Add activity"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
