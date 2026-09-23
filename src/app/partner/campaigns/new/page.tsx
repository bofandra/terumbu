import { CampaignCreateForm, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Create Campaign"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "campaign-created": "Campaign created and queued for review."
};

const errorMessages: Record<string, string> = {
  campaign: "Enter campaign title, goal amount, and summary.",
  "impact-site-invalid": "Enter the linked impact site name, region, and valid coordinates.",
  "impact-site-missing": "Choose an existing impact site or create a new location.",
  organization: "Choose an active partner organization.",
  "partner-permission": "Your partner role cannot create campaigns."
};

type PartnerCreateCampaignPageProps = {
  searchParams?: Promise<{
    error?: string;
    saved?: string;
  }>;
};

export default async function PartnerCreateCampaignPage({ searchParams }: PartnerCreateCampaignPageProps) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const params = await searchParams;
  const data = await getPartnerPortalData(user.id);
  const savedMessage = params?.saved ? statusMessages[params.saved] : null;
  const errorMessage = params?.error ? errorMessages[params.error] : null;

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Create campaign"
        description="Set up the campaign essentials first. Public story, media, and tracking details can be completed after creation."
        actionHref="/partner/campaigns"
        actionLabel="View campaigns"
      />
      {savedMessage ? <p className="rounded-lg border border-kelp-700/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedMessage}</p> : null}
      {errorMessage ? <p className="rounded-lg border border-coral-700/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorMessage}</p> : null}
      <CampaignCreateForm organizations={data.organizations} impactSites={data.impactSites} canCreateCampaign={data.capabilities.canCreateCampaign} />
    </div>
  );
}
