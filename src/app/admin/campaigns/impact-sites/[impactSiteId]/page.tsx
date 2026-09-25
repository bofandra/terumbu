import Link from "next/link";
import { MapPinned, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader, AdminStatusBadge, adminPanelClassName, adminSelectClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { updateImpactSiteVerificationAction } from "@/lib/portal-actions";
import { getAdminImpactSiteEditorData } from "@/lib/queries";

export const metadata = {
  title: "Impact Site Monitoring"
};

export const dynamic = "force-dynamic";

export default async function AdminImpactSiteDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ impactSiteId: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  const [{ impactSiteId }, query] = await Promise.all([params, searchParams]);
  const pathname = `/admin/campaigns/impact-sites/${impactSiteId}`;
  await requireRole(["admin"], pathname);
  const data = await observeAdminDataLoader("admin.impact-site.editor", () => getAdminImpactSiteEditorData(impactSiteId));

  if (!data.site) {
    notFound();
  }

  const site = data.site;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Donations / Impact sites / Read only"
        title={site.name}
        description={`${site.ecosystemType} / ${site.region} / ${site.campaignTitle ?? "Unassigned staging site"}`}
        actionHref="/admin/campaigns/impact-sites"
        actionLabel="Back to impact sites"
      />

      <section className="rounded-lg border border-kelp-700/20 bg-kelp-100/50 p-4 shadow-soft">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-kelp-700" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-ocean-900">Partner-owned impact site</h2>
            <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/62">
              Platform admins cannot edit partner-owned coordinates, campaign assignment, progress, or evidence counts. Verification level is a platform governance control and is managed separately below.
            </p>
          </div>
        </div>
      </section>

      {query?.saved === "verification" ? <AdminAlert tone="success">Impact site verification updated.</AdminAlert> : null}
      {query?.error ? <AdminAlert tone="error">Impact site verification could not be updated.</AdminAlert> : null}

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Impact site summary">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft sm:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Current assignment</p>
              <p className="mt-2 text-lg font-bold text-ocean-900">{site.campaignTitle ?? "Unassigned staging site"}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}</p>
            </div>
            <MapPinned className="size-5 text-kelp-700" aria-hidden="true" />
          </div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/58">Verification</p>
          <div className="mt-3"><AdminStatusBadge value={site.verification} /></div>
        </article>
      </section>

      <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Platform governance</p>
        <h2 className="mt-2 text-xl font-bold text-ocean-900">Verification level</h2>
        <p className="mt-1 text-sm font-semibold leading-6 text-ocean-900/58">
          This control changes only Terumbu verification level. It does not modify the partner's location or operational progress data.
        </p>
        <form action={updateImpactSiteVerificationAction} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="impactSiteId" value={site.id} />
          <label className="grid gap-2 text-sm font-bold text-ocean-900">
            Verification
            <select name="verification" defaultValue={site.verification} className={adminSelectClassName}>
              <option value="basic">Basic</option>
              <option value="document">Document verified</option>
              <option value="field">Field verified</option>
            </select>
          </label>
          <Button type="submit">Update verification</Button>
        </form>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold text-ocean-900">Site snapshot</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Partner-managed location and tracking data.</p>
        </div>
        <dl className="grid gap-3 p-4 md:grid-cols-2">
          <div className="rounded-lg bg-sand-50 p-4"><dt className="text-sm font-semibold text-ocean-900/54">Ecosystem</dt><dd className="mt-2 font-bold text-ocean-900">{site.ecosystemType}</dd></div>
          <div className="rounded-lg bg-sand-50 p-4"><dt className="text-sm font-semibold text-ocean-900/54">Region</dt><dd className="mt-2 font-bold text-ocean-900">{site.region}</dd></div>
          <div className="rounded-lg bg-sand-50 p-4"><dt className="text-sm font-semibold text-ocean-900/54">Coordinates</dt><dd className="mt-2 font-bold text-ocean-900">{site.latitude.toFixed(6)}, {site.longitude.toFixed(6)}</dd></div>
          <div className="rounded-lg bg-sand-50 p-4"><dt className="text-sm font-semibold text-ocean-900/54">Latest survey</dt><dd className="mt-2 font-bold text-ocean-900">{site.latestSurvey ?? "Pending"}</dd></div>
          <div className="rounded-lg bg-sand-50 p-4"><dt className="text-sm font-semibold text-ocean-900/54">Activity records</dt><dd className="mt-2 font-bold text-ocean-900">{site.evidenceCount.toLocaleString("id-ID")}</dd></div>
          <div className="rounded-lg bg-sand-50 p-4"><dt className="text-sm font-semibold text-ocean-900/54">Progress</dt><dd className="mt-2 font-bold text-ocean-900">{site.progress}%</dd><ProgressMeter value={site.progress} label="Impact site progress" className="mt-3 h-2" trackClassName="bg-white" /></div>
        </dl>
        {site.campaignId ? (
          <div className="border-t border-ocean-900/10 p-4">
            <Link href={`/admin/campaigns/${site.campaignId}`} className="text-sm font-bold text-coral-700 hover:text-coral-500">
              View linked donation →
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}
