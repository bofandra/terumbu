import { CampaignList, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Campaigns"
};

export const dynamic = "force-dynamic";

export default async function PartnerCampaignsPage() {
  await requireRole(["partner", "admin"], "/partner");
  const data = await getPartnerPortalData();

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Campaigns"
        description="Manage campaign records, funding targets, public copy, status, and campaign images from one focused page."
        actionHref="/partner/campaigns/new"
        actionLabel="New campaign"
      />
      <CampaignList
        campaigns={data.campaigns}
        organizations={data.organizations}
        updates={data.updates}
        evidence={data.evidence}
        impactSites={data.impactSites}
        sponsoredEcosystems={data.sponsoredEcosystems}
        donorActivity={data.donorActivity}
      />
    </div>
  );
}
