import { CorporateShell } from "@/components/corporate-shell";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";

function roleLabel() {
  return "Corporate User";
}

export default async function CorporateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/corporate");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <>{children}</>;
  }

  const displayName = user.displayName ?? user.name ?? user.email;
  const nextReportDue = data.reporting.nextReportingDeadline.toLocaleDateString("id-ID", { dateStyle: "medium" });

  return (
    <CorporateShell
      displayName={displayName}
      roleLabel={roleLabel()}
      accountName={data.program.accountName}
      programName={data.program.programName}
      accountLogoUrl={data.program.accountLogoUrl}
      activeProjects={data.portfolio.length}
      nextReportDue={nextReportDue}
    >
      {children}
    </CorporateShell>
  );
}
