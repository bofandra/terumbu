import { CampaignActivityForm, CampaignActivityList, PartnerPageHeader } from "@/components/partner-portal-ui";
import { FormTabs } from "@/components/ui/form-tabs";
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
        description="Activity is the submission event. Choose whether it becomes public progress, verification evidence, or both."
      />
      <FormTabs
        ariaLabel="Partner activity workspace"
        tabs={[
          { id: "submit", label: "Submit", description: "Post field activity" },
          { id: "timeline", label: "Timeline", description: "Review submitted activity", badge: data.activities.length.toLocaleString("id-ID") }
        ]}
      >
        <CampaignActivityForm campaigns={data.campaigns} canCreateActivity={data.capabilities.canCreateActivity} />
        <CampaignActivityList activities={data.activities} />
      </FormTabs>
    </div>
  );
}
