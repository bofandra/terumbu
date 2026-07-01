import { PartnerPageHeader, PublishUpdateForm } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Publish Update"
};

export const dynamic = "force-dynamic";

export default async function PartnerUpdatesPage() {
  await requireRole(["partner", "admin"], "/partner");
  const data = await getPartnerPortalData();

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Publish update"
        description="Share field progress with supporters and attach an uploaded image or external image URL."
        actionHref="/partner/updates/recent"
        actionLabel="Recent updates"
      />
      <PublishUpdateForm campaigns={data.campaigns} />
    </div>
  );
}
