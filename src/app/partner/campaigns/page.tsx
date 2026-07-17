import { CampaignList, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Campaigns"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "campaign-content-deleted": "Campaign content deleted.",
  "campaign-content-saved": "Campaign content saved."
};

const errorMessages: Record<string, string> = {
  "campaign-content-delete": "Confirm content deletion by checking the delete box.",
  "campaign-content-invalid": "Enter the required content fields before saving.",
  "campaign-content-missing": "Campaign content record was not found.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "partner-permission": "Your partner role cannot update campaign content."
};

type PartnerCampaignsPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function PartnerCampaignsPage({ searchParams }: PartnerCampaignsPageProps) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const params = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Campaigns"
        description="Manage campaign records, funding targets, public copy, status, and campaign images from one focused page."
        actionHref="/partner/campaigns/new"
        actionLabel="New campaign"
      />
      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}
      <CampaignList
        campaigns={data.campaigns}
        organizations={data.organizations}
        updates={data.updates}
        evidence={data.evidence}
        impactSites={data.impactSites}
        sponsoredEcosystems={data.sponsoredEcosystems}
        donorActivity={data.donorActivity}
        campaignMediaItems={data.campaignMediaItems}
        campaignBudgetLineItems={data.campaignBudgetLineItems}
        campaignTimelinePhases={data.campaignTimelinePhases}
        organizationTeamMembers={data.organizationTeamMembers}
        canCreateCampaign={data.capabilities.canCreateCampaign}
        canDeleteCampaign={data.capabilities.canDeleteCampaign}
        canUpdateCampaign={data.capabilities.canUpdateCampaign}
      />
    </div>
  );
}
