import {
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  FileBadge,
  Heart,
  HelpCircle,
  MapPinned,
  Search,
  Settings,
  UsersRound,
  Waves,
  type LucideIcon
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { getPreferredLocale, type SupportedLocale } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Dashboard Search"
};

export const dynamic = "force-dynamic";

type DashboardSearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

type SearchResult = {
  id: string;
  section: string;
  title: string;
  description: string;
  href: string;
  meta: string;
  icon: LucideIcon;
  keywords?: string;
};

function normalizeSearch(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function matchesQuery(parts: Array<Date | number | string | null | undefined>, query: string) {
  return parts.some((part) => String(part ?? "").toLowerCase().includes(query));
}

function formatDate(value: Date | null | undefined, locale: SupportedLocale) {
  if (!value) {
    return locale === "id" ? "Menunggu" : "Pending";
  }

  return value.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { dateStyle: "medium" });
}

function statusLabel(value: string, locale: SupportedLocale) {
  if (locale !== "id") {
    return value.replaceAll("_", " ");
  }

  const labels: Record<string, string> = {
    paid: "dibayar",
    confirmed: "dikonfirmasi",
    completed: "selesai",
    pending: "menunggu",
    failed: "gagal",
    refunded: "direfund",
    cancelled: "dibatalkan",
    active: "aktif",
    published: "dipublikasikan",
    verified: "terverifikasi"
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function addResult(results: SearchResult[], result: SearchResult, parts: Array<Date | number | string | null | undefined>, query: string) {
  if (!query || !matchesQuery(parts, query)) {
    return;
  }

  results.push(result);
}

export default async function DashboardSearchPage({ searchParams }: DashboardSearchPageProps) {
  const params = await searchParams;
  const query = normalizeSearch(params?.q ?? "");
  const user = await requireUser(`/dashboard/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  const [data, locale] = await Promise.all([
    getDashboardData(user.id),
    getPreferredLocale()
  ]);
  const isIndonesian = locale === "id";
  const numberLocale = isIndonesian ? "id-ID" : "en-US";
  const labels =
    isIndonesian
      ? {
          eyebrow: "Pencarian Dashboard",
          title: "Temukan halaman dan record pribadi",
          subtitle: "Cari di area inti dashboard, donasi, sponsorship restorasi, booking ekspedisi, Academy, sertifikat, notifikasi, dan lokasi yang terhubung.",
          searchAria: "Cari di dashboard",
          placeholder: "Cari donasi, sponsorship, kursus, trip...",
          search: "Cari",
          resultsFor: "hasil untuk",
          result: "hasil",
          back: "Kembali ke ringkasan",
          noMatch: "Tidak ada record dashboard yang cocok.",
          noMatchBody: "Coba nama kampanye, kode sponsorship, nomor kuitansi, judul kursus, kode booking, atau kategori notifikasi.",
          noMatchHint: "Atau buka salah satu area utama:",
          ready: "Mulai dari area utama",
          readyBody: "Kamu juga bisa mengetik kata kunci untuk langsung membuka record tertentu.",
          quick: "Tujuan cepat",
          dashboard: "Dashboard",
          overview: "Ringkasan",
          overviewDesc: "Status dampak terbaru, langkah berikutnya, notifikasi, dan perjalanan akun.",
          overviewMeta: "Beranda dashboard",
          impact: "Dampak Saya",
          impactDesc: "Aksi personal, outcome terverifikasi yang terhubung, peta, timeline, dan Impact Passport.",
          impactMeta: "Aksi & outcome",
          sponsorship: "Record sponsorship",
          sponsorshipDesc: "Record coral dan mangrove sponsorship di dalam Dampak Saya.",
          sponsorshipMeta: "Dampak Saya",
          donations: "Donasi",
          donationsDesc: "Journey kontribusi, verifikasi pembayaran, kuitansi, dan refund.",
          donationsMeta: "Kontribusi",
          expeditions: "Ekspedisi",
          expeditionsDesc: "Booking, persiapan, pembayaran, partisipasi, dan review trip.",
          expeditionsMeta: "Aktivitas lapangan",
          academy: "Academy",
          academyDesc: "Kursus aktif, progres belajar, kursus tersimpan, transkrip, dan sertifikat.",
          academyMeta: "Pembelajaran",
          certificates: "Sertifikat",
          certificatesDesc: "Kredensial terverifikasi dan file sertifikat yang dapat diunduh.",
          certificatesMeta: "Academy",
          referrals: "Referral",
          referralsDesc: "Booking yang teratribusi dari undangan perjalanan konservasimu.",
          referralsMeta: "Fitur sekunder",
          notifications: "Notifikasi",
          notificationsDesc: "Pembaruan penting dari donasi, ekspedisi, Academy, evidence, dan akun.",
          notificationsMeta: "Inbox",
          settings: "Pengaturan Akun",
          settingsDesc: "Profil dan keamanan login.",
          settingsMeta: "Akun",
          support: "Bantuan & Dukungan",
          supportDesc: "FAQ dan formulir dukungan untuk masalah akun atau aktivitas.",
          supportMeta: "Bantuan",
          contributions: "Kontribusi",
          contributedThrough: "dikontribusikan melalui",
          restorationRecords: "Sponsorship restorasi",
          at: "di",
          verifiedActivities: "aktivitas terverifikasi",
          bookings: "Ekspedisi",
          participantBooking: "booking peserta untuk",
          learning: "Academy",
          completeWith: "selesai dengan",
          minutesRemaining: "menit tersisa",
          savedCourses: "Kursus tersimpan",
          saved: "disimpan",
          issued: "Diterbitkan",
          impactMap: "Outcome terhubung",
          inRegion: "di",
          milestoneProgress: "progres milestone",
          timeline: "Timeline",
          notificationSection: "Notifikasi"
        }
      : {
          eyebrow: "Dashboard Search",
          title: "Find pages and personal records",
          subtitle: "Search core dashboard areas, donations, restoration sponsorships, expedition bookings, Academy, certificates, notifications, and connected locations.",
          searchAria: "Search dashboard",
          placeholder: "Search donations, sponsorships, courses, trips...",
          search: "Search",
          resultsFor: "results for",
          result: "result",
          back: "Back to overview",
          noMatch: "No dashboard records matched that search.",
          noMatchBody: "Try a campaign name, sponsorship code, receipt number, course title, booking code, or notification category.",
          noMatchHint: "Or open one of the core areas:",
          ready: "Start with a core area",
          readyBody: "You can also type a keyword to jump directly to a specific record.",
          quick: "Quick destinations",
          dashboard: "Dashboard",
          overview: "Overview",
          overviewDesc: "Latest impact status, next actions, notifications, and account journey.",
          overviewMeta: "Dashboard home",
          impact: "My Impact",
          impactDesc: "Personal actions, connected verified outcomes, map, timelines, and Impact Passport.",
          impactMeta: "Actions & outcomes",
          sponsorship: "Sponsorship records",
          sponsorshipDesc: "Sponsored coral and mangrove records inside My Impact.",
          sponsorshipMeta: "My Impact",
          donations: "Donations",
          donationsDesc: "Contribution journey, payment verification, receipts, and refunds.",
          donationsMeta: "Contributions",
          expeditions: "Expeditions",
          expeditionsDesc: "Bookings, preparation, payment, participation, and trip reviews.",
          expeditionsMeta: "Field activity",
          academy: "Academy",
          academyDesc: "Active courses, learning progress, saved courses, transcripts, and certificates.",
          academyMeta: "Learning",
          certificates: "Certificates",
          certificatesDesc: "Verified credentials and downloadable certificate files.",
          certificatesMeta: "Academy",
          referrals: "Referrals",
          referralsDesc: "Bookings attributed through your conservation travel invitations.",
          referralsMeta: "Secondary feature",
          notifications: "Notifications",
          notificationsDesc: "Important updates from donations, expeditions, Academy, evidence, and your account.",
          notificationsMeta: "Inbox",
          settings: "Account Settings",
          settingsDesc: "Profile and login security.",
          settingsMeta: "Account",
          support: "Help & Support",
          supportDesc: "FAQ and support form for account- or activity-specific issues.",
          supportMeta: "Help",
          contributions: "Contributions",
          contributedThrough: "contributed through",
          restorationRecords: "Restoration sponsorships",
          at: "at",
          verifiedActivities: "verified activity records",
          bookings: "Expeditions",
          participantBooking: "participant booking for",
          learning: "Academy",
          completeWith: "complete with",
          minutesRemaining: "minutes remaining",
          savedCourses: "Saved courses",
          saved: "saved",
          issued: "Issued",
          impactMap: "Connected outcomes",
          inRegion: "in",
          milestoneProgress: "milestone progress",
          timeline: "Timeline",
          notificationSection: "Notifications"
        };

  const dashboardDestinations: SearchResult[] = [
    {
      id: "destination-overview",
      section: labels.dashboard,
      title: labels.overview,
      description: labels.overviewDesc,
      href: "/dashboard",
      meta: labels.overviewMeta,
      icon: Search,
      keywords: "overview ringkasan home beranda dashboard"
    },
    {
      id: "destination-impact",
      section: labels.dashboard,
      title: labels.impact,
      description: labels.impactDesc,
      href: "/dashboard/impact",
      meta: labels.impactMeta,
      icon: MapPinned,
      keywords: "impact dampak passport evidence outcome map peta"
    },
    {
      id: "destination-sponsorship",
      section: labels.impact,
      title: labels.sponsorship,
      description: labels.sponsorshipDesc,
      href: "/dashboard/impact#corals",
      meta: labels.sponsorshipMeta,
      icon: Waves,
      keywords: "coral mangrove sponsor sponsorship restorasi restoration"
    },
    {
      id: "destination-donations",
      section: labels.dashboard,
      title: labels.donations,
      description: labels.donationsDesc,
      href: "/dashboard/donations",
      meta: labels.donationsMeta,
      icon: Heart,
      keywords: "donation donasi receipt kuitansi refund payment pembayaran contribution kontribusi"
    },
    {
      id: "destination-expeditions",
      section: labels.dashboard,
      title: labels.expeditions,
      description: labels.expeditionsDesc,
      href: "/dashboard/expeditions",
      meta: labels.expeditionsMeta,
      icon: MapPinned,
      keywords: "expedition ekspedisi trip booking preparation persiapan review"
    },
    {
      id: "destination-academy",
      section: labels.dashboard,
      title: labels.academy,
      description: labels.academyDesc,
      href: "/dashboard/academy",
      meta: labels.academyMeta,
      icon: BookOpen,
      keywords: "academy course kursus learning belajar transcript transkrip"
    },
    {
      id: "destination-certificates",
      section: labels.academy,
      title: labels.certificates,
      description: labels.certificatesDesc,
      href: "/dashboard/academy#certificates",
      meta: labels.certificatesMeta,
      icon: FileBadge,
      keywords: "certificate sertifikat credential kredensial"
    },
    {
      id: "destination-referrals",
      section: labels.dashboard,
      title: labels.referrals,
      description: labels.referralsDesc,
      href: "/dashboard/referrals",
      meta: labels.referralsMeta,
      icon: UsersRound,
      keywords: "referral invite undangan traveler"
    },
    {
      id: "destination-notifications",
      section: labels.dashboard,
      title: labels.notifications,
      description: labels.notificationsDesc,
      href: "/dashboard/notifications",
      meta: labels.notificationsMeta,
      icon: Bell,
      keywords: "notification notifikasi inbox update"
    },
    {
      id: "destination-settings",
      section: labels.dashboard,
      title: labels.settings,
      description: labels.settingsDesc,
      href: "/dashboard/settings",
      meta: labels.settingsMeta,
      icon: Settings,
      keywords: "settings pengaturan account akun profile profil password"
    },
    {
      id: "destination-support",
      section: labels.dashboard,
      title: labels.support,
      description: labels.supportDesc,
      href: "/dashboard/support",
      meta: labels.supportMeta,
      icon: HelpCircle,
      keywords: "support bantuan help faq contact kontak"
    }
  ];

  const results: SearchResult[] = [];

  for (const destination of dashboardDestinations) {
    addResult(
      results,
      destination,
      [destination.title, destination.section, destination.description, destination.meta, destination.keywords],
      query
    );
  }

  for (const contribution of data.campaignContributions) {
    addResult(
      results,
      {
        id: `contribution-${contribution.campaignSlug}`,
        section: labels.contributions,
        title: contribution.campaignTitle,
        description: `${formatCurrency(contribution.contribution)} ${labels.contributedThrough} ${contribution.organizationName}.`,
        href: `/campaigns/${contribution.campaignSlug}`,
        meta: `${contribution.statusLabel} / ${contribution.region}`,
        icon: Heart
      },
      [contribution.campaignTitle, contribution.organizationName, contribution.category, contribution.region, contribution.receiptNumber, labels.contributions],
      query
    );
  }

  for (const coral of data.coralCards) {
    addResult(
      results,
      {
        id: `coral-${coral.code}`,
        section: labels.restorationRecords,
        title: coral.code,
        description: `${coral.quantity.toLocaleString(numberLocale)} ${coral.unit} ${labels.at} ${coral.location}.`,
        href: `/dashboard/corals/${coral.code}`,
        meta: `${coral.statusLabel} / ${coral.verifiedEvidenceCount.toLocaleString(numberLocale)} ${labels.verifiedActivities}`,
        icon: Waves
      },
      [coral.code, coral.label, coral.location, coral.status, coral.statusLabel, coral.campaignTitle, labels.restorationRecords],
      query
    );
  }

  for (const booking of data.bookings) {
    addResult(
      results,
      {
        id: `booking-${booking.bookingCode}`,
        section: labels.bookings,
        title: booking.expeditionTitle,
        description: `${booking.participantsCount.toLocaleString(numberLocale)} ${labels.participantBooking} ${formatDate(booking.startsAt, locale)}.`,
        href: "/dashboard/expeditions",
        meta: `${booking.bookingCode} / ${statusLabel(booking.status, locale)} / ${statusLabel(booking.paymentStatus, locale)}`,
        icon: MapPinned
      },
      [booking.bookingCode, booking.expeditionTitle, booking.expeditionRegion, booking.status, booking.paymentStatus, labels.bookings],
      query
    );
  }

  for (const enrollment of data.academy.enrollments) {
    addResult(
      results,
      {
        id: `enrollment-${enrollment.enrollmentId}`,
        section: labels.learning,
        title: enrollment.courseTitle,
        description: `${enrollment.progressPercent}% ${labels.completeWith} ${enrollment.remainingMinutes.toLocaleString(numberLocale)} ${labels.minutesRemaining}.`,
        href: `/academy/courses/${enrollment.courseSlug}`,
        meta: `${statusLabel(enrollment.status, locale)} / ${enrollment.courseLevel}`,
        icon: BookOpen
      },
      [enrollment.courseTitle, enrollment.courseLevel, enrollment.courseSummary, enrollment.status, enrollment.nextLessonTitle, labels.learning],
      query
    );
  }

  for (const course of data.academy.savedCourses) {
    addResult(
      results,
      {
        id: `saved-course-${course.slug}`,
        section: labels.savedCourses,
        title: course.title,
        description: course.summary,
        href: `/academy/courses/${course.slug}`,
        meta: `${course.level} / ${labels.saved} ${formatDate(course.savedAt, locale)}`,
        icon: BookOpen
      },
      [course.title, course.level, course.summary, labels.savedCourses],
      query
    );
  }

  for (const certificate of data.certificates) {
    addResult(
      results,
      {
        id: `certificate-${certificate.certificateNumber}`,
        section: labels.certificates,
        title: certificate.courseTitle,
        description: certificate.certificateNumber,
        href: `/certificates/verify/${certificate.publicSlug}`,
        meta: `${labels.issued} ${formatDate(certificate.issuedAt, locale)}`,
        icon: FileBadge
      },
      [certificate.courseTitle, certificate.certificateNumber, labels.certificates],
      query
    );
  }

  for (const site of data.personalMapSites) {
    addResult(
      results,
      {
        id: `site-${site.id}`,
        section: labels.impactMap,
        title: site.name,
        description: `${site.campaignTitle} ${labels.inRegion} ${site.region}.`,
        href: `/campaigns/${site.campaignSlug}`,
        meta: `${site.type} / ${site.progress}% ${labels.milestoneProgress}`,
        icon: MapPinned
      },
      [site.name, site.region, site.type, site.campaignTitle, labels.impactMap],
      query
    );
  }

  for (const notification of data.notifications) {
    addResult(
      results,
      {
        id: `notification-${notification.id}`,
        section: labels.notificationSection,
        title: notification.title,
        description: notification.message,
        href: notification.href,
        meta: `${notification.category} / ${formatDate(notification.timestamp, locale)}`,
        icon: Bell
      },
      [notification.title, notification.message, notification.category, labels.notificationSection],
      query
    );
  }

  for (const item of data.timelineItems) {
    addResult(
      results,
      {
        id: `timeline-${item.id}`,
        section: labels.timeline,
        title: item.title,
        description: item.description,
        href: item.href,
        meta: `${item.category} / ${formatDate(item.occurredAt, locale)}`,
        icon: Award
      },
      [item.title, item.description, item.category, labels.timeline],
      query
    );
  }

  const dedupedResults = Array.from(new Map(results.map((result) => [`${result.section}:${result.href}:${result.title}`, result])).values()).slice(0, 30);
  const quickDestinations = dashboardDestinations.filter((item) =>
    ["/dashboard", "/dashboard/impact", "/dashboard/donations", "/dashboard/expeditions", "/dashboard/academy"].includes(item.href)
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">{labels.subtitle}</p>
      </header>

      <form action="/dashboard/search" method="get" className="mt-6 flex min-w-0 flex-col gap-3 rounded-2xl border border-ocean-900/10 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
        <label htmlFor="dashboard-search-page" className="sr-only">{labels.searchAria}</label>
        <div className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-ocean-900/12 bg-sand-50 px-4">
          <Search size={18} aria-hidden="true" className="text-ocean-900/54" />
          <input
            id="dashboard-search-page"
            name="q"
            type="search"
            defaultValue={params?.q ?? ""}
            autoFocus
            className="w-full min-w-0 bg-transparent text-sm font-semibold text-ocean-900 outline-none placeholder:text-ocean-900/42"
            placeholder={labels.placeholder}
          />
        </div>
        <Button type="submit">{labels.search}</Button>
      </form>

      {query ? (
        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">
              {dedupedResults.length.toLocaleString(numberLocale)} {dedupedResults.length === 1 ? labels.result : labels.resultsFor} <span className="break-all">“{params?.q}”</span>
            </h2>
            <Link href="/dashboard" className="text-sm font-bold text-coral-700 hover:text-coral-500">
              {labels.back}
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {dedupedResults.map((result) => {
              const Icon = result.icon;

              return (
                <Link key={result.id} href={result.href} className="group rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft transition hover:border-coral-500">
                  <div className="flex items-start gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ocean-50 text-ocean-900">
                      <Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{result.section}</span>
                      <span className="mt-1 block text-lg font-bold text-ocean-900">{result.title}</span>
                      <span className="mt-1 block text-sm leading-6 text-ocean-900/62">{result.description}</span>
                      <span className="mt-3 flex items-center gap-2 text-xs font-bold text-ocean-900/52">
                        {result.meta}
                        <ArrowRight size={14} aria-hidden="true" className="transition group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </div>
                </Link>
              );
            })}
            {dedupedResults.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 shadow-soft">
                <p className="font-bold text-ocean-900">{labels.noMatch}</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">{labels.noMatchBody}</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">{labels.noMatchHint}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {quickDestinations.slice(1).map((item) => (
                    <Link key={item.id} href={item.href} className="rounded-full border border-ocean-900/10 bg-sand-50 px-4 py-2 text-sm font-bold text-ocean-900 hover:border-coral-500">
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <Search size={28} aria-hidden="true" className="text-coral-500" />
          <p className="mt-4 text-xl font-bold text-ocean-900">{labels.ready}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ocean-900/62">{labels.readyBody}</p>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/48">{labels.quick}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickDestinations.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.id} href={item.href} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4 transition hover:border-coral-500">
                  <Icon size={20} aria-hidden="true" className="text-coral-500" />
                  <p className="mt-3 text-sm font-bold text-ocean-900">{item.title}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
