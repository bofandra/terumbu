import { EvidenceSubmitForm, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Submit Evidence"
};

export const dynamic = "force-dynamic";

export default async function PartnerSubmitEvidencePage() {
  const user = await requireRole(["partner", "admin"], "/partner");
  const data = await getPartnerPortalData(user.id);

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Submit evidence"
        description="Upload campaign evidence images or attach an external file URL for admin verification."
        actionHref="/partner/evidence"
        actionLabel="Evidence status"
      />
      <EvidenceSubmitForm campaigns={data.campaigns} />
    </div>
  );
}
