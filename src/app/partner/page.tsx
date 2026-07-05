import { ClipboardList, Megaphone, Plus, ShipWheel } from "lucide-react";

import { OperationCard, PartnerMetricCards, PartnerPageHeader } from "@/components/partner-portal-ui";
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
    <div className="space-y-8">
      <PartnerPageHeader
        title="Partner operations"
        description="Choose a focused workspace for campaign setup, expedition detail management, and field activity reporting."
        actionHref="/partner/campaigns"
        actionLabel="Manage campaigns"
      />

      <PartnerMetricCards data={data} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Partner workspace shortcuts">
        <OperationCard href="/partner/campaigns/new" title="Create campaign" description="Start a new campaign record with goals, impact targets, story copy, and image upload." icon={Plus} />
        <OperationCard href="/partner/campaigns" title="Campaigns" description="Review existing campaign cards, update details, replace images, or remove outdated records." icon={Megaphone} />
        <OperationCard href="/partner/expeditions" title="Expeditions" description="Update public trip detail content, departure dates, availability, guides, and weather advisories." icon={ShipWheel} />
        <OperationCard href="/partner/activity" title="Activity" description="Record field progress as a public update, verification evidence, or both in one timeline." icon={ClipboardList} />
        <OperationCard href="/partner/evidence" title="Evidence review" description="Track pending, verified, and rejected field evidence with revision/resubmission actions." icon={ClipboardList} />
      </section>
    </div>
  );
}
