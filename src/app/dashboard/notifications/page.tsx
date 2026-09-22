import { Bell } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Notifications</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Activity</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
            Activity from your donations, expeditions, Academy, and account.
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <input type="hidden" name="next" value="/dashboard/notifications" />
            <Button type="submit" tone="light">
              Mark all read
            </Button>
          </form>
        ) : null}
      </header>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell size={20} aria-hidden="true" className="text-coral-500" />
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">Inbox</h2>
          </div>
          <span className="text-sm font-semibold text-ocean-900/54">
            {unreadCount > 0 ? `${unreadCount.toLocaleString("id-ID")} unread` : "All caught up"}
          </span>
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
              No notifications yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
