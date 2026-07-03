import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/dashboard");
  const displayName = user.displayName ?? user.name ?? user.email;
  const unreadNotificationCount = await getUnreadNotificationCount(user.id);

  return (
    <DashboardShell displayName={displayName} unreadNotificationCount={unreadNotificationCount}>
      {children}
    </DashboardShell>
  );
}
