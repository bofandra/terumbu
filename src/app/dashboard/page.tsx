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
import { PassportCopyButton } from "@/components/passport-copy-button";
import { MetricValue } from "@/components/ui/metric-value";
import { PassportPreview } from "@/components/passport-preview";
import { Button, ButtonLink } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { requireUser } from "@/lib/auth";
import { publicPassportShareUrl } from "@/lib/passport-sharing";
import { getDashboardData } from "@/lib/queries";
import { getPreferredLocale } from "@/lib/user-preferences";
import {
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

function formatDate(value: Date | null | undefined, locale: "en" | "id") {
  return value
    ? value.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { dateStyle: "medium" })
    : locale === "id"
      ? "Menunggu"
      : "Pending";
}

function formatShortDate(value: Date | null | undefined, locale: "en" | "id") {
  return value
    ? value.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short", year: "numeric" })
    : locale === "id"
      ? "Menunggu"
      : "Pending";
}

function levelTarget(heroLevel: number) {
  return Math.max(1000, heroLevel * 2500);
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
    error?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard");
  const [data, locale] = await Promise.all([
    getDashboardData(user.id),
    getPreferredLocale()
  ]);
  const isIndonesian = locale === "id";
  const numberLocale = isIndonesian ? "id-ID" : "en-US";
  const labels =
    isIndonesian
      ? {
          greeting: "Halo",
          title: "Dampakmu saat ini",
          subtitle: "Lihat kontribusi, aktivitas lapangan, pembelajaran, dan ekspedisi yang membentuk perjalanan konservasimu.",
          viewPassport: "Lihat Passport",
          shareProgress: "Bagikan Progres",
          copied: "Tautan disalin",
          shareText: "Lihat catatan aktivitas konservasi saya di Terumbu.eco.",
          myImpact: "Dampak Saya",
          welcome: "Selamat datang di Terumbu.eco",
          startJourney: "Mulai perjalanan konservasimu",
          onboardingBody: "Tidak perlu melakukan semuanya sekaligus. Mulai dari belajar dasar, lalu pilih proyek atau pengalaman lapangan yang paling relevan bagimu.",
          recommendedStart: "Mulai dari sini",
          step: "Langkah",
          learnFirst: "Pelajari dasar konservasi",
          learnFirstBody: "Mulai dari kursus gratis agar kamu memahami konteks proyek dan dampak sebelum berkontribusi.",
          exploreProject: "Pilih proyek yang ingin didukung",
          exploreProjectBody: "Bandingkan kampanye berdasarkan lokasi, target, transparansi, dan evidence yang tersedia.",
          exploreTrip: "Jelajahi pengalaman lapangan",
          exploreTripBody: "Lihat ekspedisi konservasi, jadwal, persyaratan, dan dampak kampanye yang terhubung.",
          totalDonated: "Total Donasi",
          acrossCampaigns: "kampanye didukung",
          thisMonth: "bulan ini",
          noContributionMonth: "Belum ada kontribusi bulan ini",
          restorationSponsored: "Unit Restorasi Disponsori",
          sponsoredRecords: "catatan sponsorship",
          seeImpactRecords: "Lihat catatan di Dampak Saya",
          noSponsored: "Belum ada sponsorship",
          expeditionsCompleted: "Ekspedisi Selesai",
          upcomingTrip: "trip mendatang",
          next: "Berikutnya",
          noBooking: "Belum ada booking",
          coursesCompleted: "Kursus Selesai",
          certificatesEarned: "sertifikat diperoleh",
          keepLearning: "Lanjut belajar",
          recommendationsReady: "Rekomendasi kursus tersedia",
          impactLevel: "Perjalanan & level",
          levelProgress: "Progres level Ocean Hero",
          xpToChampion: "XP menuju Ocean Champion",
          exclusiveBadge: "Badge eksklusif",
          earlyTrip: "Akses awal trip",
          partnerRewards: "Benefit mitra",
          latestUpdate: "Pembaruan dampak terbaru",
          noFieldActivity: "Belum ada aktivitas lapangan baru",
          new: "Baru",
          status: "Status",
          viewFullUpdate: "Lihat pembaruan lengkap",
          noUpdateBody: "Kami akan memberi tahu saat tim proyek mempublikasikan laporan monitoring berikutnya.",
          notifications: "Notifikasi",
          whatChanged: "Perubahan terbaru",
          markAllRead: "Tandai semua dibaca",
          unread: "Belum dibaca",
          markRead: "Tandai dibaca",
          notificationsEmpty: "Notifikasi akan muncul setelah ada aktivitas akun, donasi, ekspedisi, atau sertifikat.",
          upcomingExpedition: "Ekspedisi mendatang",
          noUpcoming: "Belum ada ekspedisi mendatang",
          manage: "Kelola",
          participant: "peserta",
          startsIn: "Mulai dalam",
          days: "hari",
          done: "Selesai",
          pending: "Menunggu",
          manageBooking: "Kelola Booking",
          preparationGuide: "Panduan Persiapan",
          tripEmpty: "Jelajahi trip konservasi yang terhubung dengan proyek yang kamu dukung.",
          findExpedition: "Cari ekspedisi",
          contributions: "Kontribusiku",
          across: "di",
          campaigns: "kampanye",
          viewAllDonations: "Lihat semua donasi",
          campaign: "Kampanye",
          myContribution: "Kontribusiku",
          latestUpdateColumn: "Pembaruan terbaru",
          receipt: "Kuitansi",
          monthly: "per bulan",
          newUpdate: "Pembaruan baru",
          noNewUpdate: "Belum ada pembaruan",
          contributionEmpty: "Riwayat kontribusi kampanye akan muncul setelah donasi berbayar pertamamu.",
          academyProgress: "Progres Academy",
          startLearning: "Mulai belajar",
          goAcademy: "Buka Academy",
          module: "Modul",
          of: "dari",
          complete: "selesai",
          minRemaining: "menit tersisa",
          continueLearning: "Lanjut Belajar",
          startCourseAction: "Mulai kursus",
          savedCourses: "Kursus tersimpan",
          viewAll: "Lihat semua",
          completed: "Selesai",
          certificates: "Sertifikat",
          inProgress: "Berjalan",
          impactTimeline: "Timeline dampak",
          recentActivity: "Aktivitas terbaru",
          viewAllActivity: "Lihat semua aktivitas",
          achievements: "Pencapaian",
          earned: "Diperoleh",
          completeWord: "selesai",
          continueImpact: "Lanjutkan dampakmu",
          monthlyReport: "Laporan bulanan",
          generated: "Dibuat",
          contributionsReport: "Kontribusi",
          fieldActivity: "Aktivitas lapangan",
          coralsMonitored: "Restorasi dimonitor",
          generatedAt: "Dibuat",
          downloadPdf: "Unduh PDF",
          profilePassport: "Profil dan passport",
          profileCompleteness: "Kelengkapan profil",
          missing: "Kurang",
          profileReady: "Profil siap",
          saved: "Dashboard diperbarui.",
          error: "Aksi dashboard tidak dapat diselesaikan."
        }
      : {
          greeting: "Welcome back",
          title: "Your impact now",
          subtitle: "See the contributions, field activity, learning, and expeditions shaping your conservation journey.",
          viewPassport: "View Passport",
          shareProgress: "Share Progress",
          copied: "Link copied",
          shareText: "See my conservation activity record on Terumbu.eco.",
          myImpact: "My Impact",
          welcome: "Welcome to Terumbu.eco",
          startJourney: "Start your conservation journey",
          onboardingBody: "You do not need to do everything at once. Start with the basics, then choose the project or field experience that matters most to you.",
          recommendedStart: "Start here",
          step: "Step",
          learnFirst: "Learn the conservation basics",
          learnFirstBody: "Start with a free course so you understand project context and impact before contributing.",
          exploreProject: "Choose a project to support",
          exploreProjectBody: "Compare campaigns by location, goals, transparency, and available evidence.",
          exploreTrip: "Explore a field experience",
          exploreTripBody: "Review conservation expeditions, dates, requirements, and their connected campaign outcomes.",
          totalDonated: "Total Donated",
          acrossCampaigns: "campaigns supported",
          thisMonth: "this month",
          noContributionMonth: "No contribution this month",
          restorationSponsored: "Restoration Units Sponsored",
          sponsoredRecords: "sponsorship records",
          seeImpactRecords: "See records in My Impact",
          noSponsored: "No sponsorship yet",
          expeditionsCompleted: "Expeditions Completed",
          upcomingTrip: "upcoming trip",
          next: "Next",
          noBooking: "No booking yet",
          coursesCompleted: "Courses Completed",
          certificatesEarned: "certificates earned",
          keepLearning: "Keep learning",
          recommendationsReady: "Course recommendations ready",
          impactLevel: "Journey & level",
          levelProgress: "Ocean Hero level progress",
          xpToChampion: "XP to reach Ocean Champion",
          exclusiveBadge: "Exclusive badge",
          earlyTrip: "Early trip access",
          partnerRewards: "Partner rewards",
          latestUpdate: "Latest impact update",
          noFieldActivity: "No new field activity yet",
          new: "New",
          status: "Status",
          viewFullUpdate: "View full update",
          noUpdateBody: "We will notify you when a project team publishes the next monitoring report.",
          notifications: "Notifications",
          whatChanged: "What changed",
          markAllRead: "Mark all read",
          unread: "Unread",
          markRead: "Mark read",
          notificationsEmpty: "Notifications will appear here after account, donation, expedition, or certificate activity.",
          upcomingExpedition: "Upcoming expedition",
          noUpcoming: "No upcoming expedition",
          manage: "Manage",
          participant: "participant",
          startsIn: "Starts in",
          days: "days",
          done: "Done",
          pending: "Pending",
          manageBooking: "Manage Booking",
          preparationGuide: "Preparation Guide",
          tripEmpty: "Explore conservation trips connected to projects you support.",
          findExpedition: "Find an expedition",
          contributions: "My contributions",
          across: "across",
          campaigns: "campaigns",
          viewAllDonations: "View all donations",
          campaign: "Campaign",
          myContribution: "My contribution",
          latestUpdateColumn: "Latest update",
          receipt: "Receipt",
          monthly: "monthly",
          newUpdate: "New update",
          noNewUpdate: "No new update",
          contributionEmpty: "Your campaign contribution rows will appear here after your first paid donation.",
          academyProgress: "Academy progress",
          startLearning: "Start learning",
          goAcademy: "Go to Academy",
          module: "Module",
          of: "of",
          complete: "complete",
          minRemaining: "min remaining",
          continueLearning: "Continue Learning",
          startCourseAction: "Start course",
          savedCourses: "Saved courses",
          viewAll: "View all",
          completed: "Completed",
          certificates: "Certificates",
          inProgress: "In progress",
          impactTimeline: "Impact timeline",
          recentActivity: "Recent activity",
          viewAllActivity: "View all activity",
          achievements: "Achievements",
          earned: "Earned",
          completeWord: "complete",
          continueImpact: "Continue your impact",
          monthlyReport: "Monthly report",
          generated: "Generated",
          contributionsReport: "Contributions",
          fieldActivity: "Field activity",
          coralsMonitored: "Corals monitored",
          generatedAt: "Generated",
          downloadPdf: "Download PDF",
          profilePassport: "Profile and passport",
          profileCompleteness: "Profile completeness",
          missing: "Missing",
          profileReady: "Profile ready",
          saved: "Dashboard updated.",
          error: "We could not complete that dashboard action."
        };
  const displayName = data.profile?.displayName ?? user.displayName ?? user.name ?? "Ocean Hero";
  const firstName = displayName.split(" ")[0] ?? "Ocean";
  const heroLevel = data.profile?.heroLevel ?? user.heroLevel ?? 1;
  const xp = data.profile?.xp ?? user.xp ?? 0;
  const xpTarget = levelTarget(heroLevel);
  const xpProgress = Math.min(100, Math.round((xp / xpTarget) * 100));
  const xpRemaining = Math.max(0, xpTarget - xp);
  const passportHref = "/dashboard/impact";
  const passportVisibility = data.profile?.passportVisibility ?? "private";
  const passportShareToken = data.profile?.passportShareToken ?? null;
  const canSharePassport = Boolean(data.profile?.publicSlug && passportVisibility !== "private" && (passportVisibility !== "link" || passportShareToken));
  const passportShareUrl = publicPassportShareUrl({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco",
    publicSlug: data.profile?.publicSlug,
    visibility: passportVisibility,
    shareToken: passportShareToken
  });
  const isNewUser =
    data.campaignContributions.length === 0 &&
    data.bookings.length === 0 &&
    data.academy.enrollments.length === 0 &&
    data.coralCards.length === 0 &&
    data.certificates.length === 0;
  const metricCards = [
    {
      label: labels.totalDonated,
      value: formatCurrency(data.summary.totalDonated),
      support: `${data.summary.campaignsSupported.toLocaleString(numberLocale)} ${labels.acrossCampaigns}`,
      delta: data.monthlyReport.contributions > 0 ? `${formatCurrency(data.monthlyReport.contributions)} ${labels.thisMonth}` : labels.noContributionMonth,
      icon: Heart,
      tone: "bg-ocean-700 text-white"
    },
    {
      label: labels.restorationSponsored,
      value: data.summary.coralFragments.toLocaleString(numberLocale),
      support: `${data.coralCards.length.toLocaleString(numberLocale)} ${labels.sponsoredRecords}`,
      delta: data.coralCards.length > 0 ? labels.seeImpactRecords : labels.noSponsored,
      icon: Waves,
      tone: "bg-kelp-500 text-white"
    },
    {
      label: labels.expeditionsCompleted,
      value: data.summary.fieldActivities.toLocaleString(numberLocale),
      support: `${data.summary.upcomingTrips.toLocaleString(numberLocale)} ${labels.upcomingTrip}`,
      delta: data.upcomingExpedition ? `${labels.next}: ${formatShortDate(data.upcomingExpedition.startsAt, locale)}` : labels.noBooking,
      icon: MapPinned,
      tone: "bg-credential-700 text-white"
    },
    {
      label: labels.coursesCompleted,
      value: data.summary.completedCourses.toLocaleString(numberLocale),
      support: `${data.summary.certificates.toLocaleString(numberLocale)} ${labels.certificatesEarned}`,
      delta: data.academy.continueLearning ? labels.keepLearning : labels.recommendationsReady,
      icon: BookOpen,
      tone: "bg-coral-500 text-white"
    }
  ];
  const starterActions = [
    { step: 1, label: labels.learnFirst, description: labels.learnFirstBody, href: "/academy", icon: BookOpen, recommended: true },
    { step: 2, label: labels.exploreProject, description: labels.exploreProjectBody, href: "/campaigns", icon: Heart, recommended: false },
    { step: 3, label: labels.exploreTrip, description: labels.exploreTripBody, href: "/expeditions", icon: MapPinned, recommended: false }
  ];
  const savedMessage = params?.saved ? labels.saved : null;
  const errorMessage = params?.error ? labels.error : null;

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.greeting}, {firstName}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">{labels.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={passportHref} tone="secondary">
            <FileBadge size={17} aria-hidden="true" />
            {labels.viewPassport}
          </ButtonLink>
          {canSharePassport ? (
            <PassportCopyButton
              value={passportShareUrl}
              label={labels.shareProgress}
              copiedLabel={labels.copied}
              shareTitle={`${displayName}'s Terumbu.eco progress`}
              shareText={labels.shareText}
            />
          ) : (
            <ButtonLink href="/dashboard/impact" tone="light">
              <Share2 size={17} aria-hidden="true" />
              {labels.myImpact}
            </ButtonLink>
          )}
        </div>
      </header>

      {savedMessage ? (
        <p className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
          {savedMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
          {errorMessage}
        </p>
      ) : null}

      {isNewUser ? (
        <section className="mt-6 rounded-2xl border border-dashed border-ocean-900/18 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.welcome}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.startJourney}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/62">{labels.onboardingBody}</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {starterActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    "group rounded-xl border p-5 transition",
                    action.recommended
                      ? "border-kelp-500/30 bg-kelp-100/45 hover:border-kelp-500"
                      : "border-ocean-900/10 bg-sand-50 hover:border-coral-500"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-white text-coral-500">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/46">
                      {labels.step} {action.step}
                    </span>
                  </div>
                  {action.recommended ? (
                    <span className="mt-4 inline-flex rounded-full bg-kelp-500 px-3 py-1 text-xs font-bold text-white">{labels.recommendedStart}</span>
                  ) : null}
                  <h3 className="mt-3 font-bold text-ocean-900 group-hover:text-coral-700">{action.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/60">{action.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-coral-700">
                    {action.label} <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={labels.title}>
        {metricCards.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} className="min-w-0 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className={cn("flex size-12 items-center justify-center rounded-full", item.tone)}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <MetricValue className="mt-4 text-ocean-900">{item.value}</MetricValue>
              <h2 className="mt-1 text-sm font-bold text-ocean-900">{item.label}</h2>
              <p className="mt-2 text-sm text-ocean-900/58">{item.support}</p>
              <p className="mt-3 border-t border-ocean-900/10 pt-3 text-xs font-bold text-kelp-700">{item.delta}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-6">
        <div
          className="relative min-h-[220px] overflow-hidden rounded-2xl bg-ocean-900 p-6 text-white shadow-soft"
          style={{ backgroundImage: `linear-gradient(90deg, rgba(7,52,63,0.92), rgba(7,52,63,0.46)), url('${fallbackHeroImage}')`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="relative z-10 max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-200">{labels.impactLevel}</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl border border-coral-300/60 bg-coral-500/18">
                <Trophy size={34} aria-hidden="true" className="text-coral-200" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-normal">Ocean Hero · Level {heroLevel}</p>
                <p className="mt-1 text-sm text-white/68">{xp.toLocaleString(numberLocale)} / {xpTarget.toLocaleString(numberLocale)} XP</p>
              </div>
            </div>
            <ProgressMeter value={xpProgress} label={labels.levelProgress} className="mt-5 h-3" indicatorClassName="bg-kelp-400" trackClassName="bg-white/18" />
            <p className="mt-3 text-sm font-semibold text-white/78">{xpRemaining.toLocaleString(numberLocale)} {labels.xpToChampion}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/78">
              <span className="flex items-center gap-2">
                <ShieldCheck size={17} aria-hidden="true" className="text-kelp-300" />
                {labels.exclusiveBadge}
              </span>
              <span className="flex items-center gap-2">
                <CalendarDays size={17} aria-hidden="true" className="text-kelp-300" />
                {labels.earlyTrip}
              </span>
              <span className="flex items-center gap-2">
                <Sparkles size={17} aria-hidden="true" className="text-kelp-300" />
                {labels.partnerRewards}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.45fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.latestUpdate}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.latestImpactUpdate?.title ?? labels.noFieldActivity}</h2>
            </div>
            {data.latestImpactUpdate ? <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">{labels.new}</span> : null}
          </div>
          {data.latestImpactUpdate ? (
            <div className="mt-5 grid gap-4 md:grid-cols-[0.9fr_1fr] xl:grid-cols-1 2xl:grid-cols-[0.9fr_1fr]">
              <div className="relative min-h-48 overflow-hidden rounded-2xl bg-ocean-900">
                {data.latestImpactUpdate.imageUrl ? (
                  <Image src={data.latestImpactUpdate.imageUrl} alt={`${data.latestImpactUpdate.title} field update`} fill className="object-cover" sizes="(min-width: 1280px) 320px, 100vw" />
                ) : null}
                <span className="absolute bottom-3 left-3 rounded-full bg-ocean-900/80 px-3 py-1 text-xs font-bold text-white">{formatShortDate(data.latestImpactUpdate.date, locale)}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-ocean-900">{data.latestImpactUpdate.campaignTitle}</p>
                <p className="mt-3 text-sm leading-6 text-ocean-900/68">{data.latestImpactUpdate.body}</p>
                <div className="mt-4 grid gap-2 text-sm font-semibold text-ocean-900/70">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 size={17} aria-hidden="true" className="text-kelp-500" />
                    {labels.status}: {data.latestImpactUpdate.status}
                  </span>
                  <span className="flex items-center gap-2">
                    <CameraIcon />
                    {data.latestImpactUpdate.metricLabel}
                  </span>
                </div>
                <Link href={data.latestImpactUpdate.href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-coral-700 hover:text-coral-500">
                  {labels.viewFullUpdate} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ocean-900/62">{labels.noUpdateBody}</p>
          )}
        </article>

        <DashboardPersonalImpactMap sites={data.personalMapSites} locale={locale} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardImpactTrend trend={data.trend} locale={locale} />

        <article id="notifications" className="scroll-mt-24 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.notifications}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.whatChanged}</h2>
            </div>
            <div className="flex items-center gap-3">
              {data.unreadNotificationCount > 0 ? (
                <form action={markAllNotificationsReadAction}>
                  <input type="hidden" name="next" value="/dashboard#notifications" />
                  <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">
                    {labels.markAllRead}
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
                    {notification.unread ? <span className="mt-1 size-2 shrink-0 rounded-full bg-coral-500" aria-label={labels.unread} /> : null}
                  </div>
                  <p className="mt-2 text-xs font-semibold text-ocean-900/54">
                    {notification.category} · {formatShortDate(notification.timestamp, locale)}
                  </p>
                  {notification.unread ? (
                    <form action={markNotificationReadAction} className="mt-3">
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <input type="hidden" name="next" value="/dashboard#notifications" />
                      <Button type="submit" tone="ghost" className="min-h-9 px-3 py-1.5">
                        {labels.markRead}
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">{labels.notificationsEmpty}</p>
            )}
          </div>
        </article>
      </section>

      <section className="mt-6">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.upcomingExpedition}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.upcomingExpedition?.expeditionTitle ?? labels.noUpcoming}</h2>
            </div>
            <Link href="/dashboard/expeditions" className="text-sm font-bold text-coral-700 hover:text-coral-500">{labels.manage}</Link>
          </div>
          {data.upcomingExpedition ? (
            <div className="mt-5">
              <div className="relative h-40 overflow-hidden rounded-2xl bg-ocean-900">
                {data.upcomingExpedition.expeditionImageUrl ? (
                  <Image src={data.upcomingExpedition.expeditionImageUrl} alt={`${data.upcomingExpedition.expeditionTitle} expedition`} fill className="object-cover" sizes="(min-width: 1280px) 360px, 100vw" />
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 text-sm font-semibold text-ocean-900/70">
                <span>{formatDate(data.upcomingExpedition.startsAt, locale)} - {formatDate(data.upcomingExpedition.endsAt, locale)}</span>
                <span>{data.upcomingExpedition.durationLabel} · {data.upcomingExpedition.participantsCount} {labels.participant}</span>
                <span>{labels.startsIn} {data.upcomingExpedition.startsInDays} {labels.days}</span>
              </div>
              <div className="mt-5 grid gap-2">
                {data.upcomingExpedition.preparationChecklist.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-ocean-900/68">{item.label}</span>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-bold", item.complete ? "bg-kelp-100 text-kelp-700" : "bg-sand-100 text-ocean-900/64")}>
                      {item.complete ? labels.done : labels.pending}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <ButtonLink href="/dashboard/expeditions">{labels.manageBooking}</ButtonLink>
                <ButtonLink href="/expeditions" tone="light">{labels.preparationGuide}</ButtonLink>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-ocean-900/14 bg-sand-50 p-5">
              <p className="text-sm leading-6 text-ocean-900/62">{labels.tripEmpty}</p>
              <Link href="/expeditions" className="mt-4 inline-flex text-sm font-bold text-coral-700">{labels.findExpedition}</Link>
            </div>
          )}
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.contributions}</p>
              <MetricValue as="h2" className="mt-2 text-ocean-900">{formatCurrency(data.summary.totalDonated)} {labels.across} {data.summary.campaignsSupported.toLocaleString(numberLocale)} {labels.campaigns}</MetricValue>
            </div>
            <Link href="/dashboard/donations" className="text-sm font-bold text-coral-700 hover:text-coral-500">{labels.viewAllDonations}</Link>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-ocean-900/46">
                <tr>
                  <th className="py-3">{labels.campaign}</th>
                  <th className="py-3">{labels.myContribution}</th>
                  <th className="py-3">{labels.status}</th>
                  <th className="py-3">{labels.latestUpdateColumn}</th>
                  <th className="py-3 text-right">{labels.receipt}</th>
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
                      {item.monthlyAmount > 0 ? <span className="mt-1 block text-xs text-kelp-700">{formatCurrency(item.monthlyAmount)} {labels.monthly}</span> : null}
                    </td>
                    <td className="py-4">
                      <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">{item.statusLabel}</span>
                    </td>
                    <td className="py-4 text-ocean-900/64">{item.latestUpdate ? `${formatShortDate(item.latestUpdate.publishedAt ?? item.latestUpdate.createdAt, locale)} · ${labels.newUpdate}` : labels.noNewUpdate}</td>
                    <td className="py-4 text-right">
                      {item.receiptNumber && item.receiptDonationId ? (
                        <Link href={`/dashboard/donations/${item.receiptDonationId}/receipt`} download className="inline-flex items-center justify-end gap-1 text-xs font-bold text-coral-700">
                          <Download size={14} aria-hidden="true" />
                          {item.receiptNumber}
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-ocean-900/46">{labels.pending}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.campaignContributions.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">{labels.contributionEmpty}</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.academyProgress}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.academy.continueLearning?.courseTitle ?? data.academy.recommendedCourse?.title ?? labels.startLearning}</h2>
            </div>
            <Link href="/dashboard/academy" className="text-sm font-bold text-coral-700 hover:text-coral-500">{labels.goAcademy}</Link>
          </div>
          {data.academy.continueLearning ? (
            <div className="mt-5">
              <div className="relative h-40 overflow-hidden rounded-2xl bg-ocean-900">
                {data.academy.continueLearning.courseImageUrl ? (
                  <Image src={data.academy.continueLearning.courseImageUrl} alt={`${data.academy.continueLearning.courseTitle} course`} fill className="object-cover" sizes="(min-width: 1280px) 360px, 100vw" />
                ) : null}
              </div>
              <p className="mt-4 text-sm font-semibold text-ocean-900/68">
                {labels.module} {Math.max(1, data.academy.continueLearning.completedLessons)} {labels.of} {Math.max(1, data.academy.continueLearning.totalLessons)}
              </p>
              <ProgressMeter value={data.academy.continueLearning.progressPercent} label={labels.academyProgress} className="mt-3 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-ocean-50" />
              <p className="mt-2 text-sm text-ocean-900/62">{data.academy.continueLearning.progressPercent}% {labels.complete} · {data.academy.continueLearning.remainingMinutes} {labels.minRemaining}</p>
              <ButtonLink href={`/academy/courses/${data.academy.continueLearning.courseSlug}`} className="mt-5">{labels.continueLearning}</ButtonLink>
            </div>
          ) : data.academy.recommendedCourse ? (
            <div className="mt-5 rounded-2xl border border-dashed border-ocean-900/14 bg-sand-50 p-5">
              <p className="text-sm leading-6 text-ocean-900/62">{data.academy.recommendedCourse.summary}</p>
              <Link href={`/academy/courses/${data.academy.recommendedCourse.slug}`} className="mt-4 inline-flex text-sm font-bold text-coral-700">{labels.startCourseAction}</Link>
            </div>
          ) : null}
          {data.academy.savedCourses.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-ocean-900/10 bg-sand-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-ocean-900">{labels.savedCourses}</p>
                <Link href="/dashboard/academy#saved-courses" className="text-xs font-bold text-coral-700 hover:text-coral-500">
                  {labels.viewAll}
                </Link>
              </div>
              <div className="mt-3 grid gap-2">
                {data.academy.savedCourses.slice(0, 2).map((course) => (
                  <Link
                    key={course.slug}
                    href={`/academy/courses/${course.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ocean-900 transition hover:text-coral-700"
                  >
                    <span className="min-w-0 truncate">{course.title}</span>
                    <span className="shrink-0 text-xs text-ocean-900/48">{course.level}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-ocean-900">{data.academy.completedCourses}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">{labels.completed}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ocean-900">{data.academy.certificatesEarned}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">{labels.certificates}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-ocean-900">{data.academy.inProgressCourses}</p>
              <p className="mt-1 text-xs font-semibold text-ocean-900/54">{labels.inProgress}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.impactTimeline}</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.recentActivity}</h2>
            </div>
            <Link href="/dashboard/impact" className="text-sm font-bold text-coral-700 hover:text-coral-500">{labels.viewAllActivity}</Link>
          </div>
          <ol className="mt-5 space-y-4">
            {data.timelineItems.map((item) => (
              <li key={item.id} className="grid grid-cols-[84px_1fr] gap-3">
                <time className="text-xs font-bold text-ocean-900/52">{formatShortDate(item.occurredAt, locale)}</time>
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
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.achievements}</p>
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
                    <ProgressMeter value={achievement.progressPercent} label={`${achievement.name} ${isIndonesian ? "progres pencapaian" : "achievement progress"}`} className="mt-4 h-2" trackClassName="bg-white" />
                    <p className="mt-2 text-xs font-semibold text-ocean-900/58">{achievement.earned ? `${labels.earned} ${formatShortDate(achievement.earnedAt, locale)}` : `${achievement.progress}/${achievement.target} ${labels.completeWord}`}</p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.continueImpact}</p>
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
        {data.passportPreview ? <PassportPreview passport={data.passportPreview} locale={locale} /> : null}

        <div className="grid gap-6">
          {data.monthlyReport.persisted ? (
            <article id="monthly-report" className="scroll-mt-24 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.monthlyReport}</p>
                  <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{data.monthlyReport.label}</h2>
                </div>
                <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">{labels.generated}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ReportItem label={labels.contributionsReport} value={formatCurrency(data.monthlyReport.contributions)} />
                <ReportItem label={labels.fieldActivity} value={String(data.monthlyReport.campaignUpdates + data.monthlyReport.newEvidence)} />
                <ReportItem label={labels.coralsMonitored} value={String(data.monthlyReport.coralsMonitored)} />
              </div>
              {data.monthlyReport.generatedAt ? (
                <p className="mt-4 text-xs font-semibold text-ocean-900/54">{labels.generatedAt} {formatShortDate(data.monthlyReport.generatedAt, locale)}</p>
              ) : null}
              {data.monthlyReport.downloadHref ? (
                <div className="mt-5">
                  <ButtonLink href={data.monthlyReport.downloadHref} tone="secondary">
                    <Download size={17} aria-hidden="true" />
                    {labels.downloadPdf}
                  </ButtonLink>
                </div>
              ) : null}
            </article>
          ) : null}

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.profilePassport}</p>
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-ocean-900">{labels.profileCompleteness}</p>
                  <p className="mt-1 text-sm text-ocean-900/58">{data.profileCompleteness.missing.length > 0 ? `${labels.missing}: ${data.profileCompleteness.missing.join(", ")}` : labels.profileReady}</p>
                </div>
                <span className="text-2xl font-bold text-ocean-900">{data.profileCompleteness.percent}%</span>
              </div>
              <ProgressMeter value={data.profileCompleteness.percent} label={isIndonesian ? "Progres kelengkapan profil" : "Profile completeness progress"} className="mt-4 h-2" indicatorClassName="bg-kelp-500" trackClassName="bg-ocean-50" />
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
    <div className="min-w-0">
      <MetricValue className="text-ocean-900">{value}</MetricValue>
      <p className="mt-1 text-sm font-semibold text-ocean-900/54">{label}</p>
    </div>
  );
}
