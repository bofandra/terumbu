import { PartnerShell } from "@/components/partner-shell";
import { getUserRoles, requireRole } from "@/lib/auth";

export default async function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole(["partner", "admin"], "/partner");
  const roleKeys = await getUserRoles(user.id);
  const displayName = user.displayName ?? user.name ?? user.email;
  const roleLabel = roleKeys.includes("admin") ? "Admin reviewer" : "Partner Admin";

  return (
    <PartnerShell displayName={displayName} roleLabel={roleLabel}>
      {children}
    </PartnerShell>
  );
}
