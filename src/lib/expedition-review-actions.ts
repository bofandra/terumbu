"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { adminAuditLogs, expeditionBookings, expeditionReviews } from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { normalizeExpeditionReviewStatus, safeAdminExpeditionReturnPath } from "@/lib/expedition-reviews";

function reviewText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function reviewRating(value: FormDataEntryValue | null) {
  const rating = Number(String(value ?? "").trim());

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return null;
  }

  return rating;
}

function redirectAdminExpedition(returnTo: string, key: "error" | "saved", value: string): never {
  const url = new URL(returnTo, "http://terumbu.local");

  url.searchParams.set(key, value);
  redirect(`${url.pathname}${url.search}`);
}

export async function submitExpeditionReviewAction(formData: FormData) {
  const user = await requireUser("/dashboard/expeditions");
  const bookingId = reviewText(formData, "bookingId");
  const rating = reviewRating(formData.get("rating"));
  const title = reviewText(formData, "title").slice(0, 160) || null;
  const body = reviewText(formData, "body");
  const now = new Date();

  if (!bookingId || !rating || body.length < 10) {
    redirect("/dashboard/expeditions?error=review");
  }

  const [booking] = await db
    .select({
      id: expeditionBookings.id,
      expeditionId: expeditionBookings.expeditionId,
      status: expeditionBookings.status
    })
    .from(expeditionBookings)
    .where(and(eq(expeditionBookings.id, bookingId), eq(expeditionBookings.userId, user.id)))
    .limit(1);

  if (!booking || booking.status !== "completed") {
    redirect("/dashboard/expeditions?error=review-eligible");
  }

  await db
    .insert(expeditionReviews)
    .values({
      expeditionId: booking.expeditionId,
      bookingId: booking.id,
      userId: user.id,
      rating,
      title,
      body,
      status: "pending",
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: expeditionReviews.bookingId,
      set: {
        rating,
        title,
        body,
        status: "pending",
        updatedAt: now
      }
    });

  redirect("/dashboard/expeditions?saved=review");
}

export async function moderateExpeditionReviewAction(formData: FormData) {
  const actor = await requireRole(["admin"], "/admin/expeditions");
  const reviewId = reviewText(formData, "reviewId");
  const status = normalizeExpeditionReviewStatus(formData.get("status"), "pending");
  const returnTo = safeAdminExpeditionReturnPath(formData.get("returnTo"));

  if (!reviewId) {
    redirectAdminExpedition(returnTo, "error", "review-invalid");
  }

  const [review] = await db
    .select({
      id: expeditionReviews.id,
      expeditionId: expeditionReviews.expeditionId,
      bookingId: expeditionReviews.bookingId,
      previousStatus: expeditionReviews.status
    })
    .from(expeditionReviews)
    .where(eq(expeditionReviews.id, reviewId))
    .limit(1);

  if (!review) {
    redirectAdminExpedition(returnTo, "error", "review-missing");
  }

  await db
    .update(expeditionReviews)
    .set({
      status,
      updatedAt: new Date()
    })
    .where(eq(expeditionReviews.id, review.id));

  await db.insert(adminAuditLogs).values({
    actorUserId: actor.id,
    action: "expedition_review.moderated",
    entityType: "expedition_review",
    entityId: review.id,
    metadata: {
      bookingId: review.bookingId,
      expeditionId: review.expeditionId,
      previousStatus: normalizeExpeditionReviewStatus(review.previousStatus, "pending"),
      status
    }
  });

  redirectAdminExpedition(returnTo, "saved", "review-moderated");
}
