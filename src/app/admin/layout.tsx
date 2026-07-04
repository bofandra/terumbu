import { AdminShell } from "@/components/admin-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole(["admin"], "/admin");
  const displayName = user.displayName ?? user.name ?? user.email;

  return (
    <AdminShell displayName={displayName} roleLabel="Platform Admin">
      {children}
    </AdminShell>
  );
}
