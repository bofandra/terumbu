import { PartnerPageHeader, RecentUpdatesList } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Recent Partner Updates"
};

export const dynamic = "force-dynamic";

export default async function PartnerRecentUpdatesPage() {
  await requireRole(["partner", "admin"], "/partner");
  const data = await getPartnerPortalData();

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Recent updates"
        description="Review the latest published campaign updates and the images attached to them."
        actionHref="/partner/updates"
        actionLabel="Publish update"
      />
      <RecentUpdatesList updates={data.updates} />
    </div>
  );
}
