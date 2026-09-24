"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { expeditionReminders, expeditions, userNotifications } from "@/db/schema";
import { requireUser } from "@/lib/auth";

function safeDelay(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "7"));
  return [1, 3, 7, 14, 30].includes(parsed) ? parsed : 7;
}

export async function scheduleSavedExpeditionReminderAction(formData: FormData) {
  const user = await requireUser("/dashboard/expeditions");
  const slug = String(formData.get("expeditionSlug") ?? "").trim();
  const delayDays = safeDelay(formData.get("delayDays"));
  const [expedition] = await db
    .select({ id: expeditions.id, title: expeditions.title })
    .from(expeditions)
    .where(and(eq(expeditions.slug, slug), eq(expeditions.status, "published")))
    .limit(1);

  if (!expedition) {
    redirect("/dashboard/expeditions?error=reminder");
  }

  const now = new Date();
  const remindAt = new Date(now.getTime() + delayDays * 24 * 60 * 60 * 1000);

  await db
    .insert(expeditionReminders)
    .values({
      userId: user.id,
      expeditionId: expedition.id,
      remindAt,
      channel: "in_app_email",
      status: "scheduled",
      updatedAt: now
    })
    .onConflictDoNothing();

  await db
    .insert(userNotifications)
    .values({
      userId: user.id,
      notificationCode: `expedition-reminder-scheduled-${expedition.id}-${remindAt.toISOString().slice(0, 10)}`,
      category: "Expedition reminder",
      title: `Reminder scheduled: ${expedition.title}`,
      message: `Terumbu will remind you to revisit this expedition in ${delayDays} day${delayDays === 1 ? "" : "s"}.`,
      href: `/expeditions/${slug}`,
      sourceType: "expedition",
      sourceId: expedition.id,
      updatedAt: now
    })
    .onConflictDoNothing();

  redirect("/dashboard/expeditions?saved=reminder");
}

export async function cancelExpeditionReminderAction(formData: FormData) {
  const user = await requireUser("/dashboard/expeditions");
  const reminderId = String(formData.get("reminderId") ?? "");

  await db
    .update(expeditionReminders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(expeditionReminders.id, reminderId), eq(expeditionReminders.userId, user.id)));

  redirect("/dashboard/expeditions?saved=reminder-cancelled");
}
