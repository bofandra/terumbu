import { PartnerImpactSiteManagement, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requirePartnerRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Impact Sites"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "impact-site-created": "Impact site created.",
  "impact-site-deleted": "Impact site deleted.",
  "impact-site-updated": "Impact site updated.",
  "restoration-batch-created": "Restoration batch created.",
  "restoration-allocation-created": "Sponsorship allocated to the restoration batch.",
  "restoration-batch-transitioned": "Restoration batch status updated."
};

const errorMessages: Record<string, string> = {
  "campaign-missing": "Choose an existing campaign.",
  "destination-missing": "Choose a published destination managed by Terumbu.",
  "impact-site-delete": "Confirm impact-site deletion by checking the delete box.",
  "impact-site-invalid": "Enter site name, ecosystem type, region, valid coordinates, progress between 0 and 100, and activity count.",
  "impact-site-missing": "Impact site record was not found.",
  "impact-site-exists": "This impact site is already linked to the selected campaign.",
  "impact-site-required": "A campaign must keep one impact site, so the last linked site cannot be deleted.",
  "partner-permission": "Your partner role cannot manage impact sites.",
  "restoration-batch-invalid": "Choose an impact site and enter a batch title.",
  "restoration-batch-missing": "Restoration batch was not found.",
  "restoration-allocation-invalid": "Choose a batch and sponsorship to allocate.",
  "restoration-allocation-mismatch": "The sponsorship must belong to the same campaign and impact site as the batch.",
  "restoration-allocation-units": "Allocation units must be greater than zero and cannot exceed the sponsored units.",
  "restoration-transition-invalid": "That restoration batch status transition is not allowed.",
  "restoration-monitoring-evidence": "Verified evidence linked to this exact batch is required before monitoring can be recorded."
};

type PartnerImpactSitesPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function PartnerImpactSitesPage({ searchParams }: PartnerImpactSitesPageProps) {
  const user = await requirePartnerRole("/partner");
  const params = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Impact sites"
        description="Manage the field locations that connect campaigns, activity, and sponsorship records."
      />
      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}
      <PartnerImpactSiteManagement
        campaigns={data.campaigns}
        destinations={data.destinations}
        impactSites={data.impactSites}
        sponsoredEcosystems={data.sponsoredEcosystems}
        restorationBatches={data.restorationBatches}
        restorationBatchAllocations={data.restorationBatchAllocations}
        canManageImpactSites={data.capabilities.canManageImpactSites}
      />
    </div>
  );
}
