import { CorporateShell } from "@/components/corporate-shell";
import { getUserRoles, requireUser } from "@/lib/auth";
import { getCorporateDashboardData, getCorporateProgramsForUser } from "@/lib/queries";
import { corporateCapabilitiesForPermission, corporatePermissionLabel } from "@/lib/corporate-permissions";

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

  const permission = data?.governance.accessSummary.currentPermission ?? programAccess?.account.permission;
  const capabilities = corporateCapabilitiesForPermission(permission);
  const canManagePrograms = !roleKeys.includes("admin") && capabilities.canManagePrograms;
  const canManageEmployees = !roleKeys.includes("admin") && capabilities.canManageEmployees;
  const canManageSettings = !roleKeys.includes("admin") && capabilities.canManageSettings;
  const displayName = user.displayName ?? user.name ?? user.email;
  const accountName = data?.program.accountName ?? programAccess!.account.accountName;
  const accountLogoUrl = data?.program.accountLogoUrl ?? programAccess!.account.accountLogoUrl;

  return (
    <CorporateShell
      displayName={displayName}
      roleLabel={corporatePermissionLabel(permission)}
      accountName={accountName}
      accountLogoUrl={accountLogoUrl}
      canManagePrograms={canManagePrograms}
      canManageEmployees={canManageEmployees}
      canManageSettings={canManageSettings}
    >
      {children}
    </CorporateShell>
  );
}
