import { FileCheck2, ShieldCheck } from "lucide-react";

import { AdminPageHeader, AdminStatusBadge, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { verifyEvidenceAction } from "@/lib/portal-actions";
import { getAdminPortalData } from "@/lib/queries";

export const metadata = {
  title: "Admin Evidence"
};

export const dynamic = "force-dynamic";

export default async function AdminEvidencePage() {
  await requireRole(["admin"], "/admin/evidence");
  const data = await getAdminPortalData();

  const pendingCount = data.evidence.filter((item) => item.verificationStatus !== "verified").length;
  const verifiedCount = data.evidence.filter((item) => item.verificationStatus === "verified").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Evidence"
        title="Evidence review"
        description="Verify or reject partner-submitted field records that support public campaign claims."
        actionHref="/admin"
        actionLabel="Overview"
      />

      <section className="grid gap-3 md:grid-cols-3" aria-label="Evidence summary">
        {[
          { label: "Evidence records", value: data.evidence.length.toLocaleString("id-ID") },
          { label: "Needs decision", value: pendingCount.toLocaleString("id-ID") },
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
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-normal text-ocean-900">{item.title}</h2>
                    <AdminStatusBadge value={item.verificationStatus} />
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.campaignTitle}</p>
                  <p className="mt-2 text-xs font-bold text-ocean-900/48">
                    {item.evidenceCode} / {item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <select name="status" defaultValue={item.verificationStatus === "rejected" ? "rejected" : "verified"} className={adminSelectClassName}>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <Button type="submit" tone="secondary" className="min-h-10 px-4">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Save
                  </Button>
                </div>
              </div>
            </form>
          ))}
          {data.evidence.length === 0 ? <p className="p-4 text-sm font-semibold text-ocean-900/58">No evidence records found.</p> : null}
        </div>
      </section>
    </div>
  );
}
