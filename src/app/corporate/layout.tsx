import { CorporateShell } from "@/components/corporate-shell";
import { getUserRoles, requireUser } from "@/lib/auth";
import { getCorporateDashboardData, getCorporateProgramsForUser } from "@/lib/queries";

function roleLabel(canManagePrograms: boolean) {
  return canManagePrograms ? "Corporate Admin" : "Corporate User";
}

export default async function CorporateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/corporate");
  const [data, programAccess, roleKeys] = await Promise.all([
    getCorporateDashboardData(user.id),
    getCorporateProgramsForUser(user.id),
    getUserRoles(user.id)
  ]);

  if (!data && !programAccess) {
    return <>{children}</>;
  }

  const canManagePrograms = roleKeys.includes("corporate_admin") && !roleKeys.includes("admin");
  const displayName = user.displayName ?? user.name ?? user.email;
  const accountName = data?.program.accountName ?? programAccess!.account.accountName;
  const accountLogoUrl = data?.program.accountLogoUrl ?? programAccess!.account.accountLogoUrl;

  return (
    <CorporateShell
      displayName={displayName}
      roleLabel={roleLabel(canManagePrograms)}
      accountName={accountName}
      accountLogoUrl={accountLogoUrl}
      canManagePrograms={canManagePrograms}
    >
      {children}
    </CorporateShell>
  );
}
