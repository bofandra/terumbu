import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
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
  profiles,
  users
} from "@/db/schema";
import {
  communityAuthorName,
  communityEventRegistrationAvailability,
  communityInitials,
  communityScoreLabel,
  shapeCommunityCommentTree,
  type CommunityTargetType
} from "@/lib/community";

export type CommunityAuthor = {
  id: string | null;
  name: string;
  initials: string;
};

export type CommunityPostCard = {
  id: string;
  title: string;
  slug: string;
  body: string;
  postType: string;
  status: string;
  mediaUrl: string | null;
  author: CommunityAuthor;
  chapter: { name: string; slug: string } | null;
  reactionCount: number;
  commentCount: number;
  reportCount?: number;
  createdAt: Date;
  publishedAt: Date | null;
  hiddenAt?: Date | null;
  deletedAt?: Date | null;
};

export type CommunityEventCard = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description?: string;
  eventType: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  location: string;
  capacity: number;
  waitlistEnabled: boolean;
  imageUrl: string | null;
  author: CommunityAuthor;
  chapter: { name: string; slug: string } | null;
  registeredCount: number;
  waitlistCount: number;
  attendedCount: number;
  currentRegistrationStatus: string | null;
  availabilityLabel: string;
  canRegister: boolean;
  reportCount?: number;
  hiddenAt?: Date | null;
  deletedAt?: Date | null;
};

export type CommunityChallengeCard = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description?: string;
  challengeType: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  goalMetric: string;
  goalTarget: number;
  unit: string;
  imageUrl: string | null;
  author: CommunityAuthor;
  chapter: { name: string; slug: string } | null;
  participantCount: number;
  completedCount: number;
  currentParticipation: { id: string; status: string; progressTotal: number; completedAt: Date | null } | null;
  reportCount?: number;
  hiddenAt?: Date | null;
  deletedAt?: Date | null;
};

export type CommunityChapterCard = {
  id: string;
  name: string;
  slug: string;
  region: string;
  description: string;
  status: string;
  imageUrl: string | null;
  memberCount: number;
  postCount: number;
  eventCount: number;
  challengeCount: number;
  currentMembershipStatus: string | null;
};

export type CommunityCommentView = {
  id: string;
  targetType: string;
  targetId: string;
  parentCommentId: string | null;
  body: string;
  status: string;
  author: CommunityAuthor;
  reactionCount: number;
  reportCount?: number;
  createdAt: Date;
  depth: number;
  children: CommunityCommentView[];
};

export type CommunityLeaderboardEntry = {
  userId: string;
  name: string;
  initials: string;
  score: number;
  scoreLabel: string;
  eventCount: number;
};

function author(row: { authorUserId?: string | null; displayName?: string | null; name?: string | null; email?: string | null }): CommunityAuthor {
  const name = communityAuthorName(row);

  return {
    id: row.authorUserId ?? null,
    name,
    initials: communityInitials(name)
  };
}

function visiblePostWhere() {
  return and(eq(communityPosts.status, "published"), isNull(communityPosts.hiddenAt), isNull(communityPosts.deletedAt));
}

function visibleEventWhere() {
  return and(eq(communityEvents.status, "published"), isNull(communityEvents.hiddenAt), isNull(communityEvents.deletedAt));
}

function visibleChallengeWhere() {
  return and(inArray(communityChallenges.status, ["open", "active", "completed"]), isNull(communityChallenges.hiddenAt), isNull(communityChallenges.deletedAt));
}

function visibleChapterWhere() {
  return eq(communityChapters.status, "published");
}

function visibleCommentWhere(targetType: CommunityTargetType, targetId: string) {
  return and(
    eq(communityComments.targetType, targetType),
    eq(communityComments.targetId, targetId),
    eq(communityComments.status, "published"),
    isNull(communityComments.hiddenAt),
    isNull(communityComments.deletedAt)
  );
}

const reactionCountSql = (targetType: CommunityTargetType, targetId: unknown) =>
  sql<number>`coalesce((select count(*)::int from ${communityReactions} where ${communityReactions.targetType} = ${targetType} and ${communityReactions.targetId} = ${targetId}), 0)`;

const commentCountSql = (targetType: CommunityTargetType, targetId: unknown) =>
  sql<number>`coalesce((select count(*)::int from ${communityComments} where ${communityComments.targetType} = ${targetType} and ${communityComments.targetId} = ${targetId} and ${communityComments.status} = 'published' and ${communityComments.hiddenAt} is null and ${communityComments.deletedAt} is null), 0)`;

const reportCountSql = (targetType: CommunityTargetType, targetId: unknown) =>
  sql<number>`coalesce((select count(*)::int from ${communityReports} where ${communityReports.targetType} = ${targetType} and ${communityReports.targetId} = ${targetId} and ${communityReports.status} = 'open'), 0)`;

function mapPost(row: {
  id: string;
  title: string;
  slug: string;
  body: string;
  postType: string;
  status: string;
  mediaUrl: string | null;
  authorUserId: string | null;
  displayName: string | null;
  name: string | null;
  email: string | null;
  chapterName: string | null;
  chapterSlug: string | null;
  reactionCount: number;
  commentCount: number;
  reportCount?: number;
  createdAt: Date;
  publishedAt: Date | null;
  hiddenAt?: Date | null;
  deletedAt?: Date | null;
}): CommunityPostCard {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    postType: row.postType,
    status: row.status,
    mediaUrl: row.mediaUrl,
    author: author(row),
    chapter: row.chapterName && row.chapterSlug ? { name: row.chapterName, slug: row.chapterSlug } : null,
    reactionCount: Number(row.reactionCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    reportCount: row.reportCount === undefined ? undefined : Number(row.reportCount ?? 0),
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
    hiddenAt: row.hiddenAt,
    deletedAt: row.deletedAt
  };
}

function mapEvent(row: {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description?: string;
  eventType: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  location: string;
  capacity: number;
  waitlistEnabled: boolean;
  imageUrl: string | null;
  authorUserId: string | null;
  displayName: string | null;
  name: string | null;
  email: string | null;
  chapterName: string | null;
  chapterSlug: string | null;
  registeredCount: number;
  waitlistCount: number;
  attendedCount: number;
  currentRegistrationStatus?: string | null;
  reportCount?: number;
  hiddenAt?: Date | null;
  deletedAt?: Date | null;
}): CommunityEventCard {
  const availability = communityEventRegistrationAvailability({
    status: row.status,
    capacity: row.capacity,
    registeredCount: Number(row.registeredCount ?? 0),
    waitlistEnabled: row.waitlistEnabled
  });

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    description: row.description,
    eventType: row.eventType,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    location: row.location,
    capacity: row.capacity,
    waitlistEnabled: row.waitlistEnabled,
    imageUrl: row.imageUrl,
    author: author(row),
    chapter: row.chapterName && row.chapterSlug ? { name: row.chapterName, slug: row.chapterSlug } : null,
    registeredCount: Number(row.registeredCount ?? 0),
    waitlistCount: Number(row.waitlistCount ?? 0),
    attendedCount: Number(row.attendedCount ?? 0),
    currentRegistrationStatus: row.currentRegistrationStatus ?? null,
    availabilityLabel: availability.label,
    canRegister: availability.canRegister,
    reportCount: row.reportCount === undefined ? undefined : Number(row.reportCount ?? 0),
    hiddenAt: row.hiddenAt,
    deletedAt: row.deletedAt
  };
}

function mapChallenge(row: {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description?: string;
  challengeType: string;
  status: string;
  startsAt: Date | null;
  endsAt: Date | null;
  goalMetric: string;
  goalTarget: number;
  unit: string;
  imageUrl: string | null;
  authorUserId: string | null;
  displayName: string | null;
  name: string | null;
  email: string | null;
  chapterName: string | null;
  chapterSlug: string | null;
  participantCount: number;
  completedCount: number;
  participationId?: string | null;
  participationStatus?: string | null;
  progressTotal?: number | null;
  completedAt?: Date | null;
  reportCount?: number;
  hiddenAt?: Date | null;
  deletedAt?: Date | null;
}): CommunityChallengeCard {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    description: row.description,
    challengeType: row.challengeType,
    status: row.status,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    goalMetric: row.goalMetric,
    goalTarget: row.goalTarget,
    unit: row.unit,
    imageUrl: row.imageUrl,
    author: author(row),
    chapter: row.chapterName && row.chapterSlug ? { name: row.chapterName, slug: row.chapterSlug } : null,
    participantCount: Number(row.participantCount ?? 0),
    completedCount: Number(row.completedCount ?? 0),
    currentParticipation: row.participationId
      ? {
          id: row.participationId,
          status: row.participationStatus ?? "active",
          progressTotal: Number(row.progressTotal ?? 0),
          completedAt: row.completedAt ?? null
        }
      : null,
    reportCount: row.reportCount === undefined ? undefined : Number(row.reportCount ?? 0),
    hiddenAt: row.hiddenAt,
    deletedAt: row.deletedAt
  };
}

async function currentReaction(targetType: CommunityTargetType, targetId: string, userId?: string | null) {
  if (!userId) {
    return null;
  }

  const [reaction] = await db
    .select({ reactionType: communityReactions.reactionType })
    .from(communityReactions)
    .where(and(eq(communityReactions.targetType, targetType), eq(communityReactions.targetId, targetId), eq(communityReactions.userId, userId)))
    .limit(1);

  return reaction?.reactionType ?? null;
}

export async function getCommunityComments(targetType: CommunityTargetType, targetId: string): Promise<CommunityCommentView[]> {
  const rows = await db
    .select({
      id: communityComments.id,
      targetType: communityComments.targetType,
      targetId: communityComments.targetId,
      parentCommentId: communityComments.parentCommentId,
      body: communityComments.body,
      status: communityComments.status,
      authorUserId: communityComments.authorUserId,
      displayName: profiles.displayName,
      name: users.name,
      email: users.email,
      reactionCount: reactionCountSql("comment", communityComments.id),
      createdAt: communityComments.createdAt
    })
    .from(communityComments)
    .leftJoin(users, eq(communityComments.authorUserId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(visibleCommentWhere(targetType, targetId))
    .orderBy(asc(communityComments.createdAt));

  function mapNode(node: ReturnType<typeof shapeCommunityCommentTree<(typeof rows)[number]>>[number]): CommunityCommentView {
    return {
      id: node.id,
      targetType: node.targetType,
      targetId: node.targetId,
      parentCommentId: node.parentCommentId,
      body: node.body,
      status: node.status,
      author: author(node),
      reactionCount: Number(node.reactionCount ?? 0),
      createdAt: node.createdAt,
      depth: node.depth,
      children: node.children.map(mapNode)
    };
  }

  return shapeCommunityCommentTree(rows).map(mapNode);
}

export async function getCommunityPosts(limit = 12) {
  const rows = await db
    .select({
      id: communityPosts.id,
      title: communityPosts.title,
      slug: communityPosts.slug,
      body: communityPosts.body,
      postType: communityPosts.postType,
      status: communityPosts.status,
      mediaUrl: communityPosts.mediaUrl,
      authorUserId: communityPosts.authorUserId,
      displayName: profiles.displayName,
      name: users.name,
      email: users.email,
      chapterName: communityChapters.name,
      chapterSlug: communityChapters.slug,
      reactionCount: reactionCountSql("post", communityPosts.id),
      commentCount: commentCountSql("post", communityPosts.id),
      createdAt: communityPosts.createdAt,
      publishedAt: communityPosts.publishedAt
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.authorUserId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(communityChapters, eq(communityPosts.chapterId, communityChapters.id))
    .where(visiblePostWhere())
    .orderBy(desc(communityPosts.createdAt))
    .limit(limit);

  return rows.map(mapPost);
}

export async function getCommunityEvents(userId?: string | null, limit = 8) {
  const rows = await db
    .select({
      id: communityEvents.id,
      title: communityEvents.title,
      slug: communityEvents.slug,
      summary: communityEvents.summary,
      eventType: communityEvents.eventType,
      status: communityEvents.status,
      startsAt: communityEvents.startsAt,
      endsAt: communityEvents.endsAt,
      location: communityEvents.location,
      capacity: communityEvents.capacity,
      waitlistEnabled: communityEvents.waitlistEnabled,
      imageUrl: communityEvents.imageUrl,
      authorUserId: communityEvents.authorUserId,
      displayName: profiles.displayName,
      name: users.name,
      email: users.email,
      chapterName: communityChapters.name,
      chapterSlug: communityChapters.slug,
      registeredCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} in ('registered','attended')), 0)`,
      waitlistCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} = 'waitlisted'), 0)`,
      attendedCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} = 'attended'), 0)`,
      currentRegistrationStatus: userId
        ? sql<string | null>`(select ${communityEventRegistrations.status} from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.userId} = ${userId} limit 1)`
        : sql<string | null>`null`
    })
    .from(communityEvents)
    .leftJoin(users, eq(communityEvents.authorUserId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(communityChapters, eq(communityEvents.chapterId, communityChapters.id))
    .where(visibleEventWhere())
    .orderBy(asc(communityEvents.startsAt))
    .limit(limit);

  return rows.map(mapEvent);
}

export async function getCommunityChallenges(userId?: string | null, limit = 8) {
  const rows = await db
    .select({
      id: communityChallenges.id,
      title: communityChallenges.title,
      slug: communityChallenges.slug,
      summary: communityChallenges.summary,
      challengeType: communityChallenges.challengeType,
      status: communityChallenges.status,
      startsAt: communityChallenges.startsAt,
      endsAt: communityChallenges.endsAt,
      goalMetric: communityChallenges.goalMetric,
      goalTarget: communityChallenges.goalTarget,
      unit: communityChallenges.unit,
      imageUrl: communityChallenges.imageUrl,
      authorUserId: communityChallenges.authorUserId,
      displayName: profiles.displayName,
      name: users.name,
      email: users.email,
      chapterName: communityChapters.name,
      chapterSlug: communityChapters.slug,
      participantCount: sql<number>`coalesce((select count(*)::int from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.status} in ('active','completed')), 0)`,
      completedCount: sql<number>`coalesce((select count(*)::int from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.status} = 'completed'), 0)`,
      participationId: userId
        ? sql<string | null>`(select ${communityChallengeParticipations.id} from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.userId} = ${userId} limit 1)`
        : sql<string | null>`null`,
      participationStatus: userId
        ? sql<string | null>`(select ${communityChallengeParticipations.status} from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.userId} = ${userId} limit 1)`
        : sql<string | null>`null`,
      progressTotal: userId
        ? sql<number | null>`(select ${communityChallengeParticipations.progressTotal} from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.userId} = ${userId} limit 1)`
        : sql<number | null>`null`,
      completedAt: userId
        ? sql<Date | null>`(select ${communityChallengeParticipations.completedAt} from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.userId} = ${userId} limit 1)`
        : sql<Date | null>`null`
    })
    .from(communityChallenges)
    .leftJoin(users, eq(communityChallenges.authorUserId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(communityChapters, eq(communityChallenges.chapterId, communityChapters.id))
    .where(visibleChallengeWhere())
    .orderBy(desc(communityChallenges.createdAt))
    .limit(limit);

  return rows.map(mapChallenge);
}

export async function getCommunityChapters(userId?: string | null, limit = 12): Promise<CommunityChapterCard[]> {
  const rows = await db
    .select({
      id: communityChapters.id,
      name: communityChapters.name,
      slug: communityChapters.slug,
      region: communityChapters.region,
      description: communityChapters.description,
      status: communityChapters.status,
      imageUrl: communityChapters.imageUrl,
      memberCount: sql<number>`coalesce((select count(*)::int from ${communityChapterMemberships} where ${communityChapterMemberships.chapterId} = ${communityChapters.id} and ${communityChapterMemberships.status} = 'active'), 0)`,
      postCount: sql<number>`coalesce((select count(*)::int from ${communityPosts} where ${communityPosts.chapterId} = ${communityChapters.id} and ${communityPosts.status} = 'published' and ${communityPosts.hiddenAt} is null and ${communityPosts.deletedAt} is null), 0)`,
      eventCount: sql<number>`coalesce((select count(*)::int from ${communityEvents} where ${communityEvents.chapterId} = ${communityChapters.id} and ${communityEvents.status} = 'published' and ${communityEvents.hiddenAt} is null and ${communityEvents.deletedAt} is null), 0)`,
      challengeCount: sql<number>`coalesce((select count(*)::int from ${communityChallenges} where ${communityChallenges.chapterId} = ${communityChapters.id} and ${communityChallenges.status} in ('open','active','completed') and ${communityChallenges.hiddenAt} is null and ${communityChallenges.deletedAt} is null), 0)`,
      currentMembershipStatus: userId
        ? sql<string | null>`(select ${communityChapterMemberships.status} from ${communityChapterMemberships} where ${communityChapterMemberships.chapterId} = ${communityChapters.id} and ${communityChapterMemberships.userId} = ${userId} limit 1)`
        : sql<string | null>`null`
    })
    .from(communityChapters)
    .where(visibleChapterWhere())
    .orderBy(asc(communityChapters.name))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    memberCount: Number(row.memberCount ?? 0),
    postCount: Number(row.postCount ?? 0),
    eventCount: Number(row.eventCount ?? 0),
    challengeCount: Number(row.challengeCount ?? 0)
  }));
}

export async function getCommunityLeaderboard(limit = 10): Promise<CommunityLeaderboardEntry[]> {
  const rows = await db
    .select({
      userId: communityScoreEvents.userId,
      displayName: profiles.displayName,
      name: users.name,
      email: users.email,
      score: sql<number>`coalesce(sum(${communityScoreEvents.score}), 0)::int`,
      eventCount: sql<number>`coalesce(count(*) filter (where ${communityScoreEvents.sourceType} = 'community_event_attendance'), 0)::int`
    })
    .from(communityScoreEvents)
    .innerJoin(users, eq(communityScoreEvents.userId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .groupBy(communityScoreEvents.userId, profiles.displayName, users.name, users.email)
    .orderBy(desc(sql`coalesce(sum(${communityScoreEvents.score}), 0)`))
    .limit(limit);

  return rows.map((row) => {
    const name = communityAuthorName(row);
    const score = Number(row.score ?? 0);

    return {
      userId: row.userId,
      name,
      initials: communityInitials(name),
      score,
      scoreLabel: communityScoreLabel(score),
      eventCount: Number(row.eventCount ?? 0)
    };
  });
}

export async function getCommunityLandingData(userId?: string | null) {
  const [posts, events, challenges, chapters, leaderboard] = await Promise.all([
    getCommunityPosts(12),
    getCommunityEvents(userId, 6),
    getCommunityChallenges(userId, 6),
    getCommunityChapters(userId, 8),
    getCommunityLeaderboard(8)
  ]);

  return { posts, events, challenges, chapters, leaderboard };
}

export async function getCommunityPostDetail(slug: string, userId?: string | null) {
  const [row] = await db
    .select({
      id: communityPosts.id,
      title: communityPosts.title,
      slug: communityPosts.slug,
      body: communityPosts.body,
      postType: communityPosts.postType,
      status: communityPosts.status,
      mediaUrl: communityPosts.mediaUrl,
      authorUserId: communityPosts.authorUserId,
      displayName: profiles.displayName,
      name: users.name,
      email: users.email,
      chapterName: communityChapters.name,
      chapterSlug: communityChapters.slug,
      reactionCount: reactionCountSql("post", communityPosts.id),
      commentCount: commentCountSql("post", communityPosts.id),
      createdAt: communityPosts.createdAt,
      publishedAt: communityPosts.publishedAt
    })
    .from(communityPosts)
    .leftJoin(users, eq(communityPosts.authorUserId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(communityChapters, eq(communityPosts.chapterId, communityChapters.id))
    .where(and(eq(communityPosts.slug, slug), visiblePostWhere()))
    .limit(1);

  if (!row) {
    return null;
  }

  const post = mapPost(row);
  const [comments, reactionType] = await Promise.all([getCommunityComments("post", post.id), currentReaction("post", post.id, userId)]);

  return {
    post,
    comments,
    reactionType,
    isOwner: Boolean(userId && post.author.id === userId)
  };
}

export async function getCommunityEventDetail(slug: string, userId?: string | null) {
  const [row] = await db
    .select({
      id: communityEvents.id,
      title: communityEvents.title,
      slug: communityEvents.slug,
      summary: communityEvents.summary,
      description: communityEvents.description,
      eventType: communityEvents.eventType,
      status: communityEvents.status,
      startsAt: communityEvents.startsAt,
      endsAt: communityEvents.endsAt,
      location: communityEvents.location,
      capacity: communityEvents.capacity,
      waitlistEnabled: communityEvents.waitlistEnabled,
      imageUrl: communityEvents.imageUrl,
      authorUserId: communityEvents.authorUserId,
      displayName: profiles.displayName,
      name: users.name,
      email: users.email,
      chapterName: communityChapters.name,
      chapterSlug: communityChapters.slug,
      registeredCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} in ('registered','attended')), 0)`,
      waitlistCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} = 'waitlisted'), 0)`,
      attendedCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} = 'attended'), 0)`,
      currentRegistrationStatus: userId
        ? sql<string | null>`(select ${communityEventRegistrations.status} from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.userId} = ${userId} limit 1)`
        : sql<string | null>`null`
    })
    .from(communityEvents)
    .leftJoin(users, eq(communityEvents.authorUserId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(communityChapters, eq(communityEvents.chapterId, communityChapters.id))
    .where(and(eq(communityEvents.slug, slug), visibleEventWhere()))
    .limit(1);

  if (!row) {
    return null;
  }

  const event = mapEvent(row);
  const [comments, reactionType, registrations] = await Promise.all([
    getCommunityComments("event", event.id),
    currentReaction("event", event.id, userId),
    db
      .select({
        id: communityEventRegistrations.id,
        status: communityEventRegistrations.status,
        checkedInAt: communityEventRegistrations.checkedInAt,
        attendanceHours: communityEventRegistrations.attendanceHours,
        userId: users.id,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email
      })
      .from(communityEventRegistrations)
      .innerJoin(users, eq(communityEventRegistrations.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(communityEventRegistrations.eventId, event.id))
      .orderBy(asc(communityEventRegistrations.registeredAt))
  ]);

  return {
    event,
    comments,
    reactionType,
    registrations: registrations.map((registration) => ({
      id: registration.id,
      status: registration.status,
      checkedInAt: registration.checkedInAt,
      attendanceHours: Number(registration.attendanceHours ?? 0),
      userId: registration.userId,
      name: communityAuthorName(registration),
      initials: communityInitials(communityAuthorName(registration))
    })),
    isOwner: Boolean(userId && event.author.id === userId)
  };
}

export async function getCommunityChallengeDetail(slug: string, userId?: string | null) {
  const [row] = await db
    .select({
      id: communityChallenges.id,
      title: communityChallenges.title,
      slug: communityChallenges.slug,
      summary: communityChallenges.summary,
      description: communityChallenges.description,
      challengeType: communityChallenges.challengeType,
      status: communityChallenges.status,
      startsAt: communityChallenges.startsAt,
      endsAt: communityChallenges.endsAt,
      goalMetric: communityChallenges.goalMetric,
      goalTarget: communityChallenges.goalTarget,
      unit: communityChallenges.unit,
      imageUrl: communityChallenges.imageUrl,
      authorUserId: communityChallenges.authorUserId,
      displayName: profiles.displayName,
      name: users.name,
      email: users.email,
      chapterName: communityChapters.name,
      chapterSlug: communityChapters.slug,
      participantCount: sql<number>`coalesce((select count(*)::int from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.status} in ('active','completed')), 0)`,
      completedCount: sql<number>`coalesce((select count(*)::int from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.status} = 'completed'), 0)`,
      participationId: userId
        ? sql<string | null>`(select ${communityChallengeParticipations.id} from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.userId} = ${userId} limit 1)`
        : sql<string | null>`null`,
      participationStatus: userId
        ? sql<string | null>`(select ${communityChallengeParticipations.status} from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.userId} = ${userId} limit 1)`
        : sql<string | null>`null`,
      progressTotal: userId
        ? sql<number | null>`(select ${communityChallengeParticipations.progressTotal} from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.userId} = ${userId} limit 1)`
        : sql<number | null>`null`,
      completedAt: userId
        ? sql<Date | null>`(select ${communityChallengeParticipations.completedAt} from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.userId} = ${userId} limit 1)`
        : sql<Date | null>`null`
    })
    .from(communityChallenges)
    .leftJoin(users, eq(communityChallenges.authorUserId, users.id))
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(communityChapters, eq(communityChallenges.chapterId, communityChapters.id))
    .where(and(eq(communityChallenges.slug, slug), visibleChallengeWhere()))
    .limit(1);

  if (!row) {
    return null;
  }

  const challenge = mapChallenge(row);
  const [comments, reactionType, progressRows, leaderboard] = await Promise.all([
    getCommunityComments("challenge", challenge.id),
    currentReaction("challenge", challenge.id, userId),
    db
      .select({
        id: communityChallengeProgress.id,
        amount: communityChallengeProgress.amount,
        note: communityChallengeProgress.note,
        evidenceUrl: communityChallengeProgress.evidenceUrl,
        loggedAt: communityChallengeProgress.loggedAt,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email
      })
      .from(communityChallengeProgress)
      .innerJoin(users, eq(communityChallengeProgress.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(communityChallengeProgress.challengeId, challenge.id))
      .orderBy(desc(communityChallengeProgress.loggedAt))
      .limit(20),
    db
      .select({
        userId: communityChallengeParticipations.userId,
        progressTotal: communityChallengeParticipations.progressTotal,
        status: communityChallengeParticipations.status,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email
      })
      .from(communityChallengeParticipations)
      .innerJoin(users, eq(communityChallengeParticipations.userId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(communityChallengeParticipations.challengeId, challenge.id))
      .orderBy(desc(communityChallengeParticipations.progressTotal))
      .limit(10)
  ]);

  return {
    challenge,
    comments,
    reactionType,
    progressRows: progressRows.map((row) => ({
      id: row.id,
      amount: row.amount,
      note: row.note,
      evidenceUrl: row.evidenceUrl,
      loggedAt: row.loggedAt,
      name: communityAuthorName(row),
      initials: communityInitials(communityAuthorName(row))
    })),
    leaderboard: leaderboard.map((row) => ({
      userId: row.userId,
      name: communityAuthorName(row),
      initials: communityInitials(communityAuthorName(row)),
      progressTotal: row.progressTotal,
      status: row.status
    })),
    isOwner: Boolean(userId && challenge.author.id === userId)
  };
}

export async function getCommunityChapterDetail(slug: string, userId?: string | null) {
  const [chapter] = await getCommunityChapters(userId, 100).then((chapters) => [chapters.find((item) => item.slug === slug) ?? null]);

  if (!chapter) {
    return null;
  }

  const [posts, events, challenges] = await Promise.all([
    db
      .select({
        id: communityPosts.id,
        title: communityPosts.title,
        slug: communityPosts.slug,
        body: communityPosts.body,
        postType: communityPosts.postType,
        status: communityPosts.status,
        mediaUrl: communityPosts.mediaUrl,
        authorUserId: communityPosts.authorUserId,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email,
        chapterName: communityChapters.name,
        chapterSlug: communityChapters.slug,
        reactionCount: reactionCountSql("post", communityPosts.id),
        commentCount: commentCountSql("post", communityPosts.id),
        createdAt: communityPosts.createdAt,
        publishedAt: communityPosts.publishedAt
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.authorUserId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(communityChapters, eq(communityPosts.chapterId, communityChapters.id))
      .where(and(eq(communityPosts.chapterId, chapter.id), visiblePostWhere()))
      .orderBy(desc(communityPosts.createdAt))
      .limit(8),
    getCommunityEvents(userId, 50),
    getCommunityChallenges(userId, 50)
  ]);

  return {
    chapter,
    posts: posts.map(mapPost),
    events: events.filter((event) => event.chapter?.slug === chapter.slug).slice(0, 8),
    challenges: challenges.filter((challenge) => challenge.chapter?.slug === chapter.slug).slice(0, 8)
  };
}

export async function getDashboardCommunityData(userId: string) {
  const [posts, events, challenges, registrations, participations, reports, scoreRows] = await Promise.all([
    db
      .select({
        id: communityPosts.id,
        title: communityPosts.title,
        slug: communityPosts.slug,
        body: communityPosts.body,
        postType: communityPosts.postType,
        status: communityPosts.status,
        mediaUrl: communityPosts.mediaUrl,
        authorUserId: communityPosts.authorUserId,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email,
        chapterName: communityChapters.name,
        chapterSlug: communityChapters.slug,
        reactionCount: reactionCountSql("post", communityPosts.id),
        commentCount: commentCountSql("post", communityPosts.id),
        createdAt: communityPosts.createdAt,
        publishedAt: communityPosts.publishedAt,
        hiddenAt: communityPosts.hiddenAt,
        deletedAt: communityPosts.deletedAt
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.authorUserId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(communityChapters, eq(communityPosts.chapterId, communityChapters.id))
      .where(eq(communityPosts.authorUserId, userId))
      .orderBy(desc(communityPosts.createdAt)),
    db
      .select({
        id: communityEvents.id,
        title: communityEvents.title,
        slug: communityEvents.slug,
        summary: communityEvents.summary,
        eventType: communityEvents.eventType,
        status: communityEvents.status,
        startsAt: communityEvents.startsAt,
        endsAt: communityEvents.endsAt,
        location: communityEvents.location,
        capacity: communityEvents.capacity,
        waitlistEnabled: communityEvents.waitlistEnabled,
        imageUrl: communityEvents.imageUrl,
        authorUserId: communityEvents.authorUserId,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email,
        chapterName: communityChapters.name,
        chapterSlug: communityChapters.slug,
        registeredCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} in ('registered','attended')), 0)`,
        waitlistCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} = 'waitlisted'), 0)`,
        attendedCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} = 'attended'), 0)`,
        currentRegistrationStatus: sql<string | null>`null`,
        hiddenAt: communityEvents.hiddenAt,
        deletedAt: communityEvents.deletedAt
      })
      .from(communityEvents)
      .leftJoin(users, eq(communityEvents.authorUserId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(communityChapters, eq(communityEvents.chapterId, communityChapters.id))
      .where(eq(communityEvents.authorUserId, userId))
      .orderBy(desc(communityEvents.createdAt)),
    db
      .select({
        id: communityChallenges.id,
        title: communityChallenges.title,
        slug: communityChallenges.slug,
        summary: communityChallenges.summary,
        challengeType: communityChallenges.challengeType,
        status: communityChallenges.status,
        startsAt: communityChallenges.startsAt,
        endsAt: communityChallenges.endsAt,
        goalMetric: communityChallenges.goalMetric,
        goalTarget: communityChallenges.goalTarget,
        unit: communityChallenges.unit,
        imageUrl: communityChallenges.imageUrl,
        authorUserId: communityChallenges.authorUserId,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email,
        chapterName: communityChapters.name,
        chapterSlug: communityChapters.slug,
        participantCount: sql<number>`coalesce((select count(*)::int from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.status} in ('active','completed')), 0)`,
        completedCount: sql<number>`coalesce((select count(*)::int from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.status} = 'completed'), 0)`,
        participationId: sql<string | null>`null`,
        participationStatus: sql<string | null>`null`,
        progressTotal: sql<number | null>`null`,
        completedAt: sql<Date | null>`null`,
        hiddenAt: communityChallenges.hiddenAt,
        deletedAt: communityChallenges.deletedAt
      })
      .from(communityChallenges)
      .leftJoin(users, eq(communityChallenges.authorUserId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(communityChapters, eq(communityChallenges.chapterId, communityChapters.id))
      .where(eq(communityChallenges.authorUserId, userId))
      .orderBy(desc(communityChallenges.createdAt)),
    db
      .select({
        eventId: communityEvents.id,
        title: communityEvents.title,
        slug: communityEvents.slug,
        startsAt: communityEvents.startsAt,
        location: communityEvents.location,
        status: communityEventRegistrations.status
      })
      .from(communityEventRegistrations)
      .innerJoin(communityEvents, eq(communityEventRegistrations.eventId, communityEvents.id))
      .where(eq(communityEventRegistrations.userId, userId))
      .orderBy(desc(communityEventRegistrations.registeredAt)),
    db
      .select({
        challengeId: communityChallenges.id,
        title: communityChallenges.title,
        slug: communityChallenges.slug,
        goalTarget: communityChallenges.goalTarget,
        unit: communityChallenges.unit,
        status: communityChallengeParticipations.status,
        progressTotal: communityChallengeParticipations.progressTotal,
        completedAt: communityChallengeParticipations.completedAt
      })
      .from(communityChallengeParticipations)
      .innerJoin(communityChallenges, eq(communityChallengeParticipations.challengeId, communityChallenges.id))
      .where(eq(communityChallengeParticipations.userId, userId))
      .orderBy(desc(communityChallengeParticipations.updatedAt)),
    db
      .select({
        id: communityReports.id,
        targetType: communityReports.targetType,
        targetId: communityReports.targetId,
        reason: communityReports.reason,
        status: communityReports.status,
        createdAt: communityReports.createdAt
      })
      .from(communityReports)
      .where(eq(communityReports.reporterUserId, userId))
      .orderBy(desc(communityReports.createdAt)),
    db
      .select({ score: sql<number>`coalesce(sum(${communityScoreEvents.score}), 0)::int` })
      .from(communityScoreEvents)
      .where(eq(communityScoreEvents.userId, userId))
  ]);

  const score = Number(scoreRows[0]?.score ?? 0);

  return {
    score,
    scoreLabel: communityScoreLabel(score),
    posts: posts.map(mapPost),
    events: events.map(mapEvent),
    challenges: challenges.map(mapChallenge),
    registrations,
    participations,
    reports
  };
}

export async function getAdminCommunityData() {
  const [posts, events, challenges, chapters, reports, scoreRows, postCountRows, eventCountRows, challengeCountRows, chapterCountRows, openReportRows] = await Promise.all([
    db
      .select({
        id: communityPosts.id,
        title: communityPosts.title,
        slug: communityPosts.slug,
        body: communityPosts.body,
        postType: communityPosts.postType,
        status: communityPosts.status,
        mediaUrl: communityPosts.mediaUrl,
        authorUserId: communityPosts.authorUserId,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email,
        chapterName: communityChapters.name,
        chapterSlug: communityChapters.slug,
        reactionCount: reactionCountSql("post", communityPosts.id),
        commentCount: commentCountSql("post", communityPosts.id),
        reportCount: reportCountSql("post", communityPosts.id),
        createdAt: communityPosts.createdAt,
        publishedAt: communityPosts.publishedAt,
        hiddenAt: communityPosts.hiddenAt,
        deletedAt: communityPosts.deletedAt
      })
      .from(communityPosts)
      .leftJoin(users, eq(communityPosts.authorUserId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(communityChapters, eq(communityPosts.chapterId, communityChapters.id))
      .orderBy(desc(communityPosts.createdAt))
      .limit(40),
    db
      .select({
        id: communityEvents.id,
        title: communityEvents.title,
        slug: communityEvents.slug,
        summary: communityEvents.summary,
        eventType: communityEvents.eventType,
        status: communityEvents.status,
        startsAt: communityEvents.startsAt,
        endsAt: communityEvents.endsAt,
        location: communityEvents.location,
        capacity: communityEvents.capacity,
        waitlistEnabled: communityEvents.waitlistEnabled,
        imageUrl: communityEvents.imageUrl,
        authorUserId: communityEvents.authorUserId,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email,
        chapterName: communityChapters.name,
        chapterSlug: communityChapters.slug,
        registeredCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} in ('registered','attended')), 0)`,
        waitlistCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} = 'waitlisted'), 0)`,
        attendedCount: sql<number>`coalesce((select count(*)::int from ${communityEventRegistrations} where ${communityEventRegistrations.eventId} = ${communityEvents.id} and ${communityEventRegistrations.status} = 'attended'), 0)`,
        currentRegistrationStatus: sql<string | null>`null`,
        reportCount: reportCountSql("event", communityEvents.id),
        hiddenAt: communityEvents.hiddenAt,
        deletedAt: communityEvents.deletedAt
      })
      .from(communityEvents)
      .leftJoin(users, eq(communityEvents.authorUserId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(communityChapters, eq(communityEvents.chapterId, communityChapters.id))
      .orderBy(desc(communityEvents.createdAt))
      .limit(40),
    db
      .select({
        id: communityChallenges.id,
        title: communityChallenges.title,
        slug: communityChallenges.slug,
        summary: communityChallenges.summary,
        challengeType: communityChallenges.challengeType,
        status: communityChallenges.status,
        startsAt: communityChallenges.startsAt,
        endsAt: communityChallenges.endsAt,
        goalMetric: communityChallenges.goalMetric,
        goalTarget: communityChallenges.goalTarget,
        unit: communityChallenges.unit,
        imageUrl: communityChallenges.imageUrl,
        authorUserId: communityChallenges.authorUserId,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email,
        chapterName: communityChapters.name,
        chapterSlug: communityChapters.slug,
        participantCount: sql<number>`coalesce((select count(*)::int from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.status} in ('active','completed')), 0)`,
        completedCount: sql<number>`coalesce((select count(*)::int from ${communityChallengeParticipations} where ${communityChallengeParticipations.challengeId} = ${communityChallenges.id} and ${communityChallengeParticipations.status} = 'completed'), 0)`,
        participationId: sql<string | null>`null`,
        participationStatus: sql<string | null>`null`,
        progressTotal: sql<number | null>`null`,
        completedAt: sql<Date | null>`null`,
        reportCount: reportCountSql("challenge", communityChallenges.id),
        hiddenAt: communityChallenges.hiddenAt,
        deletedAt: communityChallenges.deletedAt
      })
      .from(communityChallenges)
      .leftJoin(users, eq(communityChallenges.authorUserId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .leftJoin(communityChapters, eq(communityChallenges.chapterId, communityChapters.id))
      .orderBy(desc(communityChallenges.createdAt))
      .limit(40),
    getCommunityChapters(null, 40),
    db
      .select({
        id: communityReports.id,
        targetType: communityReports.targetType,
        targetId: communityReports.targetId,
        reason: communityReports.reason,
        detail: communityReports.detail,
        status: communityReports.status,
        actionTaken: communityReports.actionTaken,
        createdAt: communityReports.createdAt,
        reviewedAt: communityReports.reviewedAt,
        displayName: profiles.displayName,
        name: users.name,
        email: users.email
      })
      .from(communityReports)
      .innerJoin(users, eq(communityReports.reporterUserId, users.id))
      .leftJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(communityReports.createdAt))
      .limit(60),
    db.select({ total: sql<number>`coalesce(sum(${communityScoreEvents.score}), 0)::int` }).from(communityScoreEvents),
    db.select({ total: sql<number>`count(*)::int` }).from(communityPosts),
    db.select({ total: sql<number>`count(*)::int` }).from(communityEvents),
    db.select({ total: sql<number>`count(*)::int` }).from(communityChallenges),
    db.select({ total: sql<number>`count(*)::int` }).from(communityChapters),
    db.select({ total: sql<number>`count(*)::int` }).from(communityReports).where(eq(communityReports.status, "open"))
  ]);

  return {
    stats: {
      posts: Number(postCountRows[0]?.total ?? 0),
      events: Number(eventCountRows[0]?.total ?? 0),
      challenges: Number(challengeCountRows[0]?.total ?? 0),
      chapters: Number(chapterCountRows[0]?.total ?? 0),
      openReports: Number(openReportRows[0]?.total ?? 0),
      score: Number(scoreRows[0]?.total ?? 0)
    },
    posts: posts.map(mapPost),
    events: events.map(mapEvent),
    challenges: challenges.map(mapChallenge),
    chapters,
    reports: reports.map((report) => ({
      ...report,
      reporterName: communityAuthorName(report)
    }))
  };
}
