import { MapPinned, Save } from "lucide-react";
import { notFound } from "next/navigation";

import {
  AdminImpactSiteErrorSummary,
  AdminImpactSiteFields,
  type AdminImpactSiteFormValues,
  validateAdminImpactSiteFormValues
} from "@/components/admin/admin-impact-site-form";
import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminConfirmSubmit } from "@/components/admin/admin-confirm-submit";
import { AdminPageHeader, AdminStatusBadge, adminPanelClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { observeAdminDataLoader } from "@/lib/admin-observability";
import { requireRole } from "@/lib/auth";
import { deleteAdminImpactSiteAction, updateAdminImpactSiteAction } from "@/lib/portal-actions";
import { getAdminImpactSiteEditorData } from "@/lib/queries";

export const metadata = {
  title: "Manage Impact Site"
};

export const dynamic = "force-dynamic";

const directoryPath = "/admin/campaigns/impact-sites";

const statusMessages: Record<string, string> = {
  "impact-site-created": "Impact site created.",
  "impact-site-updated": "Impact site updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing campaign or leave the site unassigned.",
  "impact-site-delete": "Delete confirmation was not submitted.",
  "impact-site-invalid": "Some impact site fields need attention. Your input has been preserved.",
  "impact-site-missing": "Impact site record was not found."
};

type SearchValue = string | string[] | undefined;
type SearchParams = {
  [Key in keyof AdminImpactSiteFormValues]?: SearchValue;
} & {
  error?: SearchValue;
  saved?: SearchValue;
  returnTo?: SearchValue;
};

function first(value: string | string[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value ?? "";
}

function safeReturnTo(value: string | string[] | undefined) {
  const candidate = first(value);

  if (!candidate || candidate.startsWith("//")) return directoryPath;

  try {
    const url = new URL(candidate, "https://terumbu.local");

    return url.origin === "https://terumbu.local" && url.pathname === directoryPath
      ? `${url.pathname}${url.search}`
      : directoryPath;
  } catch {
    return directoryPath;
  }
}

function hasDraftValues(params: SearchParams | undefined) {
  return ["campaignId", "name", "ecosystemType", "region", "latitude", "longitude", "verification", "progress", "evidenceCount", "latestSurvey"].some(
    (key) => params?.[key as keyof SearchParams] !== undefined
  );
}

function editorValues(site: NonNullable<Awaited<ReturnType<typeof getAdminImpactSiteEditorData>>["site"]>, params: SearchParams | undefined): AdminImpactSiteFormValues {
  if (!hasDraftValues(params)) {
    return {
      campaignId: site.campaignId,
      name: site.name,
      ecosystemType: site.ecosystemType,
      region: site.region,
      latitude: site.latitude.toFixed(6),
      longitude: site.longitude.toFixed(6),
      verification: site.verification,
      progress: site.progress,
      evidenceCount: site.evidenceCount,
      latestSurvey: site.latestSurvey
    };
  }

  return {
    campaignId: first(params?.campaignId),
    name: first(params?.name),
    ecosystemType: first(params?.ecosystemType) || site.ecosystemType,
    region: first(params?.region),
    latitude: first(params?.latitude),
    longitude: first(params?.longitude),
    verification: first(params?.verification) || site.verification,
    progress: first(params?.progress) || "0",
    evidenceCount: first(params?.evidenceCount) || "0",
    latestSurvey: first(params?.latestSurvey)
  };
}

export default async function AdminImpactSiteDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ impactSiteId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { impactSiteId } = await params;
  const pathname = `${directoryPath}/${impactSiteId}`;
  await requireRole(["admin"], pathname);
  const query = await searchParams;
  const data = await observeAdminDataLoader("admin.impact-site.editor", () => getAdminImpactSiteEditorData(impactSiteId));

  if (!data.site) notFound();

  const returnTo = safeReturnTo(query?.returnTo);
  const detailReturnTo = `${pathname}?returnTo=${encodeURIComponent(returnTo)}`;
  const values = editorValues(data.site, query);
  const errorCode = first(query?.error);
  const savedCode = first(query?.saved);
  const errors = errorCode === "impact-site-invalid" ? validateAdminImpactSiteFormValues(values) : {};
  const errorMessage = errorCode ? errorMessages[errorCode] : null;
  const savedMessage = savedCode ? statusMessages[savedCode] : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects / Impact sites"
        title={data.site.name}
        description={`${data.site.ecosystemType} / ${data.site.region} / ${data.site.campaignTitle ?? "Unassigned staging site"}`}
        actionHref={returnTo}
        actionLabel="Back to impact sites"
      />

      {savedMessage ? <AdminAlert tone="success">{savedMessage}</AdminAlert> : null}
      {errorMessage ? <AdminAlert tone="error" title="Impact site was not saved">{errorMessage}</AdminAlert> : null}
      <AdminImpactSiteErrorSummary errors={errors} />

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Impact site summary">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft sm:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ocean-900/58">Current assignment</p>
              <p className="mt-2 text-lg font-bold text-ocean-900">{data.site.campaignTitle ?? "Unassigned staging site"}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{data.site.latitude.toFixed(6)}, {data.site.longitude.toFixed(6)}</p>
            </div>
            <MapPinned className="size-5 text-kelp-700" aria-hidden="true" />
          </div>
        </article>
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
          <p className="text-sm font-bold text-ocean-900/58">Verification</p>
          <div className="mt-3"><AdminStatusBadge value={data.site.verification} /></div>
        </article>
      </section>

      <section className={adminPanelClassName}>
        <div className="border-b border-ocean-900/10 p-4">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Site details</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">Edit location, assignment, verification, and tracking fields.</p>
        </div>
        <form action={updateAdminImpactSiteAction} className="grid gap-4 p-4">
          <input type="hidden" name="impactSiteId" value={data.site.id} />
          <input type="hidden" name="errorReturnTo" value={detailReturnTo} />
          <input type="hidden" name="savedReturnTo" value={detailReturnTo} />
          <AdminImpactSiteFields campaigns={data.campaignOptions} values={values} errors={errors} advancedOpen />
          <Button type="submit" tone="secondary" className="w-fit rounded-lg">
            <Save className="size-4" aria-hidden="true" />
            Save impact site
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-coral-700/20 bg-coral-100 p-4">
        <h2 className="text-lg font-bold text-coral-700">Danger zone</h2>
        <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-coral-700/80">
          Delete this site and detach linked evidence, activity, and sponsorship records from the site.
        </p>
        <form id={`delete-impact-site-${data.site.id}`} action={deleteAdminImpactSiteAction}>
          <input type="hidden" name="impactSiteId" value={data.site.id} />
          <input type="hidden" name="errorReturnTo" value={detailReturnTo} />
          <input type="hidden" name="savedReturnTo" value={returnTo} />
        </form>
        <div className="mt-4">
          <AdminConfirmSubmit
            formId={`delete-impact-site-${data.site.id}`}
            title={`Delete ${data.site.name}?`}
            body="This removes the impact site record and unlinks related campaign evidence from this location. This action cannot be undone from the admin portal."
            triggerLabel="Delete impact site"
            submitLabel="Delete impact site"
          />
        </div>
      </section>
    </div>
  );
}
