import { EvidenceStatusList, PartnerPageHeader } from "@/components/partner-portal-ui";
import { requireRole } from "@/lib/auth";
import { getPartnerPortalData } from "@/lib/queries";

export const metadata = {
  title: "Partner Evidence Status"
};

export const dynamic = "force-dynamic";

export default async function PartnerEvidencePage() {
  await requireRole(["partner", "admin"], "/partner");
  const data = await getPartnerPortalData();

  return (
    <div className="space-y-8">
      <PartnerPageHeader
        title="Evidence status"
        description="Track submitted evidence records and monitor each item through review, verification, or rejection."
        actionHref="/partner/evidence/submit"
        actionLabel="Submit evidence"
      />
      <EvidenceStatusList evidence={data.evidence} />
    </div>
  );
}
