import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Download,
  ExternalLink,
  FileBadge,
  Globe2,
  Heart,
  Lock,
  MapPinned,
  Pencil,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Waves
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DashboardPersonalImpactMap } from "@/components/dashboard-personal-impact-map";
import { PassportCopyButton } from "@/components/passport-copy-button";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireUser } from "@/lib/auth";
import { updatePassportVisibilityAction } from "@/lib/auth-actions";
import { getDashboardData } from "@/lib/queries";
import { cn, formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Impact Passport"
};

export const dynamic = "force-dynamic";

const heroImage = "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1800&q=80";
const ecosystemFallback = "https://images.unsplash.com/photo-1546026423-cc4642628d2b?auto=format&fit=crop&w=900&q=80";

type DashboardPassportPageProps = {
  searchParams?: Promise<{
    saved?: string;
  }>;
};

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
type Achievement = DashboardData["achievements"][number];

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
}

function shortDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "Pending";
}

function initialsForName(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "OH";
}

function passportId(publicSlug: string | null | undefined, issuedAt: Date | null | undefined) {
  const checksum = (publicSlug ?? "ocean-hero").split("").reduce((total, character) => total + character.charCodeAt(0), 0);
  const year = issuedAt?.getFullYear() ?? new Date().getFullYear();

  return `TE-ID-${year}-${String(checksum).padStart(6, "0")}`;
}

function publicPassportUrl(publicSlug: string | null | undefined) {
  return publicSlug ? `https://terumbu.eco/passport/${publicSlug}` : "https://terumbu.eco/passport";
}

function canUseOptimizedImage(src: string | null | undefined) {
  return Boolean(src?.startsWith("/") || src?.startsWith("https://images.unsplash.com/"));
}

function visibilityCopy(value: string | null | undefined) {
  if (value === "public") {
    return {
      icon: Globe2,
      label: "Public",
      description: "Visible to everyone with your profile link.",
      tone: "bg-kelp-100 text-kelp-700"
    };
  }

  if (value === "link") {
    return {
      icon: Share2,
      label: "Link only",
      description: "Anyone with the link can view this profile.",
      tone: "bg-ocean-50 text-ocean-700"
    };
  }

  return {
    icon: Lock,
    label: "Private",
    description: "Only you can view this profile.",
    tone: "bg-sand-50 text-ocean-900"
  };
}

function achievementIcon(achievement: Achievement) {
  if (achievement.name.includes("Coral")) {
    return Waves;
  }

  if (achievement.name.includes("Field")) {
    return MapPinned;
  }

  if (achievement.name.includes("Learner")) {
    return BookOpen;
  }

  if (achievement.name.includes("Advocate")) {
    return Share2;
  }

  return Heart;
}

function impactStory(displayName: string, data: DashboardData) {
  if (
    data.summary.totalDonated === 0 &&
    data.summary.coralFragments === 0 &&
    data.summary.fieldActivities === 0 &&
    data.summary.certificates === 0
  ) {
    return `${displayName}'s Impact Passport is ready to collect verified donations, sponsored ecosystems, field activities, learning records, and certificates.`;
  }

  return `Since joining Terumbu.eco, ${displayName} has supported ${data.summary.campaignsSupported.toLocaleString(
    "id-ID"
  )} conservation projects, financially supported ${data.summary.coralFragments.toLocaleString("id-ID")} coral fragments, joined ${data.summary.fieldActivities.toLocaleString(
    "id-ID"
  )} field activities, completed ${data.summary.completedCourses.toLocaleString("id-ID")} courses, and earned ${data.summary.certificates.toLocaleString(
    "id-ID"
  )} verified certificates. These records show participation and support; ecological outcomes remain tied to partner monitoring updates.`;
}

function metricCards(data: DashboardData) {
  return [
    {
      label: "Total contributed",
      value: formatCurrency(data.summary.totalDonated),
      support: `Across ${data.summary.campaignsSupported.toLocaleString("id-ID")} projects`,
      icon: Heart,
      tone: "bg-ocean-700 text-white"
    },
    {
      label: "Coral fragments",
      value: data.summary.coralFragments.toLocaleString("id-ID"),
      support: `${data.summary.healthyCorals.toLocaleString("id-ID")} healthy · ${data.summary.monitoringCorals.toLocaleString("id-ID")} monitoring`,
      icon: Waves,
      tone: "bg-kelp-500 text-white"
    },
    {
      label: "Expeditions",
      value: data.summary.fieldActivities.toLocaleString("id-ID"),
      support: `${data.summary.upcomingTrips.toLocaleString("id-ID")} upcoming`,
      icon: MapPinned,
      tone: "bg-credential-700 text-white"
    },
    {
      label: "Courses",
      value: data.summary.completedCourses.toLocaleString("id-ID"),
      support: `${data.summary.certificates.toLocaleString("id-ID")} certificates`,
      icon: BookOpen,
      tone: "bg-coral-500 text-white"
    },
    {
      label: "Volunteer hours",
      value: data.summary.volunteerHours.toLocaleString("id-ID"),
      support: data.summary.volunteerHours > 0 ? "Verified partner records" : "Add external records",
      icon: Users,
      tone: "bg-ocean-500 text-white"
    },
    {
      label: "Projects supported",
      value: data.summary.campaignsSupported.toLocaleString("id-ID"),
      support: "Campaign portfolio",
      icon: Award,
      tone: "bg-sand-300 text-ocean-900"
    }
  ];
}

export default async function DashboardPassportPage({ searchParams }: DashboardPassportPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard/passport");
  const data = await getDashboardData(user.id);
  const displayName = data.profile?.displayName ?? user.displayName ?? user.name ?? "Ocean Hero";
  const publicSlug = data.profile?.publicSlug;
  const publicHref = publicSlug ? `/passport/${publicSlug}` : "/dashboard/settings";
  const publicUrl = publicPassportUrl(publicSlug);
  const currentVisibility = data.profile?.passportVisibility ?? "private";
  const visibility = visibilityCopy(currentVisibility);
  const VisibilityIcon = visibility.icon;
  const heroLevel = data.profile?.heroLevel ?? user.heroLevel ?? 1;
  const xp = data.profile?.xp ?? user.xp ?? 0;
  const xpTarget = Math.max(1000, heroLevel * 2500);
  const xpProgress = Math.min(100, Math.round((xp / xpTarget) * 100));
  const xpRemaining = Math.max(0, xpTarget - xp);
  const issuedAt = data.profile?.passportCreatedAt ?? null;
  const lastVerifiedAt = data.profile?.passportUpdatedAt ?? data.timelineItems[0]?.occurredAt ?? null;
  const passportCode = passportId(publicSlug, issuedAt);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}`;
  const profileImageUrl = canUseOptimizedImage(data.profile?.imageUrl) ? data.profile?.imageUrl : null;
  const isNewPassport =
    data.summary.totalDonated === 0 &&
    data.summary.coralFragments === 0 &&
    data.summary.fieldActivities === 0 &&
    data.summary.certificates === 0;
  const recommendation = data.recommendations[0] ?? {
    title: "Start your next verified activity",
    reason: "Support a project, join an expedition, or complete an Academy course.",
    href: "/campaigns",
    action: "Explore projects"
  };
  const completedActivities = data.timelineItems.length;

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold text-ocean-900/58">
            <Link href="/dashboard" className="hover:text-coral-700">
              Dashboard
            </Link>
            <ChevronRight size={15} aria-hidden="true" />
            <span className="text-ocean-900">Impact Passport</span>
          </nav>
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact Passport</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Your verified conservation profile</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/62">
            A portable record of the projects, ecosystems, learning, field activities, and credentials connected to your Terumbu.eco journey.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PassportCopyButton value={publicUrl} label="Share Passport" className="border-transparent bg-ocean-900 text-white hover:bg-ocean-700" />
          <ButtonLink href="/dashboard/settings" tone="light">
            <Pencil size={17} aria-hidden="true" />
            Edit Passport
          </ButtonLink>
          <ButtonLink href={publicHref} tone="light" target={publicSlug ? "_blank" : undefined}>
            <ExternalLink size={17} aria-hidden="true" />
            Preview Public Profile
          </ButtonLink>
        </div>
      </header>

      {params?.saved === "visibility" ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Passport visibility updated.</p>
      ) : null}

      {isNewPassport ? (
        <section className="mt-6 rounded-2xl border border-dashed border-ocean-900/18 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Your Impact Passport starts here</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/64">
            Support a project, complete a course, or join an expedition to add the first verified activity to this profile.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href="/campaigns">Explore Campaigns</ButtonLink>
            <ButtonLink href="/academy" tone="light">
              Start a Free Course
            </ButtonLink>
            <ButtonLink href="/expeditions" tone="light">
              Find an Expedition
            </ButtonLink>
          </div>
        </section>
      ) : null}

      <section
        className="mt-6 overflow-hidden rounded-2xl bg-ocean-900 p-6 text-white shadow-soft"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(1,31,50,0.94), rgba(1,31,50,0.64), rgba(1,31,50,0.22)), url('${heroImage}')`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white/85 bg-coral-500 text-3xl font-bold shadow-soft">
                {profileImageUrl ? <Image src={profileImageUrl} alt={`${displayName} profile photo`} fill className="object-cover" sizes="112px" /> : initialsForName(displayName)}
              </div>
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-coral-200">
                  <ShieldCheck size={17} aria-hidden="true" />
                  Verified Impact Passport
                </p>
                <h2 className="mt-3 text-4xl font-bold tracking-normal sm:text-5xl">{displayName}</h2>
                <p className="mt-2 text-xl font-bold text-kelp-200">Ocean Hero - Level {heroLevel}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/72">
                  <span>Member since {formatDate(issuedAt)}</span>
                  <span>{data.profile?.location ?? "Indonesia"}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 max-w-xl">
              <ProgressMeter value={xpProgress} label="Ocean Hero level progress" className="h-3" indicatorClassName="bg-kelp-400" trackClassName="bg-white/16" />
              <p className="mt-3 text-sm font-semibold text-white/76">
                {xp.toLocaleString("id-ID")} / {xpTarget.toLocaleString("id-ID")} XP · {xpRemaining.toLocaleString("id-ID")} XP to reach Ocean Champion
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/16 bg-ocean-900/64 p-5 backdrop-blur">
            <p className="text-sm font-bold text-white">Verification status</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {[
                { label: "Identity", value: data.profile?.displayName ? "Verified" : "Pending", icon: ShieldCheck },
                { label: "Activities", value: `${completedActivities.toLocaleString("id-ID")} verified`, icon: CheckCircle2 },
                { label: "Certificates", value: `${data.summary.certificates.toLocaleString("id-ID")} verified`, icon: FileBadge }
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-kelp-400 text-ocean-900">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{item.label}</span>
                      <span className="block text-xs font-semibold text-white/64">{item.value}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/62">
              Verification confirms records from Terumbu.eco or approved partners. It does not represent an independent audit of all environmental outcomes.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards(data).map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className={cn("flex size-12 items-center justify-center rounded-full", item.tone)}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
              <h2 className="mt-1 text-sm font-bold text-ocean-900">{item.label}</h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-ocean-900/58">{item.support}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr_330px]">
        <aside className="grid gap-6 xl:content-start">
          <article className="rounded-2xl bg-ocean-900 p-6 text-white shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-200">Terumbu.eco</p>
            <p className="mt-1 text-sm font-bold uppercase tracking-[0.16em] text-coral-200">Impact Passport</p>
            <div className="mt-8 flex justify-center">
              <div className="flex size-24 items-center justify-center rounded-full border border-coral-300/50 bg-coral-500/18">
                <Waves size={48} aria-hidden="true" className="text-coral-200" />
              </div>
            </div>
            <div className="mt-8 rounded-2xl bg-white p-4 text-ocean-900">
              {publicSlug ? <Image src={qrSrc} alt={`QR code for ${displayName}'s Impact Passport`} width={144} height={144} className="mx-auto size-36" /> : <QrCode className="mx-auto text-ocean-900/40" size={120} aria-hidden="true" />}
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div>
                <p className="text-white/52">Passport ID</p>
                <p className="font-bold">{passportCode}</p>
              </div>
              <div>
                <p className="text-white/52">Issued</p>
                <p className="font-bold">{formatDate(issuedAt)}</p>
              </div>
              <div>
                <p className="text-white/52">Last verified</p>
                <p className="font-bold">{formatDate(lastVerifiedAt)}</p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <span className={cn("flex size-11 items-center justify-center rounded-full", visibility.tone)}>
                <VisibilityIcon size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold text-ocean-900">{visibility.label}</p>
                <p className="mt-1 text-sm leading-6 text-ocean-900/62">{visibility.description}</p>
              </div>
            </div>
            <form action={updatePassportVisibilityAction} className="mt-5 grid gap-3">
              <label className="grid gap-2 text-sm font-bold text-ocean-900">
                Visibility
                <select
                  name="passportVisibility"
                  defaultValue={currentVisibility}
                  className="min-h-11 rounded-xl border border-ocean-900/12 bg-white px-3 text-sm outline-none focus:border-coral-500"
                >
                  <option value="public">Public</option>
                  <option value="link">Link only</option>
                  <option value="private">Private</option>
                </select>
              </label>
              <Button type="submit" className="w-full">
                Save visibility
              </Button>
            </form>
            {publicSlug ? (
              <div className="mt-4 rounded-xl border border-ocean-900/10 bg-sand-50 p-3">
                <p className="break-all text-xs font-bold text-ocean-900">{publicUrl}</p>
                <PassportCopyButton value={publicUrl} label="Copy verification link" className="mt-3 w-full bg-white" />
              </div>
            ) : null}
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Profile completion</p>
            <p className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">{data.profileCompleteness.percent}%</p>
            <ProgressMeter value={data.profileCompleteness.percent} label="Profile completion progress" className="mt-4 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-ocean-50" />
            <div className="mt-4 grid gap-2 text-sm text-ocean-900/62">
              {data.profileCompleteness.missing.length > 0 ? (
                data.profileCompleteness.missing.map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <Sparkles size={15} aria-hidden="true" className="text-coral-500" />
                    Add {item}
                  </span>
                ))
              ) : (
                <span className="flex items-center gap-2 font-semibold text-kelp-700">
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Core passport fields are complete.
                </span>
              )}
            </div>
          </article>
        </aside>

        <div className="grid gap-6">
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My impact story</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Conservation journey</h2>
            <p className="mt-4 text-sm leading-7 text-ocean-900/68">{data.profile?.bio || impactStory(displayName, data)}</p>
          </article>

          <DashboardPersonalImpactMap sites={data.personalMapSites} />

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact categories</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Portfolio overview</h2>
              </div>
              <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900">Verified records</span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                { label: "Coral restoration", value: data.summary.coralFragments, target: Math.max(1, data.summary.coralFragments + data.summary.monitoringCorals), support: "Sponsored fragments" },
                { label: "Conservation education", value: data.summary.completedCourses, target: Math.max(5, data.summary.completedCourses), support: "Completed courses" },
                { label: "Field participation", value: data.summary.fieldActivities, target: Math.max(3, data.summary.fieldActivities), support: "Expeditions and activities" },
                { label: "Project support", value: data.summary.campaignsSupported, target: Math.max(7, data.summary.campaignsSupported), support: "Campaigns supported" }
              ].map((category) => {
                const progress = Math.min(100, Math.round((category.value / Math.max(1, category.target)) * 100));

                return (
                  <div key={category.label} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-ocean-900">{category.label}</p>
                        <p className="mt-1 text-xs font-semibold text-ocean-900/56">{category.support}</p>
                      </div>
                      <span className="text-xl font-bold text-ocean-900">{category.value.toLocaleString("id-ID")}</span>
                    </div>
                    <ProgressMeter value={progress} label={`${category.label} progress`} className="mt-4 h-2" trackClassName="bg-white" />
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact timeline</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Conservation record</h2>
              </div>
              <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">Verified by Terumbu.eco</span>
            </div>
            <ol className="mt-6 space-y-5">
              {data.timelineItems.map((item) => (
                <li key={item.id} className="grid gap-3 sm:grid-cols-[98px_1fr]">
                  <time className="text-xs font-bold text-ocean-900/52">{shortDate(item.occurredAt)}</time>
                  <Link href={item.href} className="border-l-2 border-ocean-100 pl-4 hover:border-coral-500">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{item.category}</span>
                    <span className="mt-1 block font-bold text-ocean-900">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-ocean-900/58">{item.description}</span>
                  </Link>
                </li>
              ))}
            </ol>
            {data.timelineItems.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-ocean-900/16 bg-sand-50 p-5">
                <p className="font-bold text-ocean-900">No verified activity yet.</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">Support a project, complete a course, or join an expedition to add your first record.</p>
              </div>
            ) : null}
          </article>

          <section className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Sponsored ecosystems</p>
                  <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Ecosystems I support</h2>
                </div>
                <Link href="/dashboard/corals" className="text-sm font-bold text-coral-700 hover:text-coral-500">
                  View all
                </Link>
              </div>
              <div className="mt-5 grid gap-4">
                {data.coralCards.slice(0, 3).map((coral) => (
                  <Link key={coral.code} href={`/dashboard/corals/${coral.code}`} className="grid gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 p-3 hover:border-coral-500 sm:grid-cols-[120px_1fr]">
                    <div className="relative min-h-24 overflow-hidden rounded-lg bg-ocean-900">
                      <Image src={coral.imageUrl ?? ecosystemFallback} alt={`${coral.label} sponsored ecosystem`} fill className="object-cover" sizes="120px" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-ocean-900">{coral.code}</p>
                        <span className="rounded-full bg-kelp-100 px-2 py-0.5 text-xs font-bold text-kelp-700">{coral.statusLabel}</span>
                      </div>
                      <p className="mt-1 text-sm text-ocean-900/62">{coral.location}</p>
                      <p className="mt-2 text-xs font-semibold text-ocean-900/52">Last monitored: {formatDate(coral.lastUpdatedAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
              {data.coralCards.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">Sponsored corals, mangroves, or other ecosystems will appear here.</p> : null}
            </article>

            <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Field experience</p>
                  <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Expeditions and activities</h2>
                </div>
                <Link href="/dashboard/expeditions" className="text-sm font-bold text-coral-700 hover:text-coral-500">
                  Manage
                </Link>
              </div>
              <div className="mt-5 grid gap-4">
                {data.bookings.slice(0, 3).map((booking) => (
                  <Link key={booking.bookingCode} href="/dashboard/expeditions" className="grid gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 p-3 hover:border-coral-500 sm:grid-cols-[120px_1fr]">
                    <div className="relative min-h-24 overflow-hidden rounded-lg bg-ocean-900">
                      {booking.expeditionImageUrl ? <Image src={booking.expeditionImageUrl} alt={`${booking.expeditionTitle} expedition`} fill className="object-cover" sizes="120px" /> : null}
                    </div>
                    <div>
                      <p className="font-bold text-ocean-900">{booking.expeditionTitle}</p>
                      <p className="mt-1 text-sm text-ocean-900/62">{booking.expeditionRegion}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ocean-900/62">
                        <span className="rounded-full bg-white px-2 py-1">{shortDate(booking.startsAt)}</span>
                        <span className="rounded-full bg-kelp-100 px-2 py-1 text-kelp-700">{booking.status}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {data.bookings.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">No verified field activities yet. Join an expedition or submit volunteer activity for verification.</p> : null}
            </article>
          </section>
        </div>

        <aside className="grid gap-6 xl:content-start">
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Achievements</p>
                <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Badges and progress</h2>
              </div>
              <Trophy className="text-coral-500" size={24} aria-hidden="true" />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {data.achievements.slice(0, 6).map((achievement) => {
                const Icon = achievementIcon(achievement);

                return (
                  <div key={achievement.name} className={cn("rounded-xl border p-4", achievement.earned ? "border-kelp-500/20 bg-kelp-100/45" : "border-ocean-900/10 bg-sand-50")}>
                    <div className="flex items-start gap-3">
                      <span className={cn("flex size-11 items-center justify-center rounded-full", achievement.earned ? "bg-kelp-500 text-white" : "bg-white text-ocean-900/42")}>
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-bold text-ocean-900">{achievement.name}</p>
                        <p className="mt-1 text-xs leading-5 text-ocean-900/58">{achievement.description}</p>
                      </div>
                    </div>
                    <ProgressMeter value={achievement.progressPercent} label={`${achievement.name} achievement progress`} className="mt-4 h-2" trackClassName="bg-white" />
                    <p className="mt-2 text-xs font-bold text-ocean-900/56">
                      {achievement.earned ? `Earned ${formatDate(achievement.earnedAt)}` : `${achievement.progress}/${achievement.target} progress`}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Certificate vault</p>
                <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">Learning credentials</h2>
              </div>
              <ButtonLink href="/dashboard/certificates" tone="ghost" className="px-3">
                <Download size={17} aria-hidden="true" />
              </ButtonLink>
            </div>
            <div className="mt-5 grid gap-3">
              {data.certificates.slice(0, 3).map((certificate) => (
                <Link key={certificate.certificateNumber} href="/dashboard/certificates" className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4 hover:border-coral-500">
                  <p className="font-bold text-ocean-900">{certificate.courseTitle}</p>
                  <p className="mt-1 text-xs font-semibold text-ocean-900/58">{certificate.certificateNumber}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="text-ocean-900/58">Issued {shortDate(certificate.issuedAt)}</span>
                    <span className="rounded-full bg-kelp-100 px-2 py-1 text-kelp-700">Verified</span>
                  </div>
                </Link>
              ))}
            </div>
            {data.certificates.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">Complete an eligible course to earn your first verified certificate.</p> : null}
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Your next milestone</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{recommendation.title}</h2>
            <p className="mt-3 text-sm leading-6 text-ocean-900/62">{recommendation.reason}</p>
            <Link href={recommendation.href} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-coral-500 px-5 text-sm font-bold text-white hover:bg-coral-700">
              {recommendation.action}
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Methodology</p>
            <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">How impact is calculated</h2>
            <div className="mt-5 grid gap-3 text-sm leading-6 text-ocean-900/64">
              <p>
                <strong className="text-ocean-900">Verified activity:</strong> donations, expeditions, certificates, and passport records created through Terumbu.eco or partner workflows.
              </p>
              <p>
                <strong className="text-ocean-900">Partner-reported output:</strong> ecosystem status and monitoring details are reported by conservation partners.
              </p>
              <p>
                <strong className="text-ocean-900">Estimated contribution:</strong> contribution totals show financial support and should not be read as guaranteed ecological survival.
              </p>
            </div>
          </article>
        </aside>
      </section>
    </main>
  );
}
