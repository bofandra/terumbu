import { Plus } from "lucide-react";

import {
  AdminImpactSiteErrorSummary,
  AdminImpactSiteFields,
  type AdminImpactSiteFormValues,
  validateAdminImpactSiteFormValues
} from "@/components/admin/admin-impact-site-form";
import { AdminAlert } from "@/components/admin/admin-alert";
import { AdminPageHeader, adminPanelClassName } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { createAdminImpactSiteAction } from "@/lib/portal-actions";
import { getAdminImpactSiteEditorData } from "@/lib/queries";

export const metadata = {
  title: "New Impact Site"
};

export const dynamic = "force-dynamic";

const pathname = "/admin/campaigns/impact-sites/new";
const directoryPath = "/admin/campaigns/impact-sites";

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing campaign or leave the site unassigned.",
  "impact-site-invalid": "Some impact site fields need attention. Your input has been preserved."
};

type SearchValue = string | string[] | undefined;
type SearchParams = {
  [Key in keyof AdminImpactSiteFormValues]?: SearchValue;
} & {
  error?: SearchValue;
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

function formValues(params: SearchParams | undefined): AdminImpactSiteFormValues {
  return {
    campaignId: first(params?.campaignId),
    name: first(params?.name),
    ecosystemType: first(params?.ecosystemType) || "Coral",
    region: first(params?.region),
    latitude: first(params?.latitude),
    longitude: first(params?.longitude),
    verification: first(params?.verification) || "basic",
    progress: first(params?.progress) || "0",
    evidenceCount: first(params?.evidenceCount) || "0",
    latestSurvey: first(params?.latestSurvey)
  };
}

export default async function AdminImpactSiteNewPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await requireRole(["admin"], pathname);
  const params = await searchParams;
  const data = await getAdminImpactSiteEditorData();
  const values = formValues(params);
  const errorCode = first(params?.error);
  const errors = errorCode === "impact-site-invalid" ? validateAdminImpactSiteFormValues(values) : {};
  const errorMessage = errorCode ? errorMessages[errorCode] : null;
  const returnTo = safeReturnTo(params?.returnTo);
  const editorReturnTo = `${pathname}?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Projects / Impact sites"
        title="Create impact site"
        description="Create the location record first. Progress, evidence count, survey date, and verification can be refined later."
        actionHref={returnTo}
        actionLabel="Back to impact sites"
      />

      {errorMessage ? <AdminAlert tone="error" title="Impact site was not created">{errorMessage}</AdminAlert> : null}
      <AdminImpactSiteErrorSummary errors={errors} />

      <section className={adminPanelClassName}>
        <div className="flex items-center justify-between gap-3 border-b border-ocean-900/10 p-4">
          <div>
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Location details</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Required fields are kept intentionally small for initial setup.</p>
          </div>
          <Plus className="size-5 text-coral-700" aria-hidden="true" />
        </div>
        <form action={createAdminImpactSiteAction} className="grid gap-4 p-4">
          <input type="hidden" name="errorReturnTo" value={editorReturnTo} />
          <input type="hidden" name="savedReturnTo" value={returnTo} />
          <AdminImpactSiteFields campaigns={data.campaignOptions} values={values} errors={errors} advancedOpen={Boolean(params?.progress || params?.evidenceCount || params?.latestSurvey)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" tone="secondary" className="w-fit rounded-lg">
              <Plus className="size-4" aria-hidden="true" />
              Create impact site
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
