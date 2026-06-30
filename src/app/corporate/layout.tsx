import { CorporateShell } from "@/components/corporate-shell";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";

function roleLabel(permission: string | undefined) {
  const labels: Record<string, string> = {
    executive_viewer: "Executive Viewer",
    esg_manager: "ESG Program Manager",
    finance_reviewer: "Finance Reviewer",
    employee_engagement: "Employee Engagement Manager",
    auditor: "External Reviewer"
  };

  return labels[permission ?? ""] ?? "ESG Program Manager";
}

export default async function CorporateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/corporate/dashboard");
  const data = await getCorporateDashboardData(user.id);
  const displayName = user.displayName ?? user.name ?? user.email;
  const nextReportDue = data?.reporting.nextReportingDeadline.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "Setup pending";

  return (
    <CorporateShell
      displayName={displayName}
      roleLabel={roleLabel(data?.program.permission)}
      accountName={data?.program.accountName ?? "Corporate Workspace"}
      programName={data?.program.programName ?? "Impact Program"}
      accountLogoUrl={data?.program.accountLogoUrl ?? null}
      activeProjects={data?.portfolio.length ?? 0}
      nextReportDue={nextReportDue}
    >
      {children}
    </CorporateShell>
  );
}
