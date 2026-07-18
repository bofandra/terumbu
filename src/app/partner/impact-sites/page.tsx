import { PartnerImpactSiteManagement, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Impact Sites"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "impact-site-created": "Impact site created.",
  "impact-site-deleted": "Impact site deleted.",
  "impact-site-updated": "Impact site updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing campaign.",
  "impact-site-delete": "Confirm impact-site deletion by checking the delete box.",
  "impact-site-invalid": "Enter site name, ecosystem type, region, valid coordinates, progress between 0 and 100, and evidence count.",
  "impact-site-missing": "Impact site record was not found.",
  "partner-permission": "Your partner role cannot manage impact sites."
};

type PartnerImpactSitesPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function PartnerImpactSitesPage({ searchParams }: PartnerImpactSitesPageProps) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const params = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Impact sites"
        description="Manage the field locations that connect campaigns, evidence, activity, and sponsorship records."
      />
      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}
      <PartnerImpactSiteManagement
        campaigns={data.campaigns}
        impactSites={data.impactSites}
        canManageImpactSites={data.capabilities.canManageImpactSites}
      />
    </div>
  );
}
