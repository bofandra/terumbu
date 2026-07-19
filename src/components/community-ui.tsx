/* eslint-disable @next/next/no-img-element */
import { CalendarDays, Flag, HeartHandshake, MessageCircle, Send, Sparkles, Users, Waves } from "lucide-react";
import Link from "next/link";

import {
  cancelCommunityEventRegistrationAction,
  createCommunityChallengeAction,
  createCommunityCommentAction,
  createCommunityEventAction,
  createCommunityPostAction,
  joinCommunityChapterAction,
  joinCommunityChallengeAction,
  leaveCommunityChapterAction,
  reactToCommunityTargetAction,
  registerCommunityEventAction,
  removeCommunityReactionAction,
  reportCommunityTargetAction
} from "@/lib/community-actions";
import type {
  CommunityChallengeCard,
  CommunityChapterCard,
  CommunityCommentView,
  CommunityEventCard,
  CommunityPostCard
} from "@/lib/community-queries";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";

export const communityInputClassName =
  "min-h-11 rounded-lg border border-ocean-900/12 bg-white px-3 text-sm font-semibold text-ocean-900 outline-none transition placeholder:text-ocean-900/34 focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20";

export const communityTextareaClassName =
  "min-h-28 rounded-lg border border-ocean-900/12 bg-white px-3 py-3 text-sm font-semibold leading-6 text-ocean-900 outline-none transition placeholder:text-ocean-900/34 focus:border-coral-500 focus:ring-2 focus:ring-coral-500/20";

export function CommunityAuthorBadge({ author, detail }: { author: { name: string; initials: string }; detail?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ocean-900 text-xs font-bold text-white">{author.initials}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-ocean-900">{author.name}</span>
        {detail ? <span className="block truncate text-xs font-semibold text-ocean-900/54">{detail}</span> : null}
      </span>
    </div>
  );
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Open";
}

function formatDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "Open";
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (["published", "open", "active", "registered", "attended", "completed"].includes(normalized)) {
    return "bg-kelp-100 text-kelp-700";
  }

  if (["waitlisted", "reviewed"].includes(normalized)) {
    return "bg-sand-100 text-ocean-900";
  }

  if (["hidden", "deleted", "cancelled", "actioned"].includes(normalized)) {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-900/64";
}

export function CommunityStatusBadge({ value }: { value: string }) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-bold capitalize", statusClass(value))}>{value.replace(/_/g, " ")}</span>;
}

function cardImage(url: string | null, title: string) {
  if (!url) {
    return null;
  }

  return <CommunityImage src={url} alt={title} className="aspect-[16/9] w-full rounded-lg object-cover" />;
}

export function CommunityImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} className={className} />;
}

export function CommunityPostCardView({ post }: { post: CommunityPostCard }) {
  return (
    <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      {cardImage(post.mediaUrl, post.title)}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CommunityStatusBadge value={post.postType} />
        {post.chapter ? <Link href={`/community/chapters/${post.chapter.slug}`} className="text-xs font-bold text-coral-700 hover:text-coral-500">{post.chapter.name}</Link> : null}
      </div>
      <Link href={`/community/posts/${post.slug}`} className="mt-3 block text-xl font-bold tracking-normal text-ocean-900 hover:text-coral-700">
        {post.title}
      </Link>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-ocean-900/64">{post.body}</p>
      <div className="mt-5 flex items-center justify-between gap-3">
        <CommunityAuthorBadge author={post.author} detail={formatDate(post.publishedAt ?? post.createdAt)} />
        <span className="shrink-0 text-xs font-bold text-ocean-900/54">{post.reactionCount} reactions / {post.commentCount} comments</span>
      </div>
    </article>
  );
}

export function CommunityEventCardView({ event, next }: { event: CommunityEventCard; next?: string }) {
  const eventNext = next ?? `/community/events/${event.slug}`;

  return (
    <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      {cardImage(event.imageUrl, event.title)}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CommunityStatusBadge value={event.status} />
        <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{event.eventType}</span>
      </div>
      <Link href={`/community/events/${event.slug}`} className="mt-3 block text-xl font-bold tracking-normal text-ocean-900 hover:text-coral-700">
        {event.title}
      </Link>
      <p className="mt-2 text-sm leading-6 text-ocean-900/64">{event.summary}</p>
      <div className="mt-4 grid gap-2 text-sm font-semibold text-ocean-900/62">
        <span className="inline-flex items-center gap-2"><CalendarDays size={16} aria-hidden="true" />{formatDateTime(event.startsAt)}</span>
        <span className="inline-flex items-center gap-2"><Users size={16} aria-hidden="true" />{event.registeredCount}/{event.capacity} registered / {event.waitlistCount} waitlisted</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {event.currentRegistrationStatus && event.currentRegistrationStatus !== "cancelled" ? (
          <form action={cancelCommunityEventRegistrationAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="next" value={eventNext} />
            <Button type="submit" tone="light" className="min-h-10 px-4">Cancel RSVP</Button>
          </form>
        ) : (
          <form action={registerCommunityEventAction}>
            <input type="hidden" name="eventId" value={event.id} />
            <input type="hidden" name="next" value={eventNext} />
            <Button type="submit" disabled={!event.canRegister} className={cn("min-h-10 px-4", !event.canRegister && "cursor-not-allowed opacity-60")}>
              {event.availabilityLabel}
            </Button>
          </form>
        )}
        <ButtonLink href={`/community/events/${event.slug}`} tone="ghost" className="min-h-10 px-3">
          Details
        </ButtonLink>
      </div>
    </article>
  );
}

export function CommunityChallengeCardView({ challenge, next }: { challenge: CommunityChallengeCard; next?: string }) {
  const challengeNext = next ?? `/community/challenges/${challenge.slug}`;
  const userProgress = challenge.currentParticipation?.progressTotal ?? 0;
  const aggregateProgress = challenge.participantCount > 0 ? Math.round((challenge.completedCount / challenge.participantCount) * 100) : 0;

  return (
    <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      {cardImage(challenge.imageUrl, challenge.title)}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CommunityStatusBadge value={challenge.status} />
        <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{challenge.challengeType}</span>
      </div>
      <Link href={`/community/challenges/${challenge.slug}`} className="mt-3 block text-xl font-bold tracking-normal text-ocean-900 hover:text-coral-700">
        {challenge.title}
      </Link>
      <p className="mt-2 text-sm leading-6 text-ocean-900/64">{challenge.summary}</p>
      <ProgressMeter value={challenge.currentParticipation ? Math.min(100, Math.round((userProgress / challenge.goalTarget) * 100)) : aggregateProgress} label={`${challenge.title} progress`} className="mt-4 h-2" />
      <p className="mt-2 text-xs font-bold text-ocean-900/54">
        {challenge.currentParticipation ? `${userProgress}/${challenge.goalTarget} ${challenge.unit}` : `${challenge.completedCount}/${challenge.participantCount} completed`}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {challenge.currentParticipation ? (
          <ButtonLink href={`/community/challenges/${challenge.slug}#progress`} className="min-h-10 px-4">
            Add Progress
          </ButtonLink>
        ) : (
          <form action={joinCommunityChallengeAction}>
            <input type="hidden" name="challengeId" value={challenge.id} />
            <input type="hidden" name="next" value={challengeNext} />
            <Button type="submit" className="min-h-10 px-4">Join</Button>
          </form>
        )}
        <ButtonLink href={`/community/challenges/${challenge.slug}`} tone="ghost" className="min-h-10 px-3">
          Details
        </ButtonLink>
      </div>
    </article>
  );
}

export function CommunityChapterCardView({ chapter, next }: { chapter: CommunityChapterCard; next?: string }) {
  const chapterNext = next ?? `/community/chapters/${chapter.slug}`;
  const joined = chapter.currentMembershipStatus === "active";

  return (
    <article className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      {cardImage(chapter.imageUrl, chapter.name)}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CommunityStatusBadge value={chapter.status} />
        <span className="text-xs font-bold text-ocean-900/54">{chapter.region}</span>
      </div>
      <Link href={`/community/chapters/${chapter.slug}`} className="mt-3 block text-xl font-bold tracking-normal text-ocean-900 hover:text-coral-700">
        {chapter.name}
      </Link>
      <p className="mt-2 text-sm leading-6 text-ocean-900/64">{chapter.description}</p>
      <p className="mt-4 text-xs font-bold text-ocean-900/54">
        {chapter.memberCount} members / {chapter.postCount} posts / {chapter.eventCount} events / {chapter.challengeCount} challenges
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <form action={joined ? leaveCommunityChapterAction : joinCommunityChapterAction}>
          <input type="hidden" name="chapterId" value={chapter.id} />
          <input type="hidden" name="next" value={chapterNext} />
          <Button type="submit" tone={joined ? "light" : "primary"} className="min-h-10 px-4">{joined ? "Leave" : "Join"}</Button>
        </form>
        <ButtonLink href={`/community/chapters/${chapter.slug}`} tone="ghost" className="min-h-10 px-3">
          Open
        </ButtonLink>
      </div>
    </article>
  );
}

export function CommunityTargetActions({
  targetType,
  targetId,
  next,
  reactionType
}: {
  targetType: "post" | "event" | "challenge" | "comment";
  targetId: string;
  next: string;
  reactionType?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <form action={reactionType ? removeCommunityReactionAction : reactToCommunityTargetAction}>
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="reactionType" value="celebrate" />
        <input type="hidden" name="next" value={next} />
        <Button type="submit" tone={reactionType ? "light" : "primary"} className="min-h-10 px-4">
          <Sparkles size={16} aria-hidden="true" />
          {reactionType ? "Reacted" : "React"}
        </Button>
      </form>
      <details className="group">
        <summary className="inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-lg border border-ocean-900/10 bg-white px-4 text-sm font-bold text-ocean-900 transition hover:border-coral-500">
          <Flag size={16} aria-hidden="true" />
          Report
        </summary>
        <form action={reportCommunityTargetAction} className="mt-2 grid min-w-72 gap-2 rounded-lg border border-ocean-900/10 bg-white p-3 shadow-soft">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <input type="hidden" name="next" value={next} />
          <select name="reason" defaultValue="safety" className={communityInputClassName}>
            <option value="safety">Safety concern</option>
            <option value="spam">Spam</option>
            <option value="misleading">Misleading claim</option>
            <option value="harassment">Harassment</option>
          </select>
          <textarea name="detail" placeholder="Optional note" className={communityTextareaClassName} />
          <Button type="submit" tone="secondary" className="min-h-10">Submit report</Button>
        </form>
      </details>
    </div>
  );
}

export function CommunityCommentThread({ comments, targetType, targetId, next }: { comments: CommunityCommentView[]; targetType: "post" | "event" | "challenge"; targetId: string; next: string }) {
  return (
    <div className="grid gap-3">
      {comments.map((comment) => (
        <article key={comment.id} className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4" style={{ marginLeft: `${Math.min(comment.depth, 2) * 20}px` }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CommunityAuthorBadge author={comment.author} detail={formatDate(comment.createdAt)} />
            <span className="text-xs font-bold text-ocean-900/48">{comment.reactionCount} reactions</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-ocean-900/72">{comment.body}</p>
          <details className="mt-3">
            <summary className="inline-flex cursor-pointer list-none text-sm font-bold text-coral-700 hover:text-coral-500">Reply</summary>
            <CommunityCommentForm targetType={targetType} targetId={targetId} parentCommentId={comment.id} next={next} compact />
          </details>
          {comment.children.length > 0 ? <CommunityCommentThread comments={comment.children} targetType={targetType} targetId={targetId} next={next} /> : null}
        </article>
      ))}
    </div>
  );
}

export function CommunityCommentForm({
  targetType,
  targetId,
  parentCommentId,
  next,
  compact = false
}: {
  targetType: "post" | "event" | "challenge";
  targetId: string;
  parentCommentId?: string;
  next: string;
  compact?: boolean;
}) {
  return (
    <form action={createCommunityCommentAction} className={cn("grid gap-3", compact ? "mt-3" : "rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft")}>
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <input type="hidden" name="next" value={next} />
      {parentCommentId ? <input type="hidden" name="parentCommentId" value={parentCommentId} /> : null}
      <textarea name="body" placeholder={parentCommentId ? "Write a reply" : "Add to the discussion"} className={communityTextareaClassName} required />
      <Button type="submit" className="justify-self-start">
        <Send size={16} aria-hidden="true" />
        {parentCommentId ? "Reply" : "Comment"}
      </Button>
    </form>
  );
}

export function CommunityComposer({ chapters }: { chapters: CommunityChapterCard[] }) {
  return (
    <section className="rounded-lg border border-ocean-900/10 bg-white p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Create</p>
          <h2 className="mt-1 text-2xl font-bold tracking-normal text-ocean-900">Publish to Community</h2>
        </div>
        <div className="flex gap-2 text-ocean-900/58">
          <MessageCircle size={20} aria-hidden="true" />
          <CalendarDays size={20} aria-hidden="true" />
          <HeartHandshake size={20} aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <form action={createCommunityPostAction} encType="multipart/form-data" className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
          <h3 className="font-bold text-ocean-900">Post</h3>
          <input name="title" placeholder="Story or field note title" className={communityInputClassName} required />
          <select name="postType" defaultValue="story" className={communityInputClassName}>
            <option value="story">Story</option>
            <option value="field_note">Field note</option>
            <option value="question">Question</option>
            <option value="resource">Resource</option>
          </select>
          <ChapterSelect chapters={chapters} />
          <textarea name="body" placeholder="Share what happened, what you learned, or what help is needed." className={communityTextareaClassName} required />
          <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={communityInputClassName} />
          <Button type="submit">Publish Post</Button>
        </form>

        <form action={createCommunityEventAction} encType="multipart/form-data" className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
          <h3 className="font-bold text-ocean-900">Event</h3>
          <input name="title" placeholder="Mangrove planting day" className={communityInputClassName} required />
          <input name="summary" placeholder="One-line event summary" className={communityInputClassName} required />
          <ChapterSelect chapters={chapters} />
          <input name="location" placeholder="Location" className={communityInputClassName} required />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="startsAt" type="datetime-local" className={communityInputClassName} required />
            <input name="endsAt" type="datetime-local" className={communityInputClassName} required />
          </div>
          <input name="capacity" type="number" min={1} defaultValue={40} className={communityInputClassName} required />
          <label className="flex items-center gap-2 text-sm font-bold text-ocean-900">
            <input name="waitlistEnabled" type="checkbox" defaultChecked className="size-4 accent-coral-500" />
            Waitlist
          </label>
          <textarea name="description" placeholder="What participants should expect." className={communityTextareaClassName} required />
          <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={communityInputClassName} />
          <Button type="submit">Publish Event</Button>
        </form>

        <form action={createCommunityChallengeAction} encType="multipart/form-data" className="grid gap-3 rounded-lg border border-ocean-900/10 bg-sand-50 p-4">
          <h3 className="font-bold text-ocean-900">Challenge</h3>
          <input name="title" placeholder="Plastic-Free Week" className={communityInputClassName} required />
          <input name="summary" placeholder="One-line challenge summary" className={communityInputClassName} required />
          <ChapterSelect chapters={chapters} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="goalTarget" type="number" min={1} defaultValue={7} className={communityInputClassName} required />
            <input name="unit" placeholder="actions" defaultValue="actions" className={communityInputClassName} required />
          </div>
          <input name="goalMetric" placeholder="Goal metric" defaultValue="completed actions" className={communityInputClassName} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="startsAt" type="date" className={communityInputClassName} />
            <input name="endsAt" type="date" className={communityInputClassName} />
          </div>
          <textarea name="description" placeholder="Rules, tracking guidance, and evidence expectations." className={communityTextareaClassName} required />
          <input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className={communityInputClassName} />
          <Button type="submit">Publish Challenge</Button>
        </form>
      </div>
    </section>
  );
}

function ChapterSelect({ chapters }: { chapters: CommunityChapterCard[] }) {
  return (
    <select name="chapterId" defaultValue="" className={communityInputClassName}>
      <option value="">No chapter</option>
      {chapters.map((chapter) => (
        <option key={chapter.id} value={chapter.id}>
          {chapter.name}
        </option>
      ))}
    </select>
  );
}

export function CommunityEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ocean-900/16 bg-white p-6 text-center">
      <Waves className="mx-auto text-coral-500" size={28} aria-hidden="true" />
      <h3 className="mt-3 text-lg font-bold text-ocean-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ocean-900/58">{description}</p>
    </div>
  );
}
