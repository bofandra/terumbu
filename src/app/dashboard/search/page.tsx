import { ArrowRight, Award, Bell, BookOpen, FileBadge, Heart, MapPinned, Search, Settings, Star, Waves, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
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
};

const dashboardDestinations: SearchResult[] = [
  {
    id: "destination-overview",
    section: "Dashboard",
    title: "Overview",
    description: "Impact summary, monthly report, notifications, and next actions.",
    href: "/dashboard",
    meta: "Dashboard home",
    icon: Search
  },
  {
    id: "destination-impact",
    section: "Dashboard",
    title: "My Impact",
    description: "Personal impact map, trend chart, and unified activity timeline.",
    href: "/dashboard/impact",
    meta: "Impact",
    icon: MapPinned
  },
  {
    id: "destination-corals",
    section: "Dashboard",
    title: "My Corals",
    description: "Sponsored coral records, map view, and health summaries.",
    href: "/dashboard/corals",
    meta: "Corals",
    icon: Waves
  },
  {
    id: "destination-donations",
    section: "Billing",
    title: "Donations",
    description: "Contribution history, monthly giving, payment methods, retries, and refunds.",
    href: "/dashboard/donations",
    meta: "Donations & billing",
    icon: Heart
  },
  {
    id: "destination-expeditions",
    section: "Trips",
    title: "Expeditions",
    description: "Bookings, preparation status, payment actions, and completed-trip reviews.",
    href: "/dashboard/expeditions",
    meta: "Field activity",
    icon: MapPinned
  },
  {
    id: "destination-academy",
    section: "Learning",
    title: "Academy",
    description: "Enrollments, saved courses, transcript, and learning progress.",
    href: "/dashboard/academy",
    meta: "Courses",
    icon: BookOpen
  },
  {
    id: "destination-passport",
    section: "Passport",
    title: "Impact Passport",
    description: "Share settings, visibility, QR code, verified activity, and public profile preview.",
    href: "/dashboard/passport#share-settings",
    meta: "Share profile",
    icon: Award
  },
  {
    id: "destination-certificates",
    section: "Learning",
    title: "Certificates",
    description: "Verified certificates and downloadable credential files.",
    href: "/dashboard/certificates",
    meta: "Credentials",
    icon: FileBadge
  },
  {
    id: "destination-saved",
    section: "Saved",
    title: "Saved Projects",
    description: "Saved campaigns, followed updates, recent notifications, and generated reports.",
    href: "/dashboard/saved",
    meta: "Return list",
    icon: Star
  },
  {
    id: "destination-settings",
    section: "Account",
    title: "Settings",
    description: "Profile details, password, notification preferences, and passport visibility.",
    href: "/dashboard/settings",
    meta: "Account",
    icon: Settings
  }
];

function normalizeSearch(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function matchesQuery(parts: Array<Date | number | string | null | undefined>, query: string) {
  return parts.some((part) => String(part ?? "").toLowerCase().includes(query));
}

function formatDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Pending";
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
  const data = await getDashboardData(user.id);
  const results: SearchResult[] = [];

  for (const destination of dashboardDestinations) {
    addResult(results, destination, [destination.title, destination.section, destination.description, destination.meta], query);
  }

  for (const contribution of data.campaignContributions) {
    addResult(
      results,
      {
        id: `contribution-${contribution.campaignSlug}`,
        section: "Contributions",
        title: contribution.campaignTitle,
        description: `${formatCurrency(contribution.contribution)} contributed through ${contribution.organizationName}.`,
        href: `/campaigns/${contribution.campaignSlug}`,
        meta: `${contribution.statusLabel} / ${contribution.region}`,
        icon: Heart
      },
      [contribution.campaignTitle, contribution.organizationName, contribution.category, contribution.region, contribution.receiptNumber],
      query
    );
  }

  for (const coral of data.coralCards) {
    addResult(
      results,
      {
        id: `coral-${coral.code}`,
        section: "Corals",
        title: coral.code,
        description: `${coral.quantity.toLocaleString("id-ID")} ${coral.unit} at ${coral.location}.`,
        href: `/dashboard/corals/${coral.code}`,
        meta: `${coral.statusLabel} / ${coral.verifiedEvidenceCount} verified evidence`,
        icon: Waves
      },
      [coral.code, coral.label, coral.location, coral.status, coral.statusLabel, coral.campaignTitle],
      query
    );
  }

  for (const booking of data.bookings) {
    addResult(
      results,
      {
        id: `booking-${booking.bookingCode}`,
        section: "Expeditions",
        title: booking.expeditionTitle,
        description: `${booking.participantsCount} participant booking for ${formatDate(booking.startsAt)}.`,
        href: "/dashboard/expeditions",
        meta: `${booking.bookingCode} / ${booking.status} / ${booking.paymentStatus}`,
        icon: MapPinned
      },
      [booking.bookingCode, booking.expeditionTitle, booking.expeditionRegion, booking.status, booking.paymentStatus],
      query
    );
  }

  for (const enrollment of data.academy.enrollments) {
    addResult(
      results,
      {
        id: `enrollment-${enrollment.enrollmentId}`,
        section: "Academy",
        title: enrollment.courseTitle,
        description: `${enrollment.progressPercent}% complete with ${enrollment.remainingMinutes} minutes remaining.`,
        href: `/academy/courses/${enrollment.courseSlug}`,
        meta: `${enrollment.status} / ${enrollment.courseLevel}`,
        icon: BookOpen
      },
      [enrollment.courseTitle, enrollment.courseLevel, enrollment.courseSummary, enrollment.status, enrollment.nextLessonTitle],
      query
    );
  }

  for (const course of data.academy.savedCourses) {
    addResult(
      results,
      {
        id: `saved-course-${course.slug}`,
        section: "Saved courses",
        title: course.title,
        description: course.summary,
        href: `/academy/courses/${course.slug}`,
        meta: `${course.level} / saved ${formatDate(course.savedAt)}`,
        icon: BookOpen
      },
      [course.title, course.level, course.summary],
      query
    );
  }

  for (const certificate of data.certificates) {
    addResult(
      results,
      {
        id: `certificate-${certificate.certificateNumber}`,
        section: "Certificates",
        title: certificate.courseTitle,
        description: certificate.certificateNumber,
        href: `/certificates/verify/${certificate.publicSlug}`,
        meta: `Issued ${formatDate(certificate.issuedAt)}`,
        icon: FileBadge
      },
      [certificate.courseTitle, certificate.certificateNumber],
      query
    );
  }

  for (const site of data.personalMapSites) {
    addResult(
      results,
      {
        id: `site-${site.id}`,
        section: "Impact map",
        title: site.name,
        description: `${site.campaignTitle} in ${site.region}.`,
        href: `/campaigns/${site.campaignSlug}`,
        meta: `${site.type} / ${site.progress}% milestone progress`,
        icon: MapPinned
      },
      [site.name, site.region, site.type, site.campaignTitle],
      query
    );
  }

  for (const notification of data.notifications) {
    addResult(
      results,
      {
        id: `notification-${notification.id}`,
        section: "Notifications",
        title: notification.title,
        description: notification.message,
        href: notification.href,
        meta: `${notification.category} / ${formatDate(notification.timestamp)}`,
        icon: Bell
      },
      [notification.title, notification.message, notification.category],
      query
    );
  }

  for (const item of data.timelineItems) {
    addResult(
      results,
      {
        id: `timeline-${item.id}`,
        section: "Timeline",
        title: item.title,
        description: item.description,
        href: item.href,
        meta: `${item.category} / ${formatDate(item.occurredAt)}`,
        icon: Award
      },
      [item.title, item.description, item.category],
      query
    );
  }

  const dedupedResults = Array.from(new Map(results.map((result) => [`${result.section}:${result.href}:${result.title}`, result])).values()).slice(0, 30);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Dashboard search</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Find dashboard records</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Search across your dashboard pages, donations, corals, expedition bookings, courses, certificates, notifications, and impact map sites.
        </p>
      </header>

      <form action="/dashboard/search" method="get" className="mt-6 flex flex-col gap-3 rounded-2xl border border-ocean-900/10 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
        <label htmlFor="dashboard-search-page" className="sr-only">Search dashboard</label>
        <div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-ocean-900/12 bg-sand-50 px-4">
          <Search size={18} aria-hidden="true" className="text-ocean-900/54" />
          <input
            id="dashboard-search-page"
            name="q"
            type="search"
            defaultValue={params?.q ?? ""}
            autoFocus
            className="w-full bg-transparent text-sm font-semibold text-ocean-900 outline-none placeholder:text-ocean-900/42"
            placeholder="Search donations, corals, courses, trips..."
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {query ? (
        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">
              {dedupedResults.length.toLocaleString("id-ID")} result{dedupedResults.length === 1 ? "" : "s"} for <span className="break-all">{params?.q}</span>
            </h2>
            <Link href="/dashboard" className="text-sm font-bold text-coral-700 hover:text-coral-500">
              Back to overview
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
                <p className="font-bold text-ocean-900">No dashboard records matched that search.</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">Try a campaign name, coral code, receipt number, course title, booking code, or notification category.</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 shadow-soft">
          <Search size={28} aria-hidden="true" className="text-coral-500" />
          <p className="mt-4 text-xl font-bold text-ocean-900">Search is ready.</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ocean-900/62">
            Enter a keyword to jump directly to the dashboard page, receipt, coral record, course, trip, certificate, or notification you need.
          </p>
        </section>
      )}
    </main>
  );
}
