import { ClipboardList, Megaphone, Plus, ShipWheel } from "lucide-react";

import { OperationCard, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Portal"
};

export const dynamic = "force-dynamic";

export default async function PartnerPortalPage() {
  const user = await requireRole(["partner", "admin"], "/partner");
  const data = await getPartnerPortalData(user.id);

  return (
    <div className="space-y-6">
      <PartnerPageHeader
        title="Choose one partner task"
        description="Open the workflow you want to finish now. Campaign editing, expedition updates, activity logs, and evidence review stay separated."
        actionHref="/partner/campaigns"
        actionLabel="Manage campaigns"
      />

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Partner tasks">
        <OperationCard href="/partner/campaigns/new" title="Create campaign" description="Start one draft campaign record." icon={Plus} />
        <OperationCard href="/partner/campaigns" title="Edit campaigns" description={`${data.campaigns.length.toLocaleString("id-ID")} campaign records.`} icon={Megaphone} />
        <OperationCard href="/partner/expeditions" title="Update expeditions" description={`${data.expeditions.length.toLocaleString("id-ID")} expedition records.`} icon={ShipWheel} />
        <OperationCard href="/partner/activity" title="Post field activity" description={`${data.activities.length.toLocaleString("id-ID")} activity logs.`} icon={ClipboardList} />
        <OperationCard href="/partner/evidence" title="Review evidence" description={`${data.evidence.filter((item) => item.verificationStatus !== "verified").length.toLocaleString("id-ID")} evidence records need attention.`} icon={ClipboardList} />
      </section>
    </div>
  );
}
