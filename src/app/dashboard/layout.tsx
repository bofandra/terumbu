import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/dashboard");
  const displayName = user.displayName ?? user.name ?? user.email;

  return <DashboardShell displayName={displayName}>{children}</DashboardShell>;
}
