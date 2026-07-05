"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import { expeditionBookings, expeditionReviews } from "@/db/schema";
import { requireUser } from "@/lib/auth";

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
      status: "published",
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: expeditionReviews.bookingId,
      set: {
        rating,
        title,
        body,
        status: "published",
        updatedAt: now
      }
    });

  redirect("/dashboard/expeditions?saved=review");
}
