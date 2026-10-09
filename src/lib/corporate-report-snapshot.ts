import type { getCorporateDashboardData } from "@/lib/queries";

// PDF generation and the public report use the same, already-loaded dashboard
// dataset. Do not query live program data again when approving or publishing.
export function corporatePublicSnapshotFromDashboard(
  data: NonNullable<Awaited<ReturnType<typeof getCorporateDashboardData>>>
) {
  const portfolio = data.portfolio.map((project) => ({
    campaignId: project.campaignId,
    campaignSlug: project.campaignSlug,
    campaignTitle: project.campaignTitle,
    campaignCategory: project.campaignCategory,
    region: project.region,
    imageUrl: project.imageUrl,
    goalAmount: project.goalAmount,
    raisedAmount: project.raisedAmount,
    impactTarget: project.impactTarget,
    impactUnit: project.impactUnit,
    organizationName: project.organizationName,
    organizationVerification: project.organizationVerification,
    allocationAmount: project.allocationAmount,
    status: project.status,
    allocationValue: project.allocationValue,
    progress: Math.min(100, Math.round((Number(project.raisedAmount) / Math.max(1, Number(project.goalAmount))) * 100))
  }));
  const evidence = data.evidence.map((item) => ({
    evidenceCode: item.evidenceCode,
    title: item.title,
    evidenceType: item.evidenceType,
    verificationStatus: item.verificationStatus,
    campaignId: item.campaignId,
    campaignSlug: item.campaignSlug,
    campaignTitle: item.campaignTitle,
    organizationName: item.organizationName,
    verifiedAt: item.verifiedAt,
    addedAt: item.addedAt,
    sourceHref: item.sourceHref
  }));
  return {
    snapshotVersion: 1,
    reportContext: {
      accountName: data.program.accountName,
      accountLogoUrl: data.program.accountLogoUrl,
      programName: data.program.programName,
      programSlug: data.program.programSlug,
      startsAt: data.program.startsAt,
      endsAt: data.program.endsAt,
      budgetAmount: data.program.budgetAmount,
      currency: data.program.currency
    },
    portfolio,
    evidence,
    metrics: {
      committedFunding: data.financials.committedFunding,
      totalAllocated: portfolio.reduce((sum, item) => sum + item.allocationValue, 0),
      restorationUnits: portfolio.reduce((sum, item) => sum + item.impactTarget, 0),
      verifiedEvidence: evidence.filter((item) => item.verificationStatus === "verified").length,
      projectCount: portfolio.length,
      partnerCount: new Set(portfolio.map((item) => item.organizationName)).size
    }
  };
}
