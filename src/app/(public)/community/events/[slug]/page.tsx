import { CalendarDays, MapPin, Users } from "lucide-react";
import { notFound } from "next/navigation";

import {
  CommunityAuthorBadge,
  CommunityCommentForm,
  CommunityCommentThread,
  CommunityImage,
  CommunityStatusBadge,
  CommunityTargetActions,
  communityInputClassName
} from "@/components/community-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { getSessionUser, getUserRoles } from "@/lib/auth";
import {
  cancelCommunityEventRegistrationAction,
  markCommunityEventAttendanceAction,
  registerCommunityEventAction
} from "@/lib/community-actions";
import { getCommunityEventDetail } from "@/lib/community-queries";

export const dynamic = "force-dynamic";

type CommunityEventPageProps = {
  params: Promise<{ slug: string }>;
};

function formatDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" }) : "Scheduled";
}

export async function generateMetadata({ params }: CommunityEventPageProps) {
  const { slug } = await params;
  const data = await getCommunityEventDetail(slug);

  return {
    title: data ? data.event.title : "Community Event"
  };
}

export default async function CommunityEventPage({ params }: CommunityEventPageProps) {
  const [{ slug }, user] = await Promise.all([params, getSessionUser()]);
  const data = await getCommunityEventDetail(slug, user?.id);

  if (!data) {
    notFound();
  }

  const roles = user ? await getUserRoles(user.id) : [];
  const canManage = data.isOwner || roles.includes("admin");
  const next = `/community/events/${data.event.slug}`;

  return (
    <main className="bg-sand-50">
      <section className="border-b border-ocean-900/10 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.38fr] lg:px-8">
          <div>
            <ButtonLink href="/community#events" tone="ghost" className="px-0 hover:bg-transparent hover:text-coral-700">
              Community events
            </ButtonLink>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <CommunityStatusBadge value={data.event.status} />
              <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">{data.event.eventType}</span>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">{data.event.title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-ocean-900/68">{data.event.summary}</p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-bold text-ocean-900/62">
              <span className="inline-flex items-center gap-2"><CalendarDays size={17} aria-hidden="true" />{formatDateTime(data.event.startsAt)}</span>
              <span className="inline-flex items-center gap-2"><MapPin size={17} aria-hidden="true" />{data.event.location}</span>
              <span className="inline-flex items-center gap-2"><Users size={17} aria-hidden="true" />{data.event.registeredCount}/{data.event.capacity} registered</span>
            </div>
            <div className="mt-6">
              <CommunityAuthorBadge author={data.event.author} detail={data.event.chapter?.name ?? "Community host"} />
            </div>
          </div>

          <aside className="rounded-lg border border-ocean-900/10 bg-sand-50 p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">RSVP</p>
            <p className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">{data.event.availabilityLabel}</p>
            <p className="mt-2 text-sm font-semibold text-ocean-900/58">{data.event.waitlistCount} on waitlist / {data.event.attendedCount} attended</p>
            <div className="mt-5">
              {data.event.currentRegistrationStatus && data.event.currentRegistrationStatus !== "cancelled" ? (
                <form action={cancelCommunityEventRegistrationAction}>
                  <input type="hidden" name="eventId" value={data.event.id} />
                  <input type="hidden" name="next" value={next} />
                  <Button type="submit" tone="light" className="w-full">Cancel RSVP</Button>
                </form>
              ) : (
                <form action={registerCommunityEventAction}>
                  <input type="hidden" name="eventId" value={data.event.id} />
                  <input type="hidden" name="next" value={next} />
                  <Button type="submit" disabled={!data.event.canRegister} className={!data.event.canRegister ? "w-full cursor-not-allowed opacity-60" : "w-full"}>
                    {data.event.availabilityLabel}
                  </Button>
                </form>
              )}
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.4fr] lg:px-8">
        <div className="space-y-6">
          {data.event.imageUrl ? <CommunityImage src={data.event.imageUrl} alt={data.event.title} className="aspect-[16/9] w-full rounded-lg object-cover shadow-soft" /> : null}
          <article className="rounded-lg border border-ocean-900/10 bg-white p-5 text-base leading-8 text-ocean-900/76 shadow-soft">
            {data.event.description?.split(/\n+/).map((paragraph) => (
              <p key={paragraph} className="mb-4 last:mb-0">{paragraph}</p>
            ))}
          </article>
          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Discussion</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Event thread</h2>
              </div>
              <CommunityTargetActions targetType="event" targetId={data.event.id} next={next} reactionType={data.reactionType} />
            </div>
            <div className="mt-5">
              <CommunityCommentForm targetType="event" targetId={data.event.id} next={next} />
            </div>
            <div className="mt-5">
              {data.comments.length > 0 ? (
                <CommunityCommentThread comments={data.comments} targetType="event" targetId={data.event.id} next={next} />
              ) : (
                <p className="rounded-lg border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">No comments yet.</p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Participants</p>
            <div className="mt-5 grid gap-3">
              {data.registrations.length > 0 ? (
                data.registrations.map((registration) => (
                  <div key={registration.id} className="rounded-lg bg-sand-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <CommunityAuthorBadge author={{ name: registration.name, initials: registration.initials }} detail={registration.status} />
                      <CommunityStatusBadge value={registration.status} />
                    </div>
                    {canManage && registration.status !== "attended" ? (
                      <form action={markCommunityEventAttendanceAction} className="mt-3 flex flex-wrap gap-2">
                        <input type="hidden" name="registrationId" value={registration.id} />
                        <input type="hidden" name="next" value={next} />
                        <input name="attendanceHours" type="number" min={1} max={48} defaultValue={2} className={`${communityInputClassName} min-h-10 w-24`} />
                        <Button type="submit" tone="secondary" className="min-h-10 px-3">Mark attended</Button>
                      </form>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm font-semibold leading-6 text-ocean-900/58">No registrations yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
