import { Bell, CheckCircle2, MailCheck, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/retention-actions";

export const metadata = {
  title: "Notifications"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

export default async function DashboardNotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const data = await getDashboardData(user.id);
  const unreadCount = data.notifications.filter((notification) => notification.unread).length;
  const stats: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: "Unread", value: unreadCount.toLocaleString("id-ID"), icon: Bell },
    { label: "Total", value: data.notifications.length.toLocaleString("id-ID"), icon: MailCheck },
    { label: "Monthly report", value: data.monthlyReport.persisted ? "Saved" : data.monthlyReport.ready ? "Ready" : "Pending", icon: CheckCircle2 }
  ];
  const preferenceItems: Array<{ label: string; enabled: boolean }> = [
    { label: "Campaign updates", enabled: data.notificationPreferences.campaignUpdates },
    { label: "Evidence alerts", enabled: data.notificationPreferences.evidenceAlerts },
    { label: "Expedition reminders", enabled: data.notificationPreferences.expeditionReminders },
    { label: "Academy updates", enabled: data.notificationPreferences.academyUpdates },
    { label: "Monthly report records", enabled: data.notificationPreferences.monthlyImpactReport },
    { label: "Monthly email summaries", enabled: data.notificationPreferences.monthlyImpactEmail }
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Notifications</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Account and impact updates</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Review activity from donations, field evidence, expeditions, learning, certificates, and account changes.
          </p>
        </div>
        <ButtonLink href="/dashboard/settings#notifications" tone="secondary">
          <Settings size={17} aria-hidden="true" />
          Preferences
        </ButtonLink>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon className="text-coral-500" size={22} aria-hidden="true" />
              <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.45fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Inbox</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Recent notifications</h2>
            </div>
            {unreadCount > 0 ? (
              <form action={markAllNotificationsReadAction}>
                <input type="hidden" name="next" value="/dashboard/notifications" />
                <Button type="submit" tone="light">
                  Mark all read
                </Button>
              </form>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3">
            {data.notifications.length > 0 ? (
              data.notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{notification.category}</p>
                      <Link href={notification.href} className="mt-2 block font-bold text-ocean-900 hover:text-coral-700">
                        {notification.message}
                      </Link>
                      <p className="mt-2 text-xs font-semibold text-ocean-900/54">{formatDate(notification.timestamp)}</p>
                    </div>
                    {notification.unread ? <span className="mt-1 size-2 shrink-0 rounded-full bg-coral-500" aria-label="Unread" /> : null}
                  </div>
                  {notification.unread ? (
                    <form action={markNotificationReadAction} className="mt-3">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <input type="hidden" name="next" value="/dashboard/notifications" />
                      <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">
                        Mark read
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">
                Notifications will appear here after account, donation, expedition, or certificate activity.
              </p>
            )}
          </div>
        </article>

        <aside className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Delivery</p>
          <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Preference status</h2>
          <div className="mt-5 grid gap-3">
            {preferenceItems.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 px-4 py-3 text-sm">
                <span className="font-bold text-ocean-900">{item.label}</span>
                <span className={item.enabled ? "font-bold text-kelp-700" : "font-bold text-ocean-900/42"}>{item.enabled ? "On" : "Off"}</span>
              </div>
            ))}
          </div>
          <Link href="/dashboard/settings#notifications" className="mt-5 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
            Update preferences
          </Link>
        </aside>
      </section>
    </main>
  );
}
