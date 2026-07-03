import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  FileBadge,
  Heart,
  Leaf,
  Lock,
  MapPinned,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Waves
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DashboardImpactTrend } from "@/components/dashboard-impact-trend";
import { DashboardPersonalImpactMap } from "@/components/dashboard-personal-impact-map";
import { PassportPreview } from "@/components/passport-preview";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import {
  emailMonthlyImpactReportAction,
  generateMonthlyImpactReportAction,
  markAllNotificationsReadAction,
  markNotificationReadAction
} from "@/lib/retention-actions";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Dashboard"
};

export const dynamic = "force-dynamic";

const fallbackHeroImage =
  "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=1600&q=80";

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function formatShortDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "Pending";
}

function levelTarget(heroLevel: number) {
  return Math.max(1000, heroLevel * 2500);
}

function metricDelta(value: number, label: string) {
  return value > 0 ? `${value.toLocaleString("id-ID")} ${label}` : "Ready for your next update";
}

function achievementIcon(name: string) {
  if (name.includes("Coral")) {
    return Waves;
  }

  if (name.includes("Field")) {
    return MapPinned;
  }

  if (name.includes("Learner")) {
    return BookOpen;
  }

  if (name.includes("Advocate")) {
    return Share2;
  }

  return Heart;
}

type DashboardPageProps = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard");
  const data = await getDashboardData(user.id);
  const displayName = data.profile?.displayName ?? user.displayName ?? user.name ?? "Ocean Hero";
  const firstName = displayName.split(" ")[0] ?? "Ocean";
  const heroLevel = data.profile?.heroLevel ?? user.heroLevel ?? 1;
  const xp = data.profile?.xp ?? user.xp ?? 0;
  const xpTarget = levelTarget(heroLevel);
  const xpProgress = Math.min(100, Math.round((xp / xpTarget) * 100));
  const xpRemaining = Math.max(0, xpTarget - xp);
  const passportHref = data.profile?.publicSlug ? `/passport/${data.profile.publicSlug}` : "/dashboard/passport";
  const isNewUser =
    data.summary.totalDonated === 0 &&
    data.summary.coralFragments === 0 &&
    data.summary.fieldActivities === 0 &&
    data.summary.certificates === 0;
  const metricCards = [
    {
      label: "Total Donated",
      value: formatCurrency(data.summary.totalDonated),
      support: `Across ${data.summary.campaignsSupported.toLocaleString("id-ID")} campaigns`,
      delta: data.monthlyReport.contributions > 0 ? `${formatCurrency(data.monthlyReport.contributions)} this month` : "No contribution this month",
      icon: Heart,
      tone: "bg-ocean-700 text-white"
    },
    {
      label: "Coral Fragments Sponsored",
      value: data.summary.coralFragments.toLocaleString("id-ID"),
      support: `${data.summary.healthyCorals.toLocaleString("id-ID")} healthy · ${data.summary.monitoringCorals.toLocaleString("id-ID")} monitoring`,
      delta: metricDelta(data.monthlyReport.coralsMonitored, "monitored this month"),
      icon: Waves,
      tone: "bg-kelp-500 text-white"
    },
    {
      label: "Expeditions Completed",
      value: data.summary.fieldActivities.toLocaleString("id-ID"),
      support: `${data.summary.upcomingTrips.toLocaleString("id-ID")} upcoming trip`,
      delta: data.upcomingExpedition ? `Next: ${formatShortDate(data.upcomingExpedition.startsAt)}` : "No booking yet",
      icon: MapPinned,
      tone: "bg-purple-600 text-white"
    },
    {
      label: "Courses Completed",
      value: data.summary.completedCourses.toLocaleString("id-ID"),
      support: `${data.summary.certificates.toLocaleString("id-ID")} certificates earned`,
      delta: data.academy.continueLearning ? "Keep learning" : "Course recommendations ready",
      icon: BookOpen,
      tone: "bg-coral-500 text-white"
    }
  ];
  const starterActions = [
    { label: "Support a Campaign", href: "/campaigns", icon: Heart },
    { label: "Sponsor a Coral", href: "/campaigns", icon: Waves },
    { label: "Start a Free Course", href: "/academy", icon: BookOpen }
  ];

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Good morning, {firstName}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Your impact overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">Your actions are restoring our ocean through verified contributions, field evidence, learning, and expedition activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={passportHref} tone="secondary">
            <FileBadge size={17} aria-hidden="true" />
            View Passport
          </ButtonLink>
          <ButtonLink href="/dashboard/settings" tone="light">
            <Share2 size={17} aria-hidden="true" />
            Share Progress
          </ButtonLink>
        </div>
      </header>

      {params?.saved ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
          Dashboard update saved.
        </p>
      ) : null}

      {isNewUser ? (
        <section className="mt-6 rounded-2xl border border-dashed border-ocean-900/18 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Welcome to Terumbu.eco</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Start your conservation journey</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {starterActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link key={action.label} href={action.href} className="flex min-h-24 items-center gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 p-4 font-bold text-ocean-900 hover:border-coral-500">
                  <Icon size={22} aria-hidden="true" className="text-coral-500" />
                  {action.label}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div
          className="relative min-h-[280px] overflow-hidden rounded-2xl bg-ocean-900 p-6 text-white shadow-soft"
          style={{ backgroundImage: `linear-gradient(90deg, rgba(7,52,63,0.9), rgba(7,52,63,0.38)), url('${fallbackHeroImage}')`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-4">
              <div className="flex size-20 items-center justify-center rounded-2xl border border-coral-300/60 bg-coral-500/18">
                <Trophy size={42} aria-hidden="true" className="text-coral-200" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-normal">Ocean Hero - Level {heroLevel}</p>
                <p className="mt-1 text-sm text-white/68">{xp.toLocaleString("id-ID")} / {xpTarget.toLocaleString("id-ID")} XP</p>
              </div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/18" role="progressbar" aria-valuenow={xpProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Ocean Hero level progress">
              <div className="h-full rounded-full bg-kelp-400" style={{ width: `${xpProgress}%` }} />
            </div>
            <p className="mt-3 text-sm font-semibold text-white/78">{xpRemaining.toLocaleString("id-ID")} XP to reach Ocean Champion</p>
            <div className="mt-6 grid gap-3 text-sm font-semibold text-white/78 sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <ShieldCheck size={17} aria-hidden="true" className="text-kelp-300" />
                Exclusive badge
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays size={17} aria-hidden="true" className="text-kelp-300" />
                Early trip access
              </span>
              <span className="flex items-center gap-2">
                <Sparkles size={17} aria-hidden="true" className="text-kelp-300" />
                Partner rewards
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {metricCards.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <div className={cn("flex size-14 items-center justify-center rounded-full", item.tone)}>
                  <Icon size={24} aria-hidden="true" />
                </div>
                <p className="mt-5 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                <h2 className="mt-1 text-sm font-bold text-ocean-900">{item.label}</h2>
                <p className="mt-3 text-sm text-ocean-900/58">{item.support}</p>
                <p className="mt-4 border-t border-ocean-900/10 pt-3 text-xs font-bold text-kelp-700">{item.delta}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Latest impact update</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.latestImpactUpdate?.title ?? "No new field updates yet"}</h2>
            </div>
            {data.latestImpactUpdate ? <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">New</span> : null}
          </div>
          {data.latestImpactUpdate ? (
            <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1fr] xl:grid-cols-1 2xl:grid-cols-[0.9fr_1fr]">
              <div className="relative min-h-48 overflow-hidden rounded-2xl bg-ocean-900">
                {data.latestImpactUpdate.imageUrl ? (
                  <Image src={data.latestImpactUpdate.imageUrl} alt={`${data.latestImpactUpdate.title} field update`} fill className="object-cover" sizes="(min-width: 1280px) 320px, 100vw" />
                ) : null}
                <span className="absolute bottom-3 left-3 rounded-full bg-ocean-900/80 px-3 py-1 text-xs font-bold text-white">{formatShortDate(data.latestImpactUpdate.date)}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-ocean-900">{data.latestImpactUpdate.campaignTitle}</p>
                <p className="mt-3 text-sm leading-6 text-ocean-900/68">{data.latestImpactUpdate.body}</p>
                <div className="mt-4 grid gap-2 text-sm font-semibold text-ocean-900/70">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={17} aria-hidden="true" className="text-kelp-500" />
                    Status: {data.latestImpactUpdate.status}
                  </span>
                  <span className="flex items-center gap-2">
                    <CameraIcon />
                    {data.latestImpactUpdate.metricLabel}
                  </span>
                </div>
                <Link href={data.latestImpactUpdate.href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                  View full update <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ocean-900/62">We will notify you when a project team publishes the next monitoring report.</p>
          )}
        </article>

        <DashboardPersonalImpactMap sites={data.personalMapSites} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardImpactTrend trend={data.trend} />

        <article id="notifications" className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Notifications</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">What changed</h2>
            </div>
            <div className="flex items-center gap-3">
              {data.unreadNotificationCount > 0 ? (
                <form action={markAllNotificationsReadAction}>
                  <input type="hidden" name="next" value="/dashboard#notifications" />
                  <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">
                    Mark all read
                  </Button>
                </form>
              ) : null}
              <Bell size={22} aria-hidden="true" className="text-coral-500" />
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {data.notifications.length > 0 ? (
              data.notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={notification.href} className="text-sm font-bold text-ocean-900 hover:text-coral-700">{notification.message}</Link>
                    {notification.unread ? <span className="mt-1 size-2 shrink-0 rounded-full bg-coral-500" aria-label="Unread" /> : null}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-ocean-900/54">
                    {notification.category} · {formatShortDate(notification.timestamp)}
                  </p>
                  {notification.unread ? (
                    <form action={markNotificationReadAction} className="mt-3">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <input type="hidden" name="next" value="/dashboard#notifications" />
                      <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">
                        Mark read
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">No notifications yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My sponsored corals</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">
                {data.summary.coralFragments.toLocaleString("id-ID")} coral fragments across {data.coralCards.length.toLocaleString("id-ID")} records
              </h2>
            </div>
            <Link href="/dashboard/corals" className="text-sm font-bold text-coral-700 hover:text-coral-500">View all</Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {data.coralCards.length > 0 ? (
              data.coralCards.slice(0, 3).map((coral) => (
                <Link key={coral.code} href={`/dashboard/corals/${coral.code}`} className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-sand-50 hover:border-coral-500">
                  <div className="relative h-32 bg-ocean-900">
                    {coral.imageUrl ? <Image src={coral.imageUrl} alt={`${coral.label} campaign site`} fill className="object-cover" sizes="(min-width: 1024px) 240px, 100vw" /> : null}
                    <span className="absolute bottom-3 left-3 rounded-full bg-kelp-500 px-3 py-1 text-xs font-bold text-white">{coral.statusLabel}</span>
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-ocean-900">{coral.code}</p>
                    <p className="mt-1 text-sm text-ocean-900/58">{coral.location}</p>
                    <p className="mt-3 text-xs font-semibold text-ocean-900/58">Last update: {formatShortDate(coral.lastUpdatedAt)}</p>
                    <p className="mt-1 text-xs font-semibold text-ocean-900/58">Next update: {coral.nextUpdateLabel}</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="md:col-span-3 rounded-2xl border border-dashed border-ocean-900/14 bg-sand-50 p-6">
                <p className="font-bold text-ocean-900">You have not sponsored a coral yet.</p>
                <p className="mt-2 text-sm text-ocean-900/62">Sponsor a coral and follow its restoration journey through field updates.</p>
                <Link href="/campaigns" className="mt-4 inline-flex text-sm font-bold text-coral-700">Explore coral sponsorship</Link>
              </div>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Upcoming expedition</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.upcomingExpedition?.expeditionTitle ?? "No upcoming expedition"}</h2>
            </div>
            <Link href="/dashboard/expeditions" className="text-sm font-bold text-coral-700 hover:text-coral-500">Manage</Link>
          </div>
          {data.upcomingExpedition ? (
            <div className="mt-5">
              <div className="relative h-40 overflow-hidden rounded-2xl bg-ocean-900">
                {data.upcomingExpedition.expeditionImageUrl ? (
                  <Image src={data.upcomingExpedition.expeditionImageUrl} alt={`${data.upcomingExpedition.expeditionTitle} expedition`} fill className="object-cover" sizes="(min-width: 1280px) 360px, 100vw" />
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 text-sm font-semibold text-ocean-900/70">
                <span>{formatDate(data.upcomingExpedition.startsAt)} - {formatDate(data.upcomingExpedition.endsAt)}</span>
                <span>{data.upcomingExpedition.durationLabel} · {data.upcomingExpedition.participantsCount} participant</span>
                <span>Starts in {data.upcomingExpedition.startsInDays} days</span>
              </div>
              <div className="mt-5 grid gap-2">
                {data.upcomingExpedition.preparationChecklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-ocean-900/68">{item.label}</span>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", item.complete ? "bg-kelp-100 text-kelp-700" : "bg-sand-100 text-ocean-900/64")}>
                      {item.complete ? "Done" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href="/dashboard/expeditions">Manage Booking</ButtonLink>
                <ButtonLink href="/expeditions" tone="light">Preparation Guide</ButtonLink>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-ocean-900/14 bg-sand-50 p-5">
              <p className="text-sm leading-6 text-ocean-900/62">Explore conservation trips connected to projects you support.</p>
              <Link href="/expeditions" className="mt-4 inline-flex text-sm font-bold text-coral-700">Find an expedition</Link>
            </div>
          )}
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My contributions</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{formatCurrency(data.summary.totalDonated)} across {data.summary.campaignsSupported} campaigns</h2>
            </div>
            <Link href="/dashboard/donations" className="text-sm font-bold text-coral-700 hover:text-coral-500">View all donations</Link>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-ocean-900/46">
                <tr>
                  <th className="py-3">Campaign</th>
                  <th className="py-3">My contribution</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Latest update</th>
                  <th className="py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ocean-900/10">
                {data.campaignContributions.map((item) => (
                  <tr key={item.campaignSlug}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative size-12 overflow-hidden rounded-xl bg-ocean-900">
                          {item.imageUrl ? <Image src={item.imageUrl} alt={`${item.campaignTitle} thumbnail`} fill className="object-cover" sizes="48px" /> : null}
                        </div>
                        <div>
                          <Link href={`/campaigns/${item.campaignSlug}`} className="font-bold text-ocean-900 hover:text-coral-700">{item.campaignTitle}</Link>
                          <p className="mt-1 text-xs text-ocean-900/56">{item.organizationName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-bold text-ocean-900">
                      {formatCurrency(item.contribution)}
                      {item.monthlyAmount > 0 ? <span className="mt-1 block text-xs text-kelp-700">{formatCurrency(item.monthlyAmount)} monthly</span> : null}
                    </td>
                    <td className="py-4">
                      <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">{item.statusLabel}</span>
                    </td>
                    <td className="py-4 text-ocean-900/64">{item.latestUpdate ? `${formatShortDate(item.latestUpdate.publishedAt ?? item.latestUpdate.createdAt)} · New update` : "No new update"}</td>
                    <td className="py-4 text-right">
                      <Link href="/dashboard/donations" className="inline-flex items-center justify-end gap-1 text-xs font-bold text-coral-700">
                        <Download size={14} aria-hidden="true" />
                        {item.receiptNumber ?? "Pending"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.campaignContributions.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">Your campaign contribution rows will appear here after your first paid donation.</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Academy progress</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.academy.continueLearning?.courseTitle ?? data.academy.recommendedCourse?.title ?? "Start learning"}</h2>
            </div>
            <Link href="/dashboard/academy" className="text-sm font-bold text-coral-700 hover:text-coral-500">Go to Academy</Link>
          </div>
          {data.academy.continueLearning ? (
            <div className="mt-5">
              <div className="relative h-40 overflow-hidden rounded-2xl bg-ocean-900">
                {data.academy.continueLearning.courseImageUrl ? (
                  <Image src={data.academy.continueLearning.courseImageUrl} alt={`${data.academy.continueLearning.courseTitle} course`} fill className="object-cover" sizes="(min-width: 1280px) 360px, 100vw" />
                ) : null}
              </div>
              <p className="mt-4 text-sm font-semibold text-ocean-900/68">
                Module {Math.max(1, data.academy.continueLearning.completedLessons)} of {Math.max(1, data.academy.continueLearning.totalLessons)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ocean-50" role="progressbar" aria-valuenow={data.academy.continueLearning.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Academy progress">
                <div className="h-full rounded-full bg-kelp-500" style={{ width: `${data.academy.continueLearning.progressPercent}%` }} />
              </div>
              <p className="mt-2 text-sm text-ocean-900/62">{data.academy.continueLearning.progressPercent}% complete · {data.academy.continueLearning.remainingMinutes} min remaining</p>
              <ButtonLink href={`/academy/courses/${data.academy.continueLearning.courseSlug}`} className="mt-5">Continue Learning</ButtonLink>
            </div>
          ) : data.academy.recommendedCourse ? (
            <div className="mt-5 rounded-2xl border border-dashed border-ocean-900/14 bg-sand-50 p-5">
              <p className="text-sm leading-6 text-ocean-900/62">{data.academy.recommendedCourse.summary}</p>
              <Link href={`/academy/courses/${data.academy.recommendedCourse.slug}`} className="mt-4 inline-flex text-sm font-bold text-coral-700">Start course</Link>
            </div>
          ) : null}
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-ocean-900">{data.academy.completedCourses}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">Completed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ocean-900">{data.academy.certificatesEarned}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">Certificates</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ocean-900">{data.academy.inProgressCourses}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">In progress</p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact timeline</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Recent activity</h2>
            </div>
            <Link href="/dashboard/impact" className="text-sm font-bold text-coral-700 hover:text-coral-500">View all activity</Link>
          </div>
          <ol className="mt-5 space-y-4">
            {data.timelineItems.map((item) => (
              <li key={item.id} className="grid grid-cols-[84px_1fr] gap-3">
                <time className="text-xs font-bold text-ocean-900/52">{formatShortDate(item.occurredAt)}</time>
                <Link href={item.href} className="border-l-2 border-ocean-100 pl-4">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{item.category}</span>
                  <span className="mt-1 block font-bold text-ocean-900">{item.title}</span>
                  <span className="mt-1 block text-sm text-ocean-900/58">{item.description}</span>
                </Link>
              </li>
            ))}
          </ol>
        </article>

        <div className="grid gap-6">
          <article id="monthly-report" className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Achievements</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {data.achievements.slice(0, 4).map((achievement) => {
                const Icon = achievementIcon(achievement.name);

                return (
                  <div key={achievement.name} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("flex size-11 items-center justify-center rounded-full", achievement.earned ? "bg-coral-500 text-white" : "bg-white text-ocean-900/48")}>
                        <Icon size={20} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="font-bold text-ocean-900">{achievement.name}</p>
                        <p className="mt-1 text-xs leading-5 text-ocean-900/58">{achievement.criteria}</p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-coral-500" style={{ width: `${achievement.progressPercent}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-ocean-900/58">{achievement.earned ? `Earned ${formatShortDate(achievement.earnedAt)}` : `${achievement.progress}/${achievement.target} complete`}</p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Continue your impact</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              {data.recommendations.map((recommendation) => (
                <Link key={`${recommendation.type}-${recommendation.title}`} href={recommendation.href} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4 hover:border-coral-500">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{recommendation.type}</span>
                  <p className="mt-2 font-bold text-ocean-900">{recommendation.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/62">{recommendation.reason}</p>
                  <span className="mt-3 inline-flex text-sm font-bold text-coral-700">{recommendation.action}</span>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        {data.passportPreview ? <PassportPreview passport={data.passportPreview} /> : null}

        <div className="grid gap-6">
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Monthly report</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.monthlyReport.label}</h2>
              </div>
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold", data.monthlyReport.ready ? "bg-kelp-100 text-kelp-700" : "bg-sand-100 text-ocean-900/62")}>
                {data.monthlyReport.persisted ? "Saved" : data.monthlyReport.ready ? "Ready" : "Pending"}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ReportItem label="Contributions" value={formatCurrency(data.monthlyReport.contributions)} />
              <ReportItem label="Campaign updates" value={String(data.monthlyReport.campaignUpdates)} />
              <ReportItem label="New evidence" value={String(data.monthlyReport.newEvidence)} />
              <ReportItem label="Corals monitored" value={String(data.monthlyReport.coralsMonitored)} />
            </div>
            <p className="mt-4 text-xs font-semibold text-ocean-900/54">
              {data.monthlyReport.emailedAt
                ? `Last emailed ${formatShortDate(data.monthlyReport.emailedAt)}`
                : data.monthlyReport.generatedAt
                  ? `Generated ${formatShortDate(data.monthlyReport.generatedAt)}`
                  : "Generate a saved report record before sending summaries."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href="/dashboard/impact" tone="secondary">View Report</ButtonLink>
              {data.monthlyReport.preferenceEnabled ? (
                <form action={generateMonthlyImpactReportAction}>
                  <Button type="submit" tone="light">
                    <Download size={17} aria-hidden="true" />
                    Save Summary
                  </Button>
                </form>
              ) : null}
              {data.monthlyReport.emailEnabled ? (
                <form action={emailMonthlyImpactReportAction}>
                  <Button type="submit" tone="light">
                    Email Summary
                  </Button>
                </form>
              ) : null}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Privacy and profile</p>
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-ocean-900">Profile completeness</p>
                  <p className="mt-1 text-sm text-ocean-900/58">{data.profileCompleteness.missing.length > 0 ? `Missing: ${data.profileCompleteness.missing.join(", ")}` : "Profile ready"}</p>
                </div>
                <span className="text-2xl font-bold text-ocean-900">{data.profileCompleteness.percent}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-ocean-50">
                <div className="h-full rounded-full bg-kelp-500" style={{ width: `${data.profileCompleteness.percent}%` }} />
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {data.privacyControls.map((control) => (
                <Link key={control.label} href={control.href} className="flex items-center justify-between gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 p-4 text-sm">
                  <span className="flex items-center gap-2 font-bold text-ocean-900">
                    <Lock size={16} aria-hidden="true" className="text-ocean-900/48" />
                    {control.label}
                  </span>
                  <span className="font-semibold text-ocean-900/58">{control.value}</span>
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

function CameraIcon() {
  return <Leaf size={17} aria-hidden="true" className="text-coral-500" />;
}

function ReportItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-ocean-900">{value}</p>
      <p className="mt-1 text-sm font-semibold text-ocean-900/54">{label}</p>
    </div>
  );
}
