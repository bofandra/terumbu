"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/db/client";
import {
  adminAuditLogs,
  communityChallengeParticipations,
  communityChallengeProgress,
  communityChallenges,
  communityChapterMemberships,
  communityChapters,
  communityComments,
  communityEventRegistrations,
  communityEvents,
  communityPosts,
  communityReactions,
  communityReports,
  communityScoreEvents,
  impactPassportItems,
  impactPassports,
  userNotifications
} from "@/db/schema";
import { getUserRoles, requireRole, requireUser, safeRedirectPath } from "@/lib/auth";
import {
  communityChallengeProgressStatus,
  communityEventRegistrationAvailability,
  communityScoreForReason,
  communitySlug,
  normalizeCommunityModerationAction,
  normalizeCommunityReactionType,
  normalizeCommunityReportStatus,
  normalizeCommunityTargetType,
  type CommunityTargetType
} from "@/lib/community";
import { readUploadedImageAsDataUrl } from "@/lib/storage";

function textValue(value: FormDataEntryValue | null, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function nullableText(formData: FormData, key: string, maxLength = 500) {
  const value = textValue(formData.get(key), maxLength);

  return value || null;
}

function checked(value: FormDataEntryValue | null) {
  return value === "on" || value === "1" || value === "true";
}

function positiveInteger(value: FormDataEntryValue | null, fallback: number, max = 1_000_000) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(max, Math.floor(parsed));
}

function dateFromInput(value: FormDataEntryValue | null) {
  const raw = textValue(value, 80);
  const date = raw ? new Date(raw) : null;

  return date && Number.isFinite(date.getTime()) ? date : null;
}

function nextPath(formData: FormData, fallback: string) {
  return safeRedirectPath(formData.get("next"), fallback);
}

function withStatus(path: string, key: "saved" | "error", value: string) {
  const url = new URL(path, "https://terumbu.local");
  url.searchParams.delete("saved");
  url.searchParams.delete("error");
  url.searchParams.set(key, value);

  return `${url.pathname}${url.search}${url.hash}`;
}

async function uploadedCommunityImage(formData: FormData, fallback: string) {
  const upload = await readUploadedImageAsDataUrl(formData.get("imageFile"));

  if (upload.error) {
    redirect(withStatus(nextPath(formData, fallback), "error", `image-${upload.error}`));
  }

  return upload.dataUrl;
}

async function uniqueSlugFor(table: "post" | "event" | "challenge", title: string) {
  const base = communitySlug(title, table);

  for (let index = 0; index < 40; index += 1) {
    const slug = index === 0 ? base : `${base}-${index + 1}`;
    const [existing] =
      table === "post"
        ? await db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.slug, slug)).limit(1)
        : table === "event"
          ? await db.select({ id: communityEvents.id }).from(communityEvents).where(eq(communityEvents.slug, slug)).limit(1)
          : await db.select({ id: communityChallenges.id }).from(communityChallenges).where(eq(communityChallenges.slug, slug)).limit(1);

    if (!existing) {
      return slug;
    }
  }

  return `${base}-${Date.now()}`;
}

async function createNotification(input: {
  userId: string | null | undefined;
  notificationCode: string;
  category: string;
  title: string;
  message: string;
  href: string;
  sourceType?: string | null;
  sourceId?: string | null;
}) {
  if (!input.userId) {
    return;
  }

  const now = new Date();

  await db
    .insert(userNotifications)
    .values({
      userId: input.userId,
      notificationCode: input.notificationCode,
      category: input.category,
      title: input.title,
      message: input.message,
      href: input.href,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [userNotifications.userId, userNotifications.notificationCode],
      set: {
        category: input.category,
        title: input.title,
        message: input.message,
        href: input.href,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        updatedAt: now
      }
    });
}

async function recordCommunityScore(userId: string | null | undefined, sourceType: string, sourceId: string, reason: string) {
  if (!userId) {
    return;
  }

  const score = communityScoreForReason(reason);

  if (score <= 0) {
    return;
  }

  await db
    .insert(communityScoreEvents)
    .values({
      userId,
      sourceType,
      sourceId,
      score,
      reason
    })
    .onConflictDoNothing({
      target: [communityScoreEvents.userId, communityScoreEvents.sourceType, communityScoreEvents.sourceId]
    });
}

async function addCommunityPassportItem(input: {
  userId: string;
  sourceType: "community_event" | "community_challenge";
  sourceId: string;
  title: string;
  description: string;
  evidenceUrl: string;
  occurredAt: Date;
}) {
  const [passport] = await db.select({ id: impactPassports.id }).from(impactPassports).where(eq(impactPassports.userId, input.userId)).limit(1);

  if (!passport) {
    return;
  }

  await db
    .insert(impactPassportItems)
    .values({
      passportId: passport.id,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      itemType: "volunteer",
      title: input.title,
      description: input.description,
      evidenceUrl: input.evidenceUrl,
      occurredAt: input.occurredAt
    })
    .onConflictDoUpdate({
      target: [impactPassportItems.passportId, impactPassportItems.sourceType, impactPassportItems.sourceId],
      set: {
        title: input.title,
        description: input.description,
        evidenceUrl: input.evidenceUrl,
        occurredAt: input.occurredAt
      }
    });
}

async function targetRecord(targetType: CommunityTargetType, targetId: string) {
  if (targetType === "post") {
    const [post] = await db
      .select({
        id: communityPosts.id,
        title: communityPosts.title,
        slug: communityPosts.slug,
        ownerUserId: communityPosts.authorUserId,
        status: communityPosts.status,
        hiddenAt: communityPosts.hiddenAt,
        deletedAt: communityPosts.deletedAt
      })
      .from(communityPosts)
      .where(eq(communityPosts.id, targetId))
      .limit(1);

    return post ? { ...post, href: `/community/posts/${post.slug}` } : null;
  }

  if (targetType === "event") {
    const [event] = await db
      .select({
        id: communityEvents.id,
        title: communityEvents.title,
        slug: communityEvents.slug,
        ownerUserId: communityEvents.authorUserId,
        status: communityEvents.status,
        hiddenAt: communityEvents.hiddenAt,
        deletedAt: communityEvents.deletedAt
      })
      .from(communityEvents)
      .where(eq(communityEvents.id, targetId))
      .limit(1);

    return event ? { ...event, href: `/community/events/${event.slug}` } : null;
  }

  if (targetType === "challenge") {
    const [challenge] = await db
      .select({
        id: communityChallenges.id,
        title: communityChallenges.title,
        slug: communityChallenges.slug,
        ownerUserId: communityChallenges.authorUserId,
        status: communityChallenges.status,
        hiddenAt: communityChallenges.hiddenAt,
        deletedAt: communityChallenges.deletedAt
      })
      .from(communityChallenges)
      .where(eq(communityChallenges.id, targetId))
      .limit(1);

    return challenge ? { ...challenge, href: `/community/challenges/${challenge.slug}` } : null;
  }

  const [comment] = await db
    .select({
      id: communityComments.id,
      title: sql<string>`'Comment'`,
      slug: sql<string>`''`,
      ownerUserId: communityComments.authorUserId,
      status: communityComments.status,
      hiddenAt: communityComments.hiddenAt,
      deletedAt: communityComments.deletedAt
    })
    .from(communityComments)
    .where(eq(communityComments.id, targetId))
    .limit(1);

  return comment ? { ...comment, href: "/community" } : null;
}

async function publicTargetRecord(targetType: CommunityTargetType, targetId: string) {
  const target = await targetRecord(targetType, targetId);

  if (!target || target.hiddenAt || target.deletedAt || ["hidden", "archived", "deleted", "cancelled"].includes(target.status)) {
    return null;
  }

  return target;
}

async function canManageCommunityTarget(userId: string, ownerUserId: string | null | undefined) {
  if (ownerUserId === userId) {
    return true;
  }

  const roles = await getUserRoles(userId);

  return roles.includes("admin");
}

export async function createCommunityPostAction(formData: FormData) {
  const createPath = "/dashboard/community/new?type=post";
  const user = await requireUser(createPath);
  const title = textValue(formData.get("title"), 220);
  const body = textValue(formData.get("body"), 5000);
  const postType = textValue(formData.get("postType"), 80) || "story";
  const chapterId = nullableText(formData, "chapterId", 80);
  const mediaUrl = await uploadedCommunityImage(formData, createPath);

  if (!title || !body) {
    redirect(withStatus(createPath, "error", "post-invalid"));
  }

  const slug = await uniqueSlugFor("post", title);
  const now = new Date();
  const [post] = await db
    .insert(communityPosts)
    .values({
      authorUserId: user.id,
      chapterId,
      title,
      slug,
      body,
      postType,
      status: "published",
      mediaUrl,
      publishedAt: now,
      updatedAt: now
    })
    .returning({ id: communityPosts.id, slug: communityPosts.slug });

  await recordCommunityScore(user.id, "community_post", post.id, "post_created");
  await createNotification({
    userId: user.id,
    notificationCode: `community-post-${post.id}`,
    category: "Community",
    title,
    message: `${title} was published to the community feed.`,
    href: `/community/posts/${post.slug}`,
    sourceType: "community_post",
    sourceId: post.id
  });

  redirect("/dashboard/community?saved=post");
}

export async function createCommunityEventAction(formData: FormData) {
  const createPath = "/dashboard/community/new?type=event";
  const user = await requireUser(createPath);
  const title = textValue(formData.get("title"), 220);
  const summary = textValue(formData.get("summary"), 800);
  const description = textValue(formData.get("description"), 5000);
  const eventType = textValue(formData.get("eventType"), 80) || "volunteer";
  const chapterId = nullableText(formData, "chapterId", 80);
  const startsAt = dateFromInput(formData.get("startsAt"));
  const endsAt = dateFromInput(formData.get("endsAt"));
  const location = textValue(formData.get("location"), 220);
  const capacity = positiveInteger(formData.get("capacity"), 40, 10_000);
  const waitlistEnabled = checked(formData.get("waitlistEnabled"));
  const imageUrl = await uploadedCommunityImage(formData, createPath);

  if (!title || !summary || !description || !startsAt || !endsAt || endsAt <= startsAt || !location) {
    redirect(withStatus(createPath, "error", "event-invalid"));
  }

  const slug = await uniqueSlugFor("event", title);
  const now = new Date();
  const [event] = await db
    .insert(communityEvents)
    .values({
      authorUserId: user.id,
      chapterId,
      title,
      slug,
      summary,
      description,
      eventType,
      status: "published",
      startsAt,
      endsAt,
      location,
      capacity,
      waitlistEnabled,
      imageUrl,
      publishedAt: now,
      updatedAt: now
    })
    .returning({ id: communityEvents.id, slug: communityEvents.slug });

  await recordCommunityScore(user.id, "community_event", event.id, "post_created");
  redirect("/dashboard/community?saved=event");
}

export async function createCommunityChallengeAction(formData: FormData) {
  const createPath = "/dashboard/community/new?type=challenge";
  const user = await requireUser(createPath);
  const title = textValue(formData.get("title"), 220);
  const summary = textValue(formData.get("summary"), 800);
  const description = textValue(formData.get("description"), 5000);
  const challengeType = textValue(formData.get("challengeType"), 80) || "volunteer";
  const chapterId = nullableText(formData, "chapterId", 80);
  const startsAt = dateFromInput(formData.get("startsAt"));
  const endsAt = dateFromInput(formData.get("endsAt"));
  const goalMetric = textValue(formData.get("goalMetric"), 120) || "actions";
  const goalTarget = positiveInteger(formData.get("goalTarget"), 1, 1_000_000);
  const unit = textValue(formData.get("unit"), 80) || "actions";
  const imageUrl = await uploadedCommunityImage(formData, createPath);

  if (!title || !summary || !description || (startsAt && endsAt && endsAt <= startsAt)) {
    redirect(withStatus(createPath, "error", "challenge-invalid"));
  }

  const slug = await uniqueSlugFor("challenge", title);
  const now = new Date();
  const [challenge] = await db
    .insert(communityChallenges)
    .values({
      authorUserId: user.id,
      chapterId,
      title,
      slug,
      summary,
      description,
      challengeType,
      status: "open",
      startsAt,
      endsAt,
      goalMetric,
      goalTarget,
      unit,
      imageUrl,
      publishedAt: now,
      updatedAt: now
    })
    .returning({ id: communityChallenges.id, slug: communityChallenges.slug });

  await recordCommunityScore(user.id, "community_challenge", challenge.id, "post_created");
  redirect("/dashboard/community?saved=challenge");
}

export async function deleteCommunityPostAction(formData: FormData) {
  const user = await requireUser("/dashboard/community");
  const postId = textValue(formData.get("postId"), 80);
  const next = nextPath(formData, "/dashboard/community");
  const target = await targetRecord("post", postId);

  if (!target || !(await canManageCommunityTarget(user.id, target.ownerUserId))) {
    redirect(withStatus(next, "error", "permission"));
  }

  await db
    .update(communityPosts)
    .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(communityPosts.id, postId));

  redirect(withStatus(next, "saved", "deleted"));
}

export async function deleteCommunityEventAction(formData: FormData) {
  const user = await requireUser("/dashboard/community");
  const eventId = textValue(formData.get("eventId"), 80);
  const next = nextPath(formData, "/dashboard/community");
  const target = await targetRecord("event", eventId);

  if (!target || !(await canManageCommunityTarget(user.id, target.ownerUserId))) {
    redirect(withStatus(next, "error", "permission"));
  }

  await db
    .update(communityEvents)
    .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(communityEvents.id, eventId));

  redirect(withStatus(next, "saved", "deleted"));
}

export async function deleteCommunityChallengeAction(formData: FormData) {
  const user = await requireUser("/dashboard/community");
  const challengeId = textValue(formData.get("challengeId"), 80);
  const next = nextPath(formData, "/dashboard/community");
  const target = await targetRecord("challenge", challengeId);

  if (!target || !(await canManageCommunityTarget(user.id, target.ownerUserId))) {
    redirect(withStatus(next, "error", "permission"));
  }

  await db
    .update(communityChallenges)
    .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(communityChallenges.id, challengeId));

  redirect(withStatus(next, "saved", "deleted"));
}

export async function createCommunityCommentAction(formData: FormData) {
  const targetType = normalizeCommunityTargetType(formData.get("targetType"));
  const targetId = textValue(formData.get("targetId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);
  const parentCommentId = nullableText(formData, "parentCommentId", 80);
  const body = textValue(formData.get("body"), 3000);
  const target = await publicTargetRecord(targetType, targetId);

  if (!target || !body) {
    redirect(withStatus(next, "error", "comment"));
  }

  if (parentCommentId) {
    const [parent] = await db
      .select({ id: communityComments.id, targetType: communityComments.targetType, targetId: communityComments.targetId })
      .from(communityComments)
      .where(and(eq(communityComments.id, parentCommentId), eq(communityComments.targetType, targetType), eq(communityComments.targetId, targetId)))
      .limit(1);

    if (!parent) {
      redirect(withStatus(next, "error", "comment"));
    }
  }

  const [comment] = await db
    .insert(communityComments)
    .values({
      targetType,
      targetId,
      parentCommentId,
      authorUserId: user.id,
      body,
      status: "published",
      updatedAt: new Date()
    })
    .returning({ id: communityComments.id });

  await recordCommunityScore(user.id, "community_comment", comment.id, "comment_created");

  if (target.ownerUserId && target.ownerUserId !== user.id) {
    await createNotification({
      userId: target.ownerUserId,
      notificationCode: `community-comment-${comment.id}`,
      category: "Community",
      title: target.title,
      message: `${user.displayName ?? user.name ?? user.email} commented on ${target.title}.`,
      href: target.href,
      sourceType: "community_comment",
      sourceId: comment.id
    });
  }

  redirect(withStatus(next, "saved", "comment"));
}

export async function reactToCommunityTargetAction(formData: FormData) {
  const targetType = normalizeCommunityTargetType(formData.get("targetType"));
  const targetId = textValue(formData.get("targetId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);
  const reactionType = normalizeCommunityReactionType(formData.get("reactionType"));
  const target = await publicTargetRecord(targetType, targetId);

  if (!target) {
    redirect(withStatus(next, "error", "reaction"));
  }

  await db
    .insert(communityReactions)
    .values({ targetType, targetId, userId: user.id, reactionType })
    .onConflictDoUpdate({
      target: [communityReactions.userId, communityReactions.targetType, communityReactions.targetId],
      set: { reactionType }
    });

  redirect(withStatus(next, "saved", "reaction"));
}

export async function removeCommunityReactionAction(formData: FormData) {
  const targetType = normalizeCommunityTargetType(formData.get("targetType"));
  const targetId = textValue(formData.get("targetId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);

  await db.delete(communityReactions).where(and(eq(communityReactions.userId, user.id), eq(communityReactions.targetType, targetType), eq(communityReactions.targetId, targetId)));

  redirect(withStatus(next, "saved", "reaction"));
}

export async function reportCommunityTargetAction(formData: FormData) {
  const targetType = normalizeCommunityTargetType(formData.get("targetType"));
  const targetId = textValue(formData.get("targetId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);
  const reason = textValue(formData.get("reason"), 120) || "safety";
  const detail = nullableText(formData, "detail", 1000);
  const target = await targetRecord(targetType, targetId);

  if (!target) {
    redirect(withStatus(next, "error", "report"));
  }

  await db
    .insert(communityReports)
    .values({
      targetType,
      targetId,
      reporterUserId: user.id,
      reason,
      detail,
      status: "open",
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [communityReports.reporterUserId, communityReports.targetType, communityReports.targetId],
      set: {
        reason,
        detail,
        status: "open",
        updatedAt: new Date()
      }
    });

  redirect(withStatus(next, "saved", "report"));
}

export async function joinCommunityChapterAction(formData: FormData) {
  const chapterId = textValue(formData.get("chapterId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);
  const [chapter] = await db.select({ id: communityChapters.id }).from(communityChapters).where(and(eq(communityChapters.id, chapterId), eq(communityChapters.status, "published"))).limit(1);

  if (!chapter) {
    redirect(withStatus(next, "error", "chapter"));
  }

  await db
    .insert(communityChapterMemberships)
    .values({
      chapterId,
      userId: user.id,
      status: "active",
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [communityChapterMemberships.chapterId, communityChapterMemberships.userId],
      set: {
        status: "active",
        updatedAt: new Date()
      }
    });

  redirect(withStatus(next, "saved", "chapter"));
}

export async function leaveCommunityChapterAction(formData: FormData) {
  const chapterId = textValue(formData.get("chapterId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);

  await db
    .update(communityChapterMemberships)
    .set({ status: "left", updatedAt: new Date() })
    .where(and(eq(communityChapterMemberships.chapterId, chapterId), eq(communityChapterMemberships.userId, user.id)));

  redirect(withStatus(next, "saved", "chapter"));
}

export async function registerCommunityEventAction(formData: FormData) {
  const eventId = textValue(formData.get("eventId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);
  const [event] = await db
    .select({
      id: communityEvents.id,
      title: communityEvents.title,
      capacity: communityEvents.capacity,
      status: communityEvents.status,
      waitlistEnabled: communityEvents.waitlistEnabled,
      authorUserId: communityEvents.authorUserId,
      registeredCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} in ('registered','attended')), 0)`
    })
    .from(communityEvents)
    .where(and(eq(communityEvents.id, eventId), isNull(communityEvents.hiddenAt), isNull(communityEvents.deletedAt)))
    .limit(1);

  if (!event) {
    redirect(withStatus(next, "error", "event"));
  }

  const availability = communityEventRegistrationAvailability({
    status: event.status,
    capacity: event.capacity,
    registeredCount: Number(event.registeredCount ?? 0),
    waitlistEnabled: event.waitlistEnabled
  });

  if (!availability.canRegister || !availability.nextStatus) {
    redirect(withStatus(next, "error", "event-full"));
  }

  const [registration] = await db
    .insert(communityEventRegistrations)
    .values({
      eventId,
      userId: user.id,
      status: availability.nextStatus,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [communityEventRegistrations.eventId, communityEventRegistrations.userId],
      set: {
        status: availability.nextStatus,
        updatedAt: new Date()
      }
    })
    .returning({ id: communityEventRegistrations.id, status: communityEventRegistrations.status });

  await recordCommunityScore(user.id, "community_event_registration", registration.id, "event_registered");
  await createNotification({
    userId: user.id,
    notificationCode: `community-event-registration-${registration.id}`,
    category: "Community event",
    title: event.title,
    message: registration.status === "waitlisted" ? `You joined the waitlist for ${event.title}.` : `You registered for ${event.title}.`,
    href: next,
    sourceType: "community_event",
    sourceId: event.id
  });

  redirect(withStatus(next, "saved", "event"));
}

export async function cancelCommunityEventRegistrationAction(formData: FormData) {
  const eventId = textValue(formData.get("eventId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);

  await db
    .update(communityEventRegistrations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(communityEventRegistrations.eventId, eventId), eq(communityEventRegistrations.userId, user.id)));

  redirect(withStatus(next, "saved", "event"));
}

export async function markCommunityEventAttendanceAction(formData: FormData) {
  const user = await requireUser("/community");
  const registrationId = textValue(formData.get("registrationId"), 80);
  const next = nextPath(formData, "/community");
  const attendanceHours = String(positiveInteger(formData.get("attendanceHours"), 2, 48));
  const [registration] = await db
    .select({
      id: communityEventRegistrations.id,
      userId: communityEventRegistrations.userId,
      eventId: communityEventRegistrations.eventId,
      eventTitle: communityEvents.title,
      eventSlug: communityEvents.slug,
      eventAuthorUserId: communityEvents.authorUserId
    })
    .from(communityEventRegistrations)
    .innerJoin(communityEvents, eq(communityEventRegistrations.eventId, communityEvents.id))
    .where(eq(communityEventRegistrations.id, registrationId))
    .limit(1);

  if (!registration || !(await canManageCommunityTarget(user.id, registration.eventAuthorUserId))) {
    redirect(withStatus(next, "error", "permission"));
  }

  const now = new Date();

  await db
    .update(communityEventRegistrations)
    .set({
      status: "attended",
      checkedInAt: now,
      attendanceHours,
      updatedAt: now
    })
    .where(eq(communityEventRegistrations.id, registration.id));

  await recordCommunityScore(registration.userId, "community_event_attendance", registration.id, "event_attended");
  await addCommunityPassportItem({
    userId: registration.userId,
    sourceType: "community_event",
    sourceId: registration.eventId,
    title: registration.eventTitle,
    description: `Attended a Terumbu community event for ${attendanceHours} hours.`,
    evidenceUrl: `/community/events/${registration.eventSlug}`,
    occurredAt: now
  });

  redirect(withStatus(next, "saved", "attendance"));
}

export async function joinCommunityChallengeAction(formData: FormData) {
  const challengeId = textValue(formData.get("challengeId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);
  const [challenge] = await db
    .select({ id: communityChallenges.id, title: communityChallenges.title })
    .from(communityChallenges)
    .where(and(eq(communityChallenges.id, challengeId), inArray(communityChallenges.status, ["open", "active", "completed"]), isNull(communityChallenges.hiddenAt), isNull(communityChallenges.deletedAt)))
    .limit(1);

  if (!challenge) {
    redirect(withStatus(next, "error", "challenge"));
  }

  const [participation] = await db
    .insert(communityChallengeParticipations)
    .values({
      challengeId,
      userId: user.id,
      status: "active",
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [communityChallengeParticipations.challengeId, communityChallengeParticipations.userId],
      set: {
        status: "active",
        updatedAt: new Date()
      }
    })
    .returning({ id: communityChallengeParticipations.id });

  await recordCommunityScore(user.id, "community_challenge_join", participation.id, "challenge_joined");
  redirect(withStatus(next, "saved", "challenge"));
}

export async function logCommunityChallengeProgressAction(formData: FormData) {
  const challengeId = textValue(formData.get("challengeId"), 80);
  const next = nextPath(formData, "/community");
  const user = await requireUser(next);
  const amount = positiveInteger(formData.get("amount"), 1, 1_000_000);
  const note = nullableText(formData, "note", 1000);
  const evidenceUrl = await uploadedCommunityImage(formData, next);
  const [participation] = await db
    .select({
      id: communityChallengeParticipations.id,
      status: communityChallengeParticipations.status,
      progressTotal: communityChallengeParticipations.progressTotal,
      challengeId: communityChallengeParticipations.challengeId,
      challengeTitle: communityChallenges.title,
      challengeSlug: communityChallenges.slug,
      goalTarget: communityChallenges.goalTarget,
      unit: communityChallenges.unit
    })
    .from(communityChallengeParticipations)
    .innerJoin(communityChallenges, eq(communityChallengeParticipations.challengeId, communityChallenges.id))
    .where(and(eq(communityChallengeParticipations.challengeId, challengeId), eq(communityChallengeParticipations.userId, user.id)))
    .limit(1);

  if (!participation || participation.status === "cancelled") {
    redirect(withStatus(next, "error", "challenge-join"));
  }

  const progress = communityChallengeProgressStatus({
    currentTotal: participation.progressTotal,
    amount,
    goalTarget: participation.goalTarget,
    currentStatus: participation.status
  });
  const now = new Date();
  const [progressRow] = await db
    .insert(communityChallengeProgress)
    .values({
      participationId: participation.id,
      challengeId,
      userId: user.id,
      amount,
      note,
      evidenceUrl,
      loggedAt: now
    })
    .returning({ id: communityChallengeProgress.id });

  await db
    .update(communityChallengeParticipations)
    .set({
      progressTotal: progress.nextTotal,
      status: progress.completed ? "completed" : "active",
      completedAt: progress.completed ? now : null,
      updatedAt: now
    })
    .where(eq(communityChallengeParticipations.id, participation.id));

  if (progress.completed) {
    await recordCommunityScore(user.id, "community_challenge_completion", participation.id, "challenge_completed");
    await addCommunityPassportItem({
      userId: user.id,
      sourceType: "community_challenge",
      sourceId: participation.challengeId,
      title: participation.challengeTitle,
      description: `Completed ${progress.nextTotal.toLocaleString("id-ID")} ${participation.unit} in a Terumbu community challenge.`,
      evidenceUrl: `/community/challenges/${participation.challengeSlug}`,
      occurredAt: now
    });
  }

  await createNotification({
    userId: user.id,
    notificationCode: `community-challenge-progress-${progressRow.id}`,
    category: "Community challenge",
    title: participation.challengeTitle,
    message: progress.completed ? `${participation.challengeTitle} is complete.` : `Progress was recorded for ${participation.challengeTitle}.`,
    href: `/community/challenges/${participation.challengeSlug}`,
    sourceType: "community_challenge",
    sourceId: participation.challengeId
  });

  redirect(withStatus(next, "saved", progress.completed ? "challenge-complete" : "progress"));
}

export async function moderateCommunityContentAction(formData: FormData) {
  const admin = await requireRole(["admin"], "/admin/community");
  const targetType = normalizeCommunityTargetType(formData.get("targetType"));
  const targetId = textValue(formData.get("targetId"), 80);
  const action = normalizeCommunityModerationAction(formData.get("action"));
  const reason = textValue(formData.get("reason"), 1000) || action;
  const next = nextPath(formData, "/admin/community");
  const target = await targetRecord(targetType, targetId);

  if (!target) {
    redirect(withStatus(next, "error", "target"));
  }

  const now = new Date();
  const hiddenValues = action === "restore" ? { status: targetType === "challenge" ? "open" : "published", hiddenAt: null, hiddenByUserId: null, moderationReason: null } : null;

  if (targetType === "post") {
    await db
      .update(communityPosts)
      .set(
        hiddenValues ??
          (action === "archive"
            ? { status: "archived", updatedAt: now, moderationReason: reason }
            : action === "delete"
              ? { status: "deleted", deletedAt: now, updatedAt: now, moderationReason: reason }
              : { status: "hidden", hiddenAt: now, hiddenByUserId: admin.id, updatedAt: now, moderationReason: reason })
      )
      .where(eq(communityPosts.id, targetId));
  } else if (targetType === "event") {
    await db
      .update(communityEvents)
      .set(
        hiddenValues ??
          (action === "archive"
            ? { status: "archived", updatedAt: now, moderationReason: reason }
            : action === "delete"
              ? { status: "deleted", deletedAt: now, updatedAt: now, moderationReason: reason }
              : { status: "hidden", hiddenAt: now, hiddenByUserId: admin.id, updatedAt: now, moderationReason: reason })
      )
      .where(eq(communityEvents.id, targetId));
  } else if (targetType === "challenge") {
    await db
      .update(communityChallenges)
      .set(
        hiddenValues ??
          (action === "archive"
            ? { status: "archived", updatedAt: now, moderationReason: reason }
            : action === "delete"
              ? { status: "deleted", deletedAt: now, updatedAt: now, moderationReason: reason }
              : { status: "hidden", hiddenAt: now, hiddenByUserId: admin.id, updatedAt: now, moderationReason: reason })
      )
      .where(eq(communityChallenges.id, targetId));
  } else {
    await db
      .update(communityComments)
      .set(
        hiddenValues ??
          (action === "delete"
            ? { status: "deleted", deletedAt: now, updatedAt: now, moderationReason: reason }
            : { status: "hidden", hiddenAt: now, hiddenByUserId: admin.id, updatedAt: now, moderationReason: reason })
      )
      .where(eq(communityComments.id, targetId));
  }

  await db.insert(adminAuditLogs).values({
    actorUserId: admin.id,
    action: `community.${targetType}.${action}`,
    entityType: `community_${targetType}`,
    entityId: targetId,
    metadata: { reason, href: target.href }
  });

  await createNotification({
    userId: target.ownerUserId,
    notificationCode: `community-moderation-${targetType}-${targetId}-${action}`,
    category: "Community moderation",
    title: target.title,
    message: `Your community ${targetType} was ${action}.`,
    href: target.href,
    sourceType: `community_${targetType}`,
    sourceId: targetId
  });

  redirect(withStatus(next, "saved", "moderation"));
}

export async function reviewCommunityReportAction(formData: FormData) {
  const admin = await requireRole(["admin"], "/admin/community");
  const reportId = textValue(formData.get("reportId"), 80);
  const status = normalizeCommunityReportStatus(formData.get("status"), "reviewed");
  const actionTaken = textValue(formData.get("actionTaken"), 120) || status;
  const next = nextPath(formData, "/admin/community");

  await db
    .update(communityReports)
    .set({
      status,
      reviewedByUserId: admin.id,
      reviewedAt: new Date(),
      actionTaken,
      updatedAt: new Date()
    })
    .where(eq(communityReports.id, reportId));

  await db.insert(adminAuditLogs).values({
    actorUserId: admin.id,
    action: "community.report.reviewed",
    entityType: "community_report",
    entityId: reportId,
    metadata: { status, actionTaken }
  });

  redirect(withStatus(next, "saved", "report"));
}
