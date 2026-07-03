import { FileCheck2, Megaphone, Pencil, Plus, ReceiptText, UploadCloud } from "lucide-react";

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
        title="Campaign operations"
        description="Choose a focused workspace for campaign setup, publishing field updates, evidence submission, and verification tracking."
        actionHref="/partner/campaigns"
        actionLabel="Manage campaigns"
      />

      <PartnerMetricCards data={data} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Partner workspace shortcuts">
        <OperationCard href="/partner/campaigns/new" title="Create campaign" description="Start a new campaign record with goals, impact targets, story copy, and image upload." icon={Plus} />
        <OperationCard href="/partner/campaigns" title="Campaigns" description="Review existing campaign cards, update details, replace images, or remove outdated records." icon={Megaphone} />
        <OperationCard href="/partner/updates" title="Publish update" description="Post field notes and upload update images for supporters to see on campaign timelines." icon={Pencil} />
        <OperationCard href="/partner/evidence/submit" title="Submit evidence" description="Attach image evidence to a campaign so admins can verify conservation progress." icon={UploadCloud} />
        <OperationCard href="/partner/evidence" title="Evidence status" description="Check submitted evidence records and see which items are verified, pending, or rejected." icon={FileCheck2} />
        <OperationCard href="/partner/updates/recent" title="Recent updates" description="Browse the published update history across your campaign portfolio." icon={ReceiptText} />
      </section>
    </div>
  );
}
