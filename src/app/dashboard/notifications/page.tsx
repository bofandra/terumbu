import { Bell } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/retention-actions";
import { getPreferredLocale, type SupportedLocale } from "@/lib/user-preferences";

export const metadata = {
  title: "Notifications"
};

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined, locale: SupportedLocale) {
  if (!value) {
    return locale === "id" ? "Menunggu" : "Pending";
  }

  return value.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { dateStyle: "medium" });
}

function categoryLabel(category: string, locale: SupportedLocale) {
  if (locale !== "id") {
    return category;
  }

  const labels: Record<string, string> = {
    "Corporate reports": "Laporan corporate",
    "Supported campaign": "Kampanye yang didukung",
    "Verified campaign evidence": "Bukti kampanye terverifikasi",
    "Sponsorship monitoring": "Monitoring sponsorship",
    "Followed campaigns": "Kampanye yang diikuti",
    "Impact activity": "Aktivitas dampak",
    Activity: "Aktivitas",
    Expeditions: "Ekspedisi",
    Academy: "Academy"
  };

  return labels[category] ?? category;
}

function localizeMessage(message: string, locale: SupportedLocale) {
  if (locale !== "id") {
    return message;
  }

  return message
    .replace(/ published a new field activity for a campaign you support.$/, " mempublikasikan aktivitas lapangan baru untuk kampanye yang kamu dukung.")
    .replace(/ has new verified field evidence.$/, " memiliki bukti lapangan terverifikasi baru.")
    .replace(/ has a new monitoring update.$/, " memiliki pembaruan monitoring baru.")
    .replace(/ published new activity.$/, " mempublikasikan aktivitas baru.")
    .replace(/ is ready to review.$/, " siap ditinjau.")
    .replace(/ preparation is (\d+)\/(\d+) complete.$/, " persiapannya sudah $1/$2 selesai.")
    .replace(/ certificate is available.$/, " sertifikatnya sudah tersedia.")
    .replace(/ is verified.$/, " sudah terverifikasi.")
    .replace(/ is published.$/, " sudah dipublikasikan.");
}

export default async function DashboardNotificationsPage() {
  const user = await requireUser("/dashboard/notifications");
  const [data, locale] = await Promise.all([
    getDashboardData(user.id),
    getPreferredLocale()
  ]);
  const numberLocale = locale === "id" ? "id-ID" : "en-US";
  const unreadCount = data.notifications.filter((notification) => notification.unread).length;
  const labels =
    locale === "id"
      ? {
          eyebrow: "Notifikasi",
          title: "Aktivitas yang perlu kamu ketahui",
          subtitle: "Pembaruan dari donasi, ekspedisi, Academy, evidence, dan akunmu dalam satu inbox.",
          markAllRead: "Tandai semua dibaca",
          inbox: "Inbox",
          unread: "belum dibaca",
          allCaughtUp: "Semua sudah dibaca",
          unreadAria: "Belum dibaca",
          markRead: "Tandai dibaca",
          empty: "Belum ada notifikasi.",
          emptyBody: "Pembaruan penting akan muncul di sini saat ada aktivitas baru pada kampanye, ekspedisi, Academy, atau akunmu."
        }
      : {
          eyebrow: "Notifications",
          title: "Activity that needs your attention",
          subtitle: "Updates from donations, expeditions, Academy, evidence, and your account in one inbox.",
          markAllRead: "Mark all read",
          inbox: "Inbox",
          unread: "unread",
          allCaughtUp: "All caught up",
          unreadAria: "Unread",
          markRead: "Mark read",
          empty: "No notifications yet.",
          emptyBody: "Important updates will appear here when there is new activity in campaigns, expeditions, Academy, or your account."
        };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">{labels.subtitle}</p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <input type="hidden" name="next" value="/dashboard/notifications" />
            <Button type="submit" tone="light">
              {labels.markAllRead}
            </Button>
          </form>
        ) : null}
      </header>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell size={20} aria-hidden="true" className="text-coral-500" />
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">{labels.inbox}</h2>
          </div>
          <span className="text-sm font-semibold text-ocean-900/54">
            {unreadCount > 0 ? `${unreadCount.toLocaleString(numberLocale)} ${labels.unread}` : labels.allCaughtUp}
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {data.notifications.length > 0 ? (
            data.notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border p-4 ${notification.unread ? "border-coral-500/20 bg-coral-100/20" : "border-ocean-900/10 bg-sand-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{categoryLabel(notification.category, locale)}</p>
                    <Link href={notification.href} className="mt-2 block font-bold text-ocean-900 hover:text-coral-700">
                      {localizeMessage(notification.message, locale)}
                    </Link>
                    <p className="mt-2 text-xs font-semibold text-ocean-900/54">{formatDate(notification.timestamp, locale)}</p>
                  </div>
                  {notification.unread ? <span className="mt-1 size-2 shrink-0 rounded-full bg-coral-500" aria-label={labels.unreadAria} /> : null}
                </div>
                {notification.unread ? (
                  <form action={markNotificationReadAction} className="mt-3">
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <input type="hidden" name="next" value="/dashboard/notifications" />
                    <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">
                      {labels.markRead}
                    </Button>
                  </form>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-ocean-900/14 p-4">
              <p className="font-bold text-ocean-900">{labels.empty}</p>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">{labels.emptyBody}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
