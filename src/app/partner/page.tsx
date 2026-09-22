import { ClipboardList, MapPinned, Megaphone, Plus, ShipWheel } from "lucide-react";

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
        description="Open the workflow you want to finish now. Field activity is the single place for progress notes, attachments, and review status."
        actionHref="/partner/campaigns"
        actionLabel="Manage campaigns"
      />

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Partner tasks">
        <OperationCard href="/partner/campaigns/new" title="Create campaign" description="Start one draft campaign record." icon={Plus} />
        <OperationCard href="/partner/campaigns" title="Edit campaigns" description={`${data.campaigns.length.toLocaleString("id-ID")} campaign records.`} icon={Megaphone} />
        <OperationCard href="/partner/impact-sites" title="Manage impact sites" description={`${data.impactSites.length.toLocaleString("id-ID")} campaign-linked locations.`} icon={MapPinned} />
        <OperationCard href="/partner/expeditions" title="Update expeditions" description={`${data.expeditions.length.toLocaleString("id-ID")} expedition records.`} icon={ShipWheel} />
        <OperationCard href="/partner/activity" title="Manage field activity" description={`${data.activities.length.toLocaleString("id-ID")} activity logs / ${data.evidence.filter((item) => item.verificationStatus !== "verified").length.toLocaleString("id-ID")} need review or revision.`} icon={ClipboardList} />
      </section>

      <section className="grid gap-3" aria-label="Partner terminology">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h2 className="font-bold text-ocean-900">Field activity</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">
            One partner submission can publish a public progress note, attach verification material for admin review, or do both from the same form.
          </p>
        </article>
      </section>
    </div>
  );
}
