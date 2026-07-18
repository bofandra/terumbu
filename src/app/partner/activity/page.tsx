import { CampaignActivityForm, CampaignActivityList, PartnerPageHeader } from "@/components/partner-portal-ui";
import { FormTabs } from "@/components/ui/form-tabs";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Activity"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  activity: "Activity saved."
};

const errorMessages: Record<string, string> = {
  activity: "Enter an activity title and field note. Evidence submissions also need an attachment.",
  "campaign-missing": "Choose an existing campaign.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "impact-site": "Choose an impact site linked to the selected campaign.",
  "partner-permission": "Your partner role cannot submit activity."
};

type PartnerActivityPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function PartnerActivityPage({ searchParams }: PartnerActivityPageProps) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const params = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Activity"
        description="Activity is the submission event. Choose whether it becomes public progress, verification evidence, or both."
      />
      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}
      <FormTabs
        ariaLabel="Partner activity workspace"
        tabs={[
          { id: "submit", label: "Submit", description: "Post field activity" },
          { id: "timeline", label: "Timeline", description: "Review submitted activity", badge: data.activities.length.toLocaleString("id-ID") }
        ]}
      >
        <CampaignActivityForm campaigns={data.campaigns} impactSites={data.impactSites} canCreateActivity={data.capabilities.canCreateActivity} />
        <CampaignActivityList activities={data.activities} />
      </FormTabs>
    </div>
  );
}
