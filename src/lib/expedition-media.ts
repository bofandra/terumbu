import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  expeditionBookings,
  expeditionMediaSubmissions,
  expeditions,
  profiles,
  users
} from "@/db/schema";

export async function getUserExpeditionMediaSubmissions(userId: string) {
  return db
    .select({
      id: expeditionMediaSubmissions.id,
      bookingId: expeditionMediaSubmissions.bookingId,
      expeditionId: expeditionMediaSubmissions.expeditionId,
      expeditionTitle: expeditions.title,
      expeditionSlug: expeditions.slug,
      mediaType: expeditionMediaSubmissions.mediaType,
      mediaUrl: expeditionMediaSubmissions.mediaUrl,
      caption: expeditionMediaSubmissions.caption,
      status: expeditionMediaSubmissions.status,
      rejectionReason: expeditionMediaSubmissions.rejectionReason,
      createdAt: expeditionMediaSubmissions.createdAt,
      reviewedAt: expeditionMediaSubmissions.reviewedAt
    })
    .from(expeditionMediaSubmissions)
    .innerJoin(expeditions, eq(expeditionMediaSubmissions.expeditionId, expeditions.id))
    .where(eq(expeditionMediaSubmissions.userId, userId))
    .orderBy(desc(expeditionMediaSubmissions.createdAt));
}

export async function getAdminExpeditionMediaSubmissions() {
  return db
    .select({
      id: expeditionMediaSubmissions.id,
      bookingId: expeditionMediaSubmissions.bookingId,
      expeditionId: expeditionMediaSubmissions.expeditionId,
      expeditionTitle: expeditions.title,
      expeditionSlug: expeditions.slug,
      mediaType: expeditionMediaSubmissions.mediaType,
      mediaUrl: expeditionMediaSubmissions.mediaUrl,
      caption: expeditionMediaSubmissions.caption,
      status: expeditionMediaSubmissions.status,
      rejectionReason: expeditionMediaSubmissions.rejectionReason,
      createdAt: expeditionMediaSubmissions.createdAt,
      reviewedAt: expeditionMediaSubmissions.reviewedAt,
      submitterName: profiles.displayName,
      submitterUserName: users.name,
      submitterEmail: users.email,
      bookingCode: expeditionBookings.bookingCode
    })
    .from(expeditionMediaSubmissions)
    .innerJoin(expeditions, eq(expeditionMediaSubmissions.expeditionId, expeditions.id))
    .innerJoin(expeditionBookings, eq(expeditionMediaSubmissions.bookingId, expeditionBookings.id))
    .leftJoin(users, eq(expeditionMediaSubmissions.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .orderBy(
      sql`case when ${expeditionMediaSubmissions.status} = 'pending' then 0 else 1 end`,
      desc(expeditionMediaSubmissions.createdAt)
    );
}

export async function getPublishedExpeditionMedia(expeditionId: string) {
  return db
    .select({
      id: expeditionMediaSubmissions.id,
      mediaType: expeditionMediaSubmissions.mediaType,
      mediaUrl: expeditionMediaSubmissions.mediaUrl,
      caption: expeditionMediaSubmissions.caption,
      createdAt: expeditionMediaSubmissions.createdAt,
      travelerName: profiles.displayName,
      travelerUserName: users.name
    })
    .from(expeditionMediaSubmissions)
    .leftJoin(users, eq(expeditionMediaSubmissions.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(and(eq(expeditionMediaSubmissions.expeditionId, expeditionId), eq(expeditionMediaSubmissions.status, "published")))
    .orderBy(desc(expeditionMediaSubmissions.createdAt))
    .limit(12);
}
