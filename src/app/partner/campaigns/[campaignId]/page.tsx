import { notFound } from "next/navigation";

import { PartnerCampaignWorkspace } from "@/components/partner-campaign-workspace";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Manage Campaign"
};

export const dynamic = "force-dynamic";

const statusMessages: Record<string, string> = {
  "campaign-updated": "Campaign settings saved.",
  "campaign-content-saved": "Campaign content saved.",
  "campaign-content-deleted": "Campaign content deleted.",
  activity: "Campaign update and proof saved.",
  "evidence-resubmitted": "Evidence revision submitted for admin review."
};

const errorMessages: Record<string, string> = {
  "campaign-update": "Complete the required campaign fields before saving.",
  "campaign-missing": "Campaign was not found.",
  "campaign-content-delete": "Confirm content deletion before continuing.",
  "campaign-content-invalid": "Complete the required content fields before saving.",
  "campaign-content-missing": "Campaign content record was not found.",
  activity: "Enter an update title and note. Evidence submissions with attachments also need a valid file.",
  "impact-site-required": "This campaign needs an impact site before updates or evidence can be submitted.",
  "impact-site-invalid": "Enter the impact site name, region, and valid coordinates.",
  "impact-site-missing": "Choose an existing impact site or create a new location.",
  "evidence-revision": "Complete the proof title and upload replacement evidence.",
  "evidence-missing": "Evidence record was not found.",
  "evidence-state": "This evidence is not waiting for partner revision.",
  "image-size": "Uploaded image is too large.",
  "image-type": "Upload a supported image file.",
  "partner-permission": "Your partner role cannot perform this action."
};

type PartnerCampaignDetailPageProps = {
  params: Promise<{
    campaignId: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    saved?: string;
    tab?: string;
  }>;
};

export default async function PartnerCampaignDetailPage({ params, searchParams }: PartnerCampaignDetailPageProps) {
  const user = await requireRole(["partner"], "/partner");
  const [{ campaignId }, query] = await Promise.all([params, searchParams]);
  const data = await getPartnerPortalData(user.id);
  const campaign = data.campaigns.find((item) => item.id === campaignId);

  if (!campaign) {
    notFound();
  }

  return (
    <PartnerCampaignWorkspace
      data={data}
      campaignId={campaign.id}
      savedMessage={query?.saved ? statusMessages[query.saved] ?? "Campaign changes saved." : null}
      errorMessage={query?.error ? errorMessages[query.error] ?? "Campaign changes could not be saved." : null}
      defaultTabId={query?.tab}
    />
  );
}
