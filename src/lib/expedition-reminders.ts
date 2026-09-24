import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  expeditionBookings,
  expeditionDepartures,
  expeditionReminders,
  expeditions,
  notificationPreferences,
  userNotifications,
  users
} from "@/db/schema";
import { sendTransactionalEmail } from "@/lib/email";
import { getPlatformDeliverySettings } from "@/lib/platform-settings";

export async function getUserExpeditionReminders(userId: string) {
  return db
    .select({
      id: expeditionReminders.id,
      expeditionTitle: expeditions.title,
      expeditionSlug: expeditions.slug,
      remindAt: expeditionReminders.remindAt,
      status: expeditionReminders.status,
      createdAt: expeditionReminders.createdAt
    })
    .from(expeditionReminders)
    .innerJoin(expeditions, eq(expeditionReminders.expeditionId, expeditions.id))
    .where(and(eq(expeditionReminders.userId, userId), eq(expeditionReminders.status, "scheduled")))
    .orderBy(expeditionReminders.remindAt)
    .limit(20);
}

async function upsertReminderNotification(input: {
  userId: string;
  code: string;
  title: string;
  message: string;
  href: string;
  sourceId: string;
  now: Date;
}) {
  await db
    .insert(userNotifications)
    .values({
      userId: input.userId,
      notificationCode: input.code,
      category: "Expedition reminder",
      title: input.title,
      message: input.message,
      href: input.href,
      sourceType: "expedition",
      sourceId: input.sourceId,
      createdAt: input.now,
      updatedAt: input.now
    })
    .onConflictDoNothing();
}

export async function processDueExpeditionReminders(now = new Date()) {
  const settings = await getPlatformDeliverySettings();

  if (!settings.expeditionReminders) {
    return { scheduledSent: 0, abandonedSent: 0, suppressed: 0 };
  }

  const due = await db
    .select({
      id: expeditionReminders.id,
      userId: expeditionReminders.userId,
      expeditionId: expeditionReminders.expeditionId,
      remindAt: expeditionReminders.remindAt,
      expeditionTitle: expeditions.title,
      expeditionSlug: expeditions.slug,
      email: users.email,
      name: users.name,
      preferenceEnabled: notificationPreferences.expeditionReminders
    })
    .from(expeditionReminders)
    .innerJoin(expeditions, eq(expeditionReminders.expeditionId, expeditions.id))
    .innerJoin(users, eq(expeditionReminders.userId, users.id))
    .leftJoin(notificationPreferences, eq(notificationPreferences.userId, expeditionReminders.userId))
    .where(and(eq(expeditionReminders.status, "scheduled"), lte(expeditionReminders.remindAt, now)))
    .orderBy(expeditionReminders.remindAt)
    .limit(100);

  let scheduledSent = 0;
  let suppressed = 0;

  for (const reminder of due) {
    if (reminder.preferenceEnabled === false) {
      await db.update(expeditionReminders).set({ status: "suppressed", updatedAt: now }).where(eq(expeditionReminders.id, reminder.id));
      suppressed += 1;
      continue;
    }

    await upsertReminderNotification({
      userId: reminder.userId,
      code: `expedition-reminder-${reminder.id}`,
      title: `Revisit ${reminder.expeditionTitle}`,
      message: "You saved this conservation expedition. Check current departures, seats, and travel details before dates fill up.",
      href: `/expeditions/${reminder.expeditionSlug}`,
      sourceId: reminder.expeditionId,
      now
    });

    await sendTransactionalEmail({
      userId: reminder.userId,
      recipientEmail: reminder.email,
      subject: `Your Terumbu reminder: ${reminder.expeditionTitle}`,
      template: "saved_expedition_reminder",
      payload: {
        name: reminder.name ?? "Traveler",
        expedition: reminder.expeditionTitle,
        href: `/expeditions/${reminder.expeditionSlug}`
      }
    });

    await db
      .update(expeditionReminders)
      .set({ status: "sent", sentAt: now, updatedAt: now })
      .where(eq(expeditionReminders.id, reminder.id));
    scheduledSent += 1;
  }

  const abandonedCutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const abandonedFloor = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const abandoned = await db
    .select({
      id: expeditionBookings.id,
      userId: expeditionBookings.userId,
      expeditionId: expeditionBookings.expeditionId,
      expeditionTitle: expeditions.title,
      expeditionSlug: expeditions.slug,
      contactEmail: expeditionBookings.contactEmail,
      contactName: expeditionBookings.contactName,
      bookedAt: expeditionBookings.bookedAt,
      startsAt: expeditionDepartures.startsAt,
      preferenceEnabled: notificationPreferences.expeditionReminders
    })
    .from(expeditionBookings)
    .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
    .innerJoin(expeditionDepartures, eq(expeditionBookings.departureId, expeditionDepartures.id))
    .leftJoin(notificationPreferences, eq(notificationPreferences.userId, expeditionBookings.userId))
    .where(
      and(
        sql`${expeditionBookings.userId} is not null`,
        eq(expeditionBookings.status, "pending_payment"),
        inArray(expeditionBookings.paymentStatus, ["created", "pending"]),
        lte(expeditionBookings.bookedAt, abandonedCutoff),
        gte(expeditionBookings.bookedAt, abandonedFloor),
        sql`coalesce(${expeditionBookings.metadata}->>'abandonedReminderSentAt', '') = ''`
      )
    )
    .orderBy(desc(expeditionBookings.bookedAt))
    .limit(100);

  let abandonedSent = 0;

  for (const booking of abandoned) {
    if (!booking.userId || booking.preferenceEnabled === false) continue;

    await upsertReminderNotification({
      userId: booking.userId,
      code: `abandoned-expedition-${booking.id}`,
      title: `Complete your ${booking.expeditionTitle} booking`,
      message: "Your expedition booking is still pending. Recheck availability and complete the current payment verification flow when ready.",
      href: "/dashboard/expeditions",
      sourceId: booking.expeditionId,
      now
    });

    await sendTransactionalEmail({
      userId: booking.userId,
      recipientEmail: booking.contactEmail,
      subject: `Your ${booking.expeditionTitle} booking is still pending`,
      template: "expedition_booking_follow_up",
      payload: {
        name: booking.contactName,
        expedition: booking.expeditionTitle,
        departure: booking.startsAt.toISOString(),
        dashboard: "/dashboard/expeditions"
      }
    });

    await db
      .update(expeditionBookings)
      .set({
        metadata: sql`coalesce(${expeditionBookings.metadata}, '{}'::jsonb) || jsonb_build_object('abandonedReminderSentAt', ${now.toISOString()})`
      })
      .where(eq(expeditionBookings.id, booking.id));
    abandonedSent += 1;
  }

  return { scheduledSent, abandonedSent, suppressed };
}
