import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/queries";
import { getPreferredLocale } from "@/lib/user-preferences";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser("/dashboard");
  const displayName = user.displayName ?? user.name ?? user.email;
  const [unreadNotificationCount, locale] = await Promise.all([
    getUnreadNotificationCount(user.id),
    getPreferredLocale()
  ]);

  return (
    <DashboardShell displayName={displayName} unreadNotificationCount={unreadNotificationCount} locale={locale}>
      {children}
    </DashboardShell>
  );
}
