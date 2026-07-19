export const communityContentStatuses = ["published", "hidden", "archived", "deleted"] as const;
export const communityEventStatuses = ["published", "hidden", "archived", "deleted", "cancelled"] as const;
export const communityChallengeStatuses = ["open", "active", "completed", "hidden", "archived", "deleted"] as const;
export const communityRegistrationStatuses = ["registered", "waitlisted", "attended", "cancelled"] as const;
export const communityParticipationStatuses = ["active", "completed", "cancelled"] as const;
export const communityReportStatuses = ["open", "reviewed", "dismissed", "actioned"] as const;
export const communityTargetTypes = ["post", "event", "challenge", "comment"] as const;
export const communityReactionTypes = ["celebrate", "support", "learned"] as const;
export const communityModerationActions = ["hide", "restore", "archive", "delete"] as const;

export type CommunityContentStatus = (typeof communityContentStatuses)[number];
export type CommunityEventStatus = (typeof communityEventStatuses)[number];
export type CommunityChallengeStatus = (typeof communityChallengeStatuses)[number];
export type CommunityRegistrationStatus = (typeof communityRegistrationStatuses)[number];
export type CommunityParticipationStatus = (typeof communityParticipationStatuses)[number];
export type CommunityReportStatus = (typeof communityReportStatuses)[number];
export type CommunityTargetType = (typeof communityTargetTypes)[number];
export type CommunityReactionType = (typeof communityReactionTypes)[number];
export type CommunityModerationAction = (typeof communityModerationActions)[number];

export type CommunityCommentFlat = {
  id: string;
  parentCommentId: string | null;
  createdAt: Date;
};

export type CommunityCommentTreeNode<T extends CommunityCommentFlat> = T & {
  depth: number;
  children: Array<CommunityCommentTreeNode<T>>;
};

function normalizeFromList<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  const normalized = String(value ?? fallback).trim().toLowerCase().replace(/[\s-]+/g, "_");

  return values.includes(normalized) ? normalized : fallback;
}

export function normalizeCommunityContentStatus(value: unknown, fallback: CommunityContentStatus = "published") {
  return normalizeFromList(value, communityContentStatuses, fallback);
}

export function normalizeCommunityEventStatus(value: unknown, fallback: CommunityEventStatus = "published") {
  return normalizeFromList(value, communityEventStatuses, fallback);
}

export function normalizeCommunityChallengeStatus(value: unknown, fallback: CommunityChallengeStatus = "open") {
  return normalizeFromList(value, communityChallengeStatuses, fallback);
}

export function normalizeCommunityRegistrationStatus(value: unknown, fallback: CommunityRegistrationStatus = "registered") {
  return normalizeFromList(value, communityRegistrationStatuses, fallback);
}

export function normalizeCommunityParticipationStatus(value: unknown, fallback: CommunityParticipationStatus = "active") {
  return normalizeFromList(value, communityParticipationStatuses, fallback);
}

export function normalizeCommunityReportStatus(value: unknown, fallback: CommunityReportStatus = "open") {
  return normalizeFromList(value, communityReportStatuses, fallback);
}

export function normalizeCommunityTargetType(value: unknown, fallback: CommunityTargetType = "post") {
  return normalizeFromList(value, communityTargetTypes, fallback);
}

export function normalizeCommunityReactionType(value: unknown, fallback: CommunityReactionType = "celebrate") {
  return normalizeFromList(value, communityReactionTypes, fallback);
}

export function normalizeCommunityModerationAction(value: unknown, fallback: CommunityModerationAction = "hide") {
  return normalizeFromList(value, communityModerationActions, fallback);
}

export function communitySlug(value: string, fallback = "community") {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

  return slug || fallback;
}

export function communityAuthorName(input: { displayName?: string | null; name?: string | null; email?: string | null }) {
  return input.displayName || input.name || input.email || "Terumbu member";
}

export function communityInitials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "OH"
  );
}

export function communityScoreForReason(reason: string) {
  const scores: Record<string, number> = {
    post_created: 10,
    comment_created: 2,
    event_registered: 5,
    event_attended: 30,
    challenge_joined: 5,
    challenge_completed: 50
  };

  return scores[reason] ?? 0;
}

export function communityScoreLabel(score: number) {
  return `${score.toLocaleString("id-ID")} pts`;
}

export function communityContentIsPublic(input: { status: string; hiddenAt?: Date | null; deletedAt?: Date | null }) {
  return ["published", "open", "active", "completed"].includes(input.status) && !input.hiddenAt && !input.deletedAt;
}

export function communityEventRegistrationAvailability(input: {
  status: string;
  capacity: number;
  registeredCount: number;
  waitlistEnabled: boolean;
}) {
  const status = normalizeCommunityEventStatus(input.status);
  const capacity = Math.max(0, Math.floor(input.capacity));
  const registeredCount = Math.max(0, Math.floor(input.registeredCount));

  if (!["published"].includes(status)) {
    return {
      canRegister: false,
      nextStatus: null as CommunityRegistrationStatus | null,
      label: "Closed"
    };
  }

  if (capacity <= 0 || registeredCount < capacity) {
    return {
      canRegister: true,
      nextStatus: "registered" as const,
      label: "Register"
    };
  }

  if (input.waitlistEnabled) {
    return {
      canRegister: true,
      nextStatus: "waitlisted" as const,
      label: "Join waitlist"
    };
  }

  return {
    canRegister: false,
    nextStatus: null,
    label: "Full"
  };
}

export function communityChallengeProgressStatus(input: { currentTotal: number; amount: number; goalTarget: number; currentStatus?: string }) {
  const currentTotal = Math.max(0, Math.floor(input.currentTotal));
  const amount = Math.max(0, Math.floor(input.amount));
  const goalTarget = Math.max(1, Math.floor(input.goalTarget));
  const nextTotal = currentTotal + amount;
  const wasCompleted = normalizeCommunityParticipationStatus(input.currentStatus, "active") === "completed";
  const completed = wasCompleted || nextTotal >= goalTarget;

  return {
    nextTotal,
    completed,
    percent: Math.min(100, Math.round((nextTotal / goalTarget) * 100))
  };
}

export function shapeCommunityCommentTree<T extends CommunityCommentFlat>(comments: T[], maxDepth = 3): Array<CommunityCommentTreeNode<T>> {
  const sorted = [...comments].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const byId = new Map<string, CommunityCommentTreeNode<T>>();
  const roots: Array<CommunityCommentTreeNode<T>> = [];

  for (const comment of sorted) {
    byId.set(comment.id, { ...comment, depth: 0, children: [] });
  }

  for (const comment of sorted) {
    const node = byId.get(comment.id);

    if (!node) {
      continue;
    }

    const parent = comment.parentCommentId ? byId.get(comment.parentCommentId) : null;

    if (!parent) {
      roots.push(node);
      continue;
    }

    node.depth = Math.min(parent.depth + 1, Math.max(0, maxDepth - 1));
    parent.children.push(node);
  }

  return roots;
}
