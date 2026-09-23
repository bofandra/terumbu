import { MapPinned, Megaphone, Plus, ShipWheel } from "lucide-react";

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
        description="Open a campaign to manage its impact site, funding, public content, updates, evidence, and verification status in one place."
        actionHref="/partner/campaigns"
        actionLabel="Manage campaigns"
      />

      <section className="grid gap-3 sm:grid-cols-2" aria-label="Partner tasks">
        <OperationCard href="/partner/campaigns/new" title="Create campaign" description="Start one draft campaign record." icon={Plus} />
        <OperationCard href="/partner/campaigns" title="Edit campaigns" description={`${data.campaigns.length.toLocaleString("id-ID")} campaign records.`} icon={Megaphone} />
        <OperationCard href="/partner/impact-sites" title="Manage impact sites" description={`${data.impactSites.length.toLocaleString("id-ID")} campaign-linked locations.`} icon={MapPinned} />
        <OperationCard href="/partner/expeditions" title="Update expeditions" description={`${data.expeditions.length.toLocaleString("id-ID")} expedition records.`} icon={ShipWheel} />
      </section>

      <section className="grid gap-3" aria-label="Partner terminology">
        <article className="rounded-lg border border-ocean-900/10 bg-white p-4">
          <h2 className="font-bold text-ocean-900">Field activity</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/58">
            Progress notes and evidence are managed inside each campaign. They are automatically linked to the campaign's required impact site.
          </p>
        </article>
      </section>
    </div>
  );
}
