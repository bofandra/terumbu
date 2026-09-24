"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  expeditionBookings,
  expeditionMediaSubmissions,
  expeditions,
  userNotifications
} from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { normalizeEvidenceUrl, readUploadedImageAsDataUrl } from "@/lib/storage";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeHttpsUrl(value: string) {
  if (!value.startsWith("https://")) return null;
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

export async function submitExpeditionMediaAction(formData: FormData) {
  const user = await requireUser("/dashboard/expeditions");
  const bookingId = text(formData, "bookingId");
  const mediaType = text(formData, "mediaType") === "video" ? "video" : "photo";
  const caption = text(formData, "caption").slice(0, 1000) || null;
  const urlValue = text(formData, "mediaUrl");

  const [booking] = await db
    .select({
      id: expeditionBookings.id,
      expeditionId: expeditionBookings.expeditionId,
      status: expeditionBookings.status,
      expeditionTitle: expeditions.title
    })
    .from(expeditionBookings)
    .innerJoin(expeditions, eq(expeditionBookings.expeditionId, expeditions.id))
    .where(and(eq(expeditionBookings.id, bookingId), eq(expeditionBookings.userId, user.id)))
    .limit(1);

  if (!booking || booking.status !== "completed") {
    redirect("/dashboard/expeditions?error=media-eligible");
  }

  let mediaUrl: string | null = null;

  if (mediaType === "photo") {
    const upload = await readUploadedImageAsDataUrl(formData.get("mediaFile"));

    if (upload.error) {
      redirect(`/dashboard/expeditions?error=media-${upload.error}`);
    }

    mediaUrl = upload.dataUrl ?? normalizeEvidenceUrl(urlValue);
  } else {
    mediaUrl = safeHttpsUrl(urlValue);
  }

  if (!mediaUrl) {
    redirect("/dashboard/expeditions?error=media-missing");
  }

  await db.insert(expeditionMediaSubmissions).values({
    expeditionId: booking.expeditionId,
    bookingId: booking.id,
    userId: user.id,
    mediaType,
    mediaUrl,
    caption,
    status: "pending",
    updatedAt: new Date()
  });

  redirect("/dashboard/expeditions?saved=media");
}

export async function moderateExpeditionMediaAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/expeditions/media");
  const submissionId = text(formData, "submissionId");
  const decision = text(formData, "decision");
  const rejectionReason = text(formData, "rejectionReason").slice(0, 1000) || null;
  const nextStatus = decision === "publish" ? "published" : decision === "reject" ? "rejected" : null;

  if (!submissionId || !nextStatus) {
    redirect("/admin/expeditions/media?error=invalid");
  }

  const [submission] = await db
    .select({
      id: expeditionMediaSubmissions.id,
      expeditionId: expeditionMediaSubmissions.expeditionId,
      bookingId: expeditionMediaSubmissions.bookingId,
      userId: expeditionMediaSubmissions.userId,
      previousStatus: expeditionMediaSubmissions.status,
      expeditionTitle: expeditions.title,
      expeditionSlug: expeditions.slug
    })
    .from(expeditionMediaSubmissions)
    .innerJoin(expeditions, eq(expeditionMediaSubmissions.expeditionId, expeditions.id))
    .where(eq(expeditionMediaSubmissions.id, submissionId))
    .limit(1);

  if (!submission) {
    redirect("/admin/expeditions/media?error=missing");
  }

  if (nextStatus === "rejected" && !rejectionReason) {
    redirect("/admin/expeditions/media?error=reason");
  }

  const now = new Date();

  await db
    .update(expeditionMediaSubmissions)
    .set({
      status: nextStatus,
      reviewedByUserId: actor.id,
      reviewedAt: now,
      rejectionReason: nextStatus === "rejected" ? rejectionReason : null,
      updatedAt: now
    })
    .where(eq(expeditionMediaSubmissions.id, submission.id));

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: `expedition_media.${nextStatus}`,
    entityType: "expedition_media_submission",
    entityId: submission.id,
    metadata: {
      expeditionId: submission.expeditionId,
      bookingId: submission.bookingId,
      previousStatus: submission.previousStatus,
      status: nextStatus,
      rejectionReason
    },
    createdAt: now
  });

  if (submission.userId) {
    await db
      .insert(userNotifications)
      .values({
        userId: submission.userId,
        notificationCode: `expedition-media-${submission.id}-${nextStatus}`,
        category: "Traveler media",
        title: nextStatus === "published" ? "Your expedition media is now public" : "Your expedition media needs a change",
        message:
          nextStatus === "published"
            ? `Your traveler media from ${submission.expeditionTitle} was approved for the public expedition page.`
            : `Your traveler media from ${submission.expeditionTitle} was not approved. ${rejectionReason ?? ""}`,
        href: nextStatus === "published" ? `/expeditions/${submission.expeditionSlug}#traveler-moments` : "/dashboard/expeditions",
        sourceType: "expedition_media_submission",
        sourceId: submission.id,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoNothing();
  }

  redirect(`/admin/expeditions/media?saved=${nextStatus}`);
}
