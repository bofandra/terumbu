import { CampaignActivityForm, CampaignActivityList, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Activity"
};

export const dynamic = "force-dynamic";

export default async function PartnerActivityPage() {
  const user = await requireRole(["partner", "admin"], "/partner");
  const data = await getPartnerPortalData(user.id);

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Activity"
        description="Create and review campaign activity as public progress, verification evidence, or both."
      />
      <CampaignActivityForm campaigns={data.campaigns} canCreateActivity={data.capabilities.canCreateActivity} />
      <CampaignActivityList activities={data.activities} />
    </div>
  );
}
