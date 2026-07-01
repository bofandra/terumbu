import { CampaignCreateForm, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Create Campaign"
};

export const dynamic = "force-dynamic";

export default async function PartnerCreateCampaignPage() {
  await requireRole(["partner", "admin"], "/partner");
  const data = await getPartnerPortalData();

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Create campaign"
        description="Set up the campaign essentials, upload the hero image, and save the record directly to the database."
        actionHref="/partner/campaigns"
        actionLabel="View campaigns"
      />
      <CampaignCreateForm organizations={data.organizations} />
    </div>
  );
}
