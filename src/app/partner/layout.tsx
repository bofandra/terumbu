import { PartnerShell } from "@/components/partner-shell";
import { requirePartnerRole } from "@/lib/auth";

export default async function PartnerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requirePartnerRole("/partner");
  const displayName = user.displayName ?? user.name ?? user.email;
  const roleLabel = "Partner Admin";

  return (
    <PartnerShell displayName={displayName} roleLabel={roleLabel}>
      {children}
    </PartnerShell>
  );
}
