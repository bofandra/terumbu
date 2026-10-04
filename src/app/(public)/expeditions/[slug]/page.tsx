import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Home,
  Leaf,
  LifeBuoy,
  MessageSquareText,
  Monitor,
  MapPin,
  PlayCircle,
  Plane,
  ShieldCheck,
  Sprout,
  Star,
  Utensils,
  Users,
  Waves,
  Wifi,
  type LucideIcon
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { courseCertificates } from "@/db/schema";

import { AnalyticsEvent } from "@/components/analytics-event";
import { ExpeditionMobileBookingBar } from "@/components/expedition-booking-card";
import { JsonLd } from "@/components/json-ld";
import { ExpeditionCard } from "@/components/expedition-card";
import { ExpeditionCalendarActions } from "@/components/expedition-calendar-actions";
import { ExpeditionHeroGallery } from "@/components/expedition-hero-gallery";
import { ExpeditionShareButtons } from "@/components/expedition-share-buttons";
import { ExpeditionSectionTabs } from "@/components/expedition-section-tabs";
import { Button, ButtonLink } from "@/components/ui/button";
import { submitExpeditionInterestRequestAction } from "@/lib/expedition-interest-actions";
import {
  buildExpeditionBenefitFacts,
  buildExpeditionMonthAvailability,
  buildExpeditionOfferFacts,
  buildExpeditionSdgFacts,
  buildExpeditionStayRange,
  type ExpeditionFact
} from "@/lib/expedition-detail-view";
import { getSessionUser } from "@/lib/auth";
import { getExpeditionDetail, getExpeditionSaveState } from "@/lib/queries";
import { referralCodeForUser } from "@/lib/referrals";
import { getPreferredDisplayCurrency, getPreferredLocale, localeTag } from "@/lib/user-preferences";
import { cn, formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

function formatDate(value: Date, locale: "en" | "id") {
  return value.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", { dateStyle: "medium" });
}

function stars(value: number) {
  const rounded = Math.round(value);

  return Array.from({ length: 5 }, (_, index) => (
    <Star key={index} size={18} aria-hidden="true" className={cn(index < rounded ? "fill-sand-300 text-sand-300" : "fill-ocean-100 text-ocean-100")} />
  ));
}

function offerIcon(kind: string): LucideIcon {
  if (kind === "hours") return Clock;
  if (kind === "fee") return CircleDollarSign;
  if (kind.includes("farm") || kind.includes("garden")) return Sprout;
  if (kind.includes("social") || kind.includes("community")) return Users;
  if (kind.includes("monitor") || kind.includes("reef") || kind.includes("coral")) return Waves;

  return Leaf;
}

function benefitIcon(kind: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    "days-off": CalendarDays,
    stay: CalendarDays,
    accommodation: Home,
    meals: Utensils,
    internet: Wifi,
    workspace: Monitor,
    certificate: Award,
    support: LifeBuoy,
    "verified-host": ShieldCheck
  };

  return icons[kind] ?? CheckCircle2;
}

function factIconSize(value: string) {
  return value.length > 8 ? "text-3xl" : "text-5xl";
}

function FactGrid({ facts, iconFor }: { facts: ExpeditionFact[]; iconFor: (kind: string) => LucideIcon }) {
  return (
    <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-5">
      {facts.map((fact) => {
        const Icon = iconFor(fact.kind);

        return (
          <div key={`${fact.kind}-${fact.label}`} className="text-center">
            <div className="flex h-14 items-center justify-center text-sky-700">
              {fact.value ? <span className={cn("font-light leading-none", factIconSize(fact.value))}>{fact.value}</span> : <Icon size={44} strokeWidth={1.7} aria-hidden="true" />}
            </div>
            <p className="mt-4 text-base font-bold text-ocean-900">{fact.label}</p>
            <p className="mx-auto mt-2 max-w-44 text-sm leading-6 text-ocean-900/58">{fact.description}</p>
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({
  title,
  body,
  learnHref,
  learnLabel = "Learn more"
}: {
  title: string;
  body?: string;
  learnHref?: string;
  learnLabel?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div>
        <h2 className="text-3xl font-semibold tracking-normal text-ocean-900 sm:text-4xl">{title}</h2>
        {body ? <p className="mt-3 max-w-3xl text-base leading-7 text-ocean-900/62">{body}</p> : null}
      </div>
      {learnHref ? (
        <Link href={learnHref} className="inline-flex shrink-0 items-center gap-2 text-base font-bold text-sky-700 hover:text-sky-800">
          {learnLabel}
          <ArrowRight size={22} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function DetailDivider() {
  return <hr className="border-ocean-900/10" />;
}

function CheckoutLink({
  expeditionSlug,
  departureId,
  label = "Select Date"
}: {
  expeditionSlug: string;
  departureId: string;
  label?: string;
}) {
  return (
    <ButtonLink href={`/checkout/expedition?expedition=${encodeURIComponent(expeditionSlug)}&departure=${encodeURIComponent(departureId)}`} className="rounded-full">
      {label}
      <ArrowRight size={17} aria-hidden="true" />
    </ButtonLink>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const expedition = await getExpeditionDetail(slug);

  if (!expedition) {
    return { title: "Expedition" };
  }

  const imageUrl = expedition.galleryImages[0]?.src;

  return {
    title: expedition.title,
    description: expedition.summary,
    alternates: { canonical: `/expeditions/${expedition.slug}` },
    openGraph: {
      title: expedition.title,
      description: expedition.summary,
      type: "website",
      url: `/expeditions/${expedition.slug}`,
      images: imageUrl ? [{ url: imageUrl }] : undefined
    },
    twitter: {
      card: "summary_large_image",
      title: expedition.title,
      description: expedition.summary,
      images: imageUrl ? [imageUrl] : undefined
    }
  };
}

export default async function ExpeditionDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ saved?: string; error?: string; ref?: string }>;
}) {
  const { slug } = await params;
  const [query, expedition, sessionUser, displayCurrency, locale] = await Promise.all([
    searchParams,
    getExpeditionDetail(slug),
    getSessionUser(),
    getPreferredDisplayCurrency(),
    getPreferredLocale()
  ]);

  if (!expedition) {
    notFound();
  }

  const expeditionPath = `/expeditions/${expedition.slug}`;
  const expeditionUrl = new URL(expeditionPath, appUrl).toString();
  const expeditionImage = expedition.galleryImages[0]?.src;
  const expeditionStructuredData = [
    {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: expedition.title,
      description: expedition.summary,
      url: expeditionUrl,
      image: expeditionImage ? [expeditionImage] : undefined,
      itinerary: {
        "@type": "Place",
        name: expedition.region,
        address: {
          "@type": "PostalAddress",
          addressCountry: "ID"
        }
      },
      provider: expedition.partner
        ? {
            "@type": "Organization",
            name: expedition.partner,
            url: expedition.partnerSlug ? new URL(`/partners/${expedition.partnerSlug}`, appUrl).toString() : undefined
          }
        : undefined,
      offers: expedition.price > 0
        ? {
            "@type": "Offer",
            price: expedition.price,
            priceCurrency: expedition.currency,
            url: expeditionUrl,
            availability: expedition.departures.some((departure) => departure.canBook)
              ? "https://schema.org/InStock"
              : "https://schema.org/SoldOut"
          }
        : undefined
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
        { "@type": "ListItem", position: 2, name: "Expeditions", item: new URL("/expeditions", appUrl).toString() },
        { "@type": "ListItem", position: 3, name: expedition.title, item: expeditionUrl }
      ]
    }
  ];
  const saveState = sessionUser ? await getExpeditionSaveState(sessionUser.id, expedition.slug) : null;
  const prerequisiteCertificate = sessionUser && expedition.requiredAcademyCourse
    ? (await db.select({ id: courseCertificates.id }).from(courseCertificates).where(and(eq(courseCertificates.userId, sessionUser.id), eq(courseCertificates.courseId, expedition.requiredAcademyCourse.id))).limit(1))[0] ?? null
    : null;
  const academyEligibility = !expedition.requiredAcademyCourse ? "not_required" as const : prerequisiteCertificate ? "eligible" as const : "learning_required" as const;
  const ownReferralCode = sessionUser ? referralCodeForUser(sessionUser.id) : null;
  const rawIncomingReferralCode = (query?.ref ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64) || null;
  const incomingReferralCode = rawIncomingReferralCode && rawIncomingReferralCode !== ownReferralCode ? rawIncomingReferralCode : null;
  const shareReferralCode = ownReferralCode;
  const bookingProps = {
    slug: expedition.slug,
    price: expedition.price,
    currency: expedition.currency,
    equipmentRental: expedition.priceBreakdown.equipmentRental,
    platformFee: expedition.priceBreakdown.platformFee,
    departures: expedition.departures,
    conservationContribution: expedition.impact.conservationContribution,
    trustIndicators: expedition.bookingTrustIndicators,
    questionHref: "#ask-question",
    isAuthenticated: Boolean(sessionUser),
    isSaved: saveState?.isSaved ?? false,
    expeditionPath,
    referralCode: incomingReferralCode,
    displayCurrency,
    locale: localeTag(locale),
    academyEligibility,
    requiredAcademyCourse: expedition.requiredAcademyCourse
  };
  const requestNextPath = `${expeditionPath}#availability`;
  const questionNextPath = `${expeditionPath}#ask-question`;
  const isIndonesian = locale === "id";
  const labels =
    isIndonesian
      ? {
          learnMore: "Pelajari lebih lanjut",
          selectDate: "Pilih Tanggal",
          home: "Beranda",
          expeditions: "Ekspedisi",
          verifiedReviews: "ulasan peserta terverifikasi",
          completedParticipants: "peserta selesai",
          hostInfo: "Informasi disediakan oleh mitra ekspedisi untuk listing ini.",
          whatYouOffer: "Kontribusi yang kamu berikan",
          additionalFee: "Biaya tambahan",
          additionalFeeBody: "Mitra mencantumkan biaya lokal tambahan untuk mendukung keberlanjutan proyek dan kualitas pengalaman peserta.",
          amount: "Nominal",
          feePaysFor: "Biaya digunakan untuk",
          description: "Deskripsi",
          whatYouGet: "Yang kamu dapatkan",
          availability: "Ketersediaan",
          eligible: "Memenuhi syarat",
          learningRequired: "Kursus diwajibkan",
          eligibleBody: "Sertifikat Terumbu Academy milikmu memenuhi prasyarat ekspedisi ini.",
          learningBody: "Selesaikan kursus Terumbu Academy ini dan dapatkan sertifikat sebelum melakukan booking.",
          completeCourse: "Selesaikan kursus",
          noOpenMonths: "Belum ada bulan keberangkatan yang terbuka.",
          stayAtLeast: "Durasi minimum",
          stayUpTo: "Durasi maksimum",
          placesRemaining: "tempat tersisa dari",
          tripLeader: "Pemimpin trip",
          meetingPoint: "Titik temu",
          minimum: "Minimum",
          participants: "peserta",
          expeditionCalendarDescription: "ekspedisi konservasi Terumbu.eco",
          name: "Nama",
          email: "Email",
          joinWaitlist: "Gabung daftar tunggu",
          noDepartures: "Belum ada keberangkatan publik yang dijadwalkan.",
          noDeparturesHelp: "Tinggalkan detail kontak dan kami akan menghubungimu saat tanggal baru tersedia.",
          requestPrivate: "Minta keberangkatan privat",
          privateHelp: "Untuk tim, keluarga, atau grup corporate yang membutuhkan jadwal khusus.",
          privatePlaceholder: "Tanggal pilihan, profil grup, kebutuhan aksesibilitas",
          experience: "Pengalaman",
          askTeam: "+ Tanya tim ekspedisi",
          requirements: "Persyaratan",
          notIncluded: "Yang tidak termasuk",
          planTrip: "Rencanakan perjalanan",
          planTripBody: "Informasi perjalanan praktis untuk pengunjung internasional. Pastikan aturan masuk sesuai kewarganegaraan dan perlindungan asuransi sebelum membeli transportasi.",
          nearestArrival: "Hub kedatangan terdekat",
          localTime: "Waktu lokal",
          connectivity: "Konektivitas",
          travelInsurance: "Asuransi perjalanan",
          travelerSupport: "Dukungan peserta",
          arrivalTransfer: "Kedatangan & transfer",
          visaGuidance: "Panduan visa & masuk",
          packingHighlights: "Perlengkapan penting",
          sdgTitle: "Tujuan Pembangunan Berkelanjutan PBB",
          sdgBody: "Tujuan di bawah ini diturunkan hanya dari detail yang diberikan mitra atau target dampak yang tercatat.",
          photos: "Foto",
          travelerMoments: "Momen peserta",
          travelerMomentsBody: "Media dikirim oleh peserta yang telah menyelesaikan ekspedisi dan ditinjau Terumbu sebelum dipublikasikan.",
          travelerMomentAlt: "Momen peserta dari",
          watchVideo: "Tonton video peserta",
          verifiedParticipant: "Peserta selesai terverifikasi",
          aboutHost: "Tentang mitra",
          hostMoreTitle: "Ingin tahu lebih banyak tentang mitra ini?",
          hostMoreBody: "Terumbu menampilkan informasi mitra terverifikasi, aktivitas ekspedisi, dan konteks konservasi sebelum kamu melakukan reservasi.",
          moreHostExperiences: "Pengalaman lain dari mitra ini",
          map: "Peta",
          impactTitle: "Dampak konservasi Terumbu",
          impactContribution: "dari setiap booking mendukung program konservasi terkait.",
          funded: "terdanai",
          viewCampaign: "Lihat Kampanye",
          donate: "Donasi",
          messageTeam: "Kirim pesan ke tim ekspedisi",
          messageTeamBody: "Kirim pertanyaan melalui Terumbu.eco. Admin dan mitra ekspedisi terverifikasi dapat meninjaunya dari inbox website dan menindaklanjuti melalui email.",
          yourName: "Nama kamu",
          generalQuestion: "Pertanyaan umum ekspedisi",
          questionPlaceholder: "Tanyakan itinerary, peralatan, kebutuhan akses, aktivitas konservasi, atau persyaratan booking.",
          sendQuestion: "Kirim pertanyaan",
          reviews: "Ulasan",
          reviewCountSuffix: "ulasan peserta terverifikasi",
          reviewsHelp: "Ulasan muncul setelah peserta menyelesaikan ekspedisi dan mengirim ulasan.",
          noReviews: "Belum ada ulasan dari peserta yang telah menyelesaikan ekspedisi.",
          beforeBook: "Sebelum booking",
          responsibleTravel: "Cara kami bepergian secara bertanggung jawab",
          codeConduct: "Baca Kode Etik Peserta",
          tripActivity: "Aktivitas trip",
          viewDocumentation: "Lihat dokumentasi ekspedisi",
          savedUpdated: "Daftar ekspedisi tersimpan telah diperbarui.",
          questionSent: "Terima kasih, pertanyaanmu sudah dikirim ke tim ekspedisi.",
          requestCaptured: "Terima kasih, permintaan ekspedisimu sudah tercatat. Tim kami akan menindaklanjuti melalui email.",
          savedError: "Ekspedisi tersimpan tidak dapat diperbarui.",
          questionInvalid: "Tambahkan pertanyaan agar tim ekspedisi tahu apa yang perlu dijawab.",
          requestError: "Permintaan ekspedisi tidak dapat disimpan. Tambahkan nama, email, lalu coba lagi.",
          questionSaved: "Pertanyaanmu sudah masuk ke inbox website untuk admin Terumbu dan mitra ekspedisi.",
          questionError: "Tulis pertanyaan sebelum mengirim."
        }
      : {
          learnMore: "Learn more",
          selectDate: "Select Date",
          home: "Home",
          expeditions: "Expeditions",
          verifiedReviews: "verified reviews",
          completedParticipants: "completed participants",
          hostInfo: "Information provided by the expedition host for this listing.",
          whatYouOffer: "What you offer",
          additionalFee: "Additional fee required",
          additionalFeeBody: "This host charges an additional local fee to support the sustainability of the project and the quality of the experience for travelers.",
          amount: "Amount",
          feePaysFor: "Fee pays for",
          description: "Description",
          whatYouGet: "What you get",
          availability: "Availability",
          eligible: "Eligible",
          learningRequired: "Learning required",
          eligibleBody: "Your Terumbu Academy certificate satisfies this expedition prerequisite.",
          learningBody: "Complete this Terumbu Academy course and earn its certificate before booking.",
          completeCourse: "Complete course first",
          noOpenMonths: "No public months are open yet.",
          stayAtLeast: "Stay at least",
          stayUpTo: "Stay up to",
          placesRemaining: "places remaining of",
          tripLeader: "Trip leader",
          meetingPoint: "Meeting point",
          minimum: "Minimum",
          participants: "participants",
          expeditionCalendarDescription: "Terumbu.eco conservation expedition",
          name: "Name",
          email: "Email",
          joinWaitlist: "{labels.joinWaitlist}",
          noDepartures: "No public departures are currently scheduled.",
          noDeparturesHelp: "Leave your details and we will contact you when a new date opens.",
          requestPrivate: "Request private departure",
          privateHelp: "For teams, families, or corporate groups that need a custom schedule.",
          privatePlaceholder: "Preferred dates, group profile, accessibility needs",
          experience: "The Experience",
          askTeam: "+ Ask the expedition team",
          requirements: "Requirements",
          notIncluded: "What's not included",
          planTrip: "Plan your trip",
          planTripBody: "Practical travel information for international visitors. Confirm nationality-specific entry rules and insurance coverage before purchasing transport.",
          nearestArrival: "Nearest arrival hub",
          localTime: "Local time",
          connectivity: "Connectivity",
          travelInsurance: "Travel insurance",
          travelerSupport: "Traveler support",
          arrivalTransfer: "Arrival & transfer",
          visaGuidance: "Visa & entry guidance",
          packingHighlights: "Packing highlights",
          sdgTitle: "UN Sustainable Development Goals",
          sdgBody: "Goals shown here are derived only from host-provided details or recorded impact targets.",
          photos: "Photos",
          travelerMoments: "Traveler moments",
          travelerMomentsBody: "Media submitted by completed participants and reviewed by Terumbu before publication.",
          travelerMomentAlt: "Traveler moment from",
          watchVideo: "Watch traveler video",
          verifiedParticipant: "Verified completed participant",
          aboutHost: "About the host",
          hostMoreTitle: "Want to know more about this host?",
          hostMoreBody: "Terumbu shows verified partner information, expedition activity, and conservation context before you reserve.",
          moreHostExperiences: "More experiences of this host",
          map: "Map",
          impactTitle: "Terumbu conservation impact",
          impactContribution: "from each booking supports the associated conservation program.",
          funded: "funded",
          viewCampaign: "View Campaign",
          donate: "Donate",
          messageTeam: "Message the expedition team",
          messageTeamBody: "Send a question through Terumbu.eco. Admins and the verified expedition partner can review it from their website inbox and follow up by email.",
          yourName: "Your name",
          generalQuestion: "General expedition question",
          questionPlaceholder: "Ask about itinerary, equipment, access needs, conservation activities, or booking requirements.",
          sendQuestion: "Send question",
          reviews: "Reviews",
          reviewCountSuffix: "verified participant reviews",
          reviewsHelp: "Reviews appear after completed participants submit them.",
          noReviews: "No completed-participant reviews yet.",
          beforeBook: "Before you book",
          responsibleTravel: "How we travel responsibly",
          codeConduct: "Read Participant Code of Conduct",
          tripActivity: "Trip activity",
          viewDocumentation: "View expedition documentation",
          savedUpdated: "Your saved expeditions were updated.",
          questionSent: "Thanks, your question was sent to the expedition team.",
          requestCaptured: "Thanks, your expedition request was captured. Our team will follow up by email.",
          savedError: "We could not update that saved expedition.",
          questionInvalid: "Add your question so the expedition team knows what to answer.",
          requestError: "We could not save that expedition request. Add your name, email, and try again.",
          questionSaved: "Your question is in the website inbox for Terumbu admins and the expedition partner.",
          questionError: "Write your question before sending."
        };
  const offerFacts = buildExpeditionOfferFacts(expedition.marketplace, locale);
  const benefitFacts = buildExpeditionBenefitFacts({
    marketplace: expedition.marketplace,
    durationDays: expedition.durationDays,
    included: expedition.included,
    hostVerificationLabel: expedition.hostedBy.verificationLabel,
    locale
  });
  const monthAvailability = buildExpeditionMonthAvailability(expedition.departures, 6, locale);
  const stayRange = buildExpeditionStayRange(expedition.durationDays, expedition.marketplace.travelLengthLabel, locale);
  const sdgFacts = buildExpeditionSdgFacts({
    tags: expedition.tags,
    sustainability: expedition.sustainability,
    impactTargets: expedition.impact.targets,
    locale
  });
  const ratingLabel = expedition.reviewCount > 0
    ? `${expedition.rating.toFixed(1)} (${expedition.reviewCount} ${labels.verifiedReviews})`
    : `${expedition.participantCount} ${labels.completedParticipants}`;
  const savedBannerMessage = query?.saved === "expedition"
    ? labels.savedUpdated
    : query?.saved === "interest-question"
      ? labels.questionSent
      : query?.saved?.startsWith("interest")
        ? labels.requestCaptured
        : null;
  const errorBannerMessage = query?.error === "expedition"
    ? labels.savedError
    : query?.error === "interest-question-invalid"
      ? labels.questionInvalid
      : query?.error?.startsWith("interest")
        ? labels.requestError
        : null;
  const questionSavedMessage = query?.saved === "interest-question" ? labels.questionSaved : null;
  const questionErrorMessage = query?.error === "interest-question-invalid" ? labels.questionError : null;
  const legacyAutoBadges = new Set(["sustainable project", "higher approval", "higher chance of approval"]);
  const heroBadges = Array.from(new Set([...expedition.marketplace.badges, ...expedition.marketplace.highlights]))
    .filter((badge) => !legacyAutoBadges.has(badge.trim().toLowerCase()))
    .slice(0, 3);
  const hostImage = expedition.associatedCampaign?.imageUrl ?? expedition.galleryImages[0]?.src;
  const hasExperienceDetails = Boolean(
    expedition.overview.title.trim() ||
      expedition.overview.paragraphs.length ||
      expedition.requirements.length ||
      expedition.notIncluded.length
  );
  const hasTravelPlanning = [
    expedition.travelInfo.nearestAirport,
    expedition.travelInfo.meetingPoint,
    expedition.travelInfo.localTimeZone,
    expedition.travelInfo.connectivity,
    expedition.travelInfo.insuranceGuidance,
    expedition.travelInfo.supportContact,
    expedition.travelInfo.airportTransfer,
    expedition.travelInfo.arrivalGuidance,
    expedition.travelInfo.visaGuidance
  ].some((value) => value.trim()) || expedition.travelInfo.packingHighlights.length > 0;
  const hasMap = Boolean(expedition.route.mapEmbedUrl.trim());
  const hasImpact = Boolean(
    expedition.associatedCampaign ||
      expedition.impact.conservationContribution > 0 ||
      expedition.impact.summary.trim() ||
      expedition.impact.targets.length > 0
  );
  const hasBookableDeparture = expedition.departures.some((departure) => departure.canBook);
  const tabs = [
    { id: "availability", label: isIndonesian ? "Jadwal" : "Availability" },
    ...(hasExperienceDetails ? [{ id: "experience", label: isIndonesian ? "Pengalaman" : "Experience" }] : []),
    ...(hasImpact ? [{ id: "impact", label: isIndonesian ? "Dampak" : "Impact" }] : []),
    { id: "host", label: isIndonesian ? "Mitra" : "Host" },
    ...(hasMap ? [{ id: "map", label: isIndonesian ? "Peta" : "Map" }] : [])
  ];
  const primaryActionHref =
    academyEligibility === "learning_required" && expedition.requiredAcademyCourse
      ? `/academy/courses/${expedition.requiredAcademyCourse.slug}`
      : hasBookableDeparture
        ? "#availability"
        : "#ask-question";
  const primaryActionLabel =
    academyEligibility === "learning_required" && expedition.requiredAcademyCourse
      ? isIndonesian
        ? "Selesaikan kursus"
        : "Complete course"
      : hasBookableDeparture
        ? isIndonesian
          ? "Pilih tanggal"
          : "Reserve / Apply"
        : isIndonesian
          ? "Tanya jadwal"
          : "Ask about dates";

  return (
    <>
      <AnalyticsEvent
        event="expedition_view"
        properties={{
          expeditionId: expedition.id,
          expeditionSlug: expedition.slug,
          availableDepartureCount: expedition.departures.filter((departure) => departure.canBook).length,
          hasReferral: Boolean(incomingReferralCode)
        }}
      />
      <JsonLd data={expeditionStructuredData} />
      <main className="bg-white pb-24">
        <section className="border-b border-ocean-900/10 bg-white">
          <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/54" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-sky-700">{labels.home}</Link>
              <span>/</span>
              <Link href="/expeditions" className="hover:text-sky-700">{labels.expeditions}</Link>
              <span>/</span>
              <Link href={`/expeditions?destination=${encodeURIComponent(expedition.region)}`} className="hover:text-sky-700">{expedition.region}</Link>
            </nav>
          </div>

          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.98fr_1fr] lg:items-start lg:px-8">
            <ExpeditionHeroGallery images={expedition.galleryImages} region={expedition.region} />

            <div className="min-w-0 lg:pt-1">
              <p className="text-lg font-semibold text-ocean-900/72">
                {expedition.marketplace.typeLabel ? <>{expedition.marketplace.typeLabel} &bull; </> : null}{expedition.region}, Indonesia
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/58">
                <span className="flex items-center gap-1">
                  {expedition.reviewCount > 0 ? stars(expedition.rating) : <Users size={18} aria-hidden="true" className="text-ocean-900/46" />}
                </span>
                <span>{ratingLabel}</span>
                <span className="inline-flex size-6 items-center justify-center rounded-full border border-ocean-900/20 text-xs font-bold">?</span>
              </div>
              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.15]">{expedition.title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ocean-900/64">{expedition.summary}</p>
              <div className="mt-6">
                <ExpeditionShareButtons slug={expedition.slug} title={expedition.title} referralCode={shareReferralCode} compact locale={locale} />
              </div>

              <div className="mt-8 grid gap-6">
                {heroBadges.map((badge, index) => {
                  const Icon = index === 0 ? Leaf : index === 1 ? BadgeCheck : Users;

                  return (
                    <div key={badge} className="grid grid-cols-[32px_minmax(0,1fr)] gap-4">
                      <Icon size={26} strokeWidth={1.8} aria-hidden="true" className={cn(index === 1 ? "text-purple-500" : "text-sky-700")} />
                      <div>
                        <p className="text-lg font-bold text-ocean-900">{badge}</p>
                        <p className="mt-1 text-base leading-7 text-ocean-900/58">
                          {labels.hostInfo}
                        </p>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </section>

        <ExpeditionSectionTabs
          tabs={tabs}
          slug={expedition.slug}
          isAuthenticated={Boolean(sessionUser)}
          isSaved={saveState?.isSaved ?? false}
          expeditionPath={expeditionPath}
          primaryActionHref={primaryActionHref}
          primaryActionLabel={primaryActionLabel}
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {savedBannerMessage ? <p className="mt-8 rounded-md border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{savedBannerMessage}</p> : null}
          {errorBannerMessage ? <p className="mt-8 rounded-md border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{errorBannerMessage}</p> : null}

          {offerFacts.length > 0 ? (
            <section id="exchange" className="scroll-mt-36 py-10 sm:py-14">
              <SectionHeader title={labels.whatYouOffer} learnHref={hasExperienceDetails ? "#experience" : undefined} learnLabel={labels.learnMore} />
              <FactGrid facts={offerFacts} iconFor={offerIcon} />
            </section>
          ) : null}

          {expedition.marketplace.additionalFee ? (
            <>
              <DetailDivider />
              <section className="py-10 sm:py-14">
                <SectionHeader title={labels.additionalFee} body={labels.additionalFeeBody} />
                <div className="mt-8 grid gap-8 lg:grid-cols-[0.35fr_0.28fr_1fr]">
                  <div>
                    <p className="text-lg font-bold text-ocean-900">{labels.amount}</p>
                    <p className="mt-6 text-4xl font-light text-sky-700">
                      {formatCurrency(expedition.marketplace.additionalFee.amount, expedition.marketplace.additionalFee.currency)}
                    </p>
                    <p className="mt-2 text-base text-ocean-900/58">{expedition.marketplace.additionalFee.period}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ocean-900">{labels.feePaysFor}</p>
                    <ul className="mt-5 grid gap-2 text-base leading-7 text-ocean-900/62">
                      {expedition.marketplace.additionalFee.paysFor.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span>&bull;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-ocean-900">{labels.description}</p>
                    <p className="mt-5 max-w-3xl text-base leading-8 text-ocean-900/62">{expedition.marketplace.additionalFee.description}</p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {benefitFacts.length > 0 ? (
            <>
              <DetailDivider />
              <section className="py-10 sm:py-14">
                <SectionHeader title={labels.whatYouGet} learnHref={hasExperienceDetails ? "#experience" : undefined} learnLabel={labels.learnMore} />
                <FactGrid facts={benefitFacts} iconFor={benefitIcon} />
              </section>
            </>
          ) : null}

          <DetailDivider />
          <section id="availability" tabIndex={-1} className="scroll-mt-36 py-10 sm:py-14 outline-none">
            <SectionHeader title={labels.availability} />
            {expedition.requiredAcademyCourse ? (
              <div className={cn("mt-7 rounded-md border p-5", academyEligibility === "eligible" ? "border-kelp-500/25 bg-kelp-100/45" : "border-sand-400/40 bg-sand-50")}>
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/54">{academyEligibility === "eligible" ? labels.eligible : labels.learningRequired}</p><h3 className="mt-1 text-xl font-bold text-ocean-900">{expedition.requiredAcademyCourse.title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-ocean-900/62">{academyEligibility === "eligible" ? labels.eligibleBody : labels.learningBody}</p></div>
                  {academyEligibility !== "eligible" ? <ButtonLink href={"/academy/courses/" + expedition.requiredAcademyCourse.slug} className="shrink-0 rounded-full">{labels.completeCourse}</ButtonLink> : null}
                </div>
              </div>
            ) : null}
            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_0.42fr] lg:items-start">
              <div>
                {monthAvailability.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {monthAvailability.map((month) => (
                      <div
                        key={month.key}
                        className={cn(
                          "flex min-h-16 w-28 flex-col items-center justify-center rounded-sm px-4 text-center text-white",
                          month.status === "closed" ? "bg-ocean-200 text-ocean-900/54" : month.status === "limited" ? "bg-sand-400 text-ocean-900" : "bg-kelp-500"
                        )}
                      >
                        {month.status !== "closed" ? <Check size={22} aria-hidden="true" /> : <span className="text-lg font-bold">-</span>}
                        <span className="mt-1 text-sm font-bold">{month.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-md border border-dashed border-ocean-900/16 bg-ocean-50 px-4 py-5 font-bold text-ocean-900">{labels.noOpenMonths}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-lg font-bold text-ocean-900">{labels.stayAtLeast}</p>
                  <p className="mt-4 text-4xl font-light text-ocean-900/62">{stayRange.stayAtLeast}</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-ocean-900">{labels.stayUpTo}</p>
                  <p className="mt-4 text-4xl font-light text-ocean-900/62">{stayRange.stayUpTo}</p>
                </div>
              </div>
            </div>

            <div className="mt-10 divide-y divide-ocean-900/10 border-y border-ocean-900/10">
              {expedition.departures.length > 0 ? (
                expedition.departures.map((departure) => (
                  <article key={departure.id} className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.12em] text-sky-700">{departure.dateRangeLabel}</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-normal text-ocean-900">
                        {departure.availableSeats} {labels.placesRemaining} {departure.capacity}
                      </h3>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ocean-900/58">
                        {departure.guide ? <span>{labels.tripLeader}: {departure.guide}</span> : null}
                        {departure.meetingPoint ? <span>{labels.meetingPoint}: {departure.meetingPoint}</span> : null}
                        {departure.minParticipants > 0 ? <span>{labels.minimum} {departure.minParticipants} {labels.participants}</span> : null}
                      </div>
                    </div>
                    <div className="grid gap-3 lg:justify-items-end">
                      <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-bold", departure.availableSeats <= 4 ? "bg-coral-100 text-coral-700" : "bg-kelp-100 text-kelp-700")}>
                        {departure.statusLabel}
                      </span>
                      {departure.status === "open" && departure.availableSeats > 0 ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                        <ExpeditionCalendarActions
                          title={expedition.title}
                          startsAt={departure.startsAt}
                          endsAt={departure.endsAt}
                          location={departure.meetingPoint ?? expedition.region}
                          description={`${expedition.summary} — ${labels.expeditionCalendarDescription}`}
                        />
                        {academyEligibility === "learning_required" && expedition.requiredAcademyCourse ? <ButtonLink href={"/academy/courses/" + expedition.requiredAcademyCourse.slug} className="rounded-full">{labels.completeCourse}</ButtonLink> : <CheckoutLink expeditionSlug={expedition.slug} departureId={departure.id} label={labels.selectDate} />}
                      </div>
                      ) : (
                        <form action={submitExpeditionInterestRequestAction} className="grid gap-2 rounded-md border border-ocean-900/10 bg-ocean-50 p-3">
                          <input type="hidden" name="next" value={requestNextPath} />
                          <input type="hidden" name="expeditionId" value={expedition.id} />
                          <input type="hidden" name="departureId" value={departure.id} />
                          <input type="hidden" name="requestType" value="waitlist" />
                          <input name="contactName" placeholder={labels.name} className="min-h-10 rounded-md border border-ocean-900/14 px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                          <input name="contactEmail" type="email" placeholder={labels.email} className="min-h-10 rounded-md border border-ocean-900/14 px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                          <input name="participantsCount" type="hidden" value="1" />
                          <Button type="submit" tone="light" className="min-h-10 rounded-md">
                            {labels.joinWaitlist}
                          </Button>
                        </form>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <article className="py-6">
                  <p className="font-bold text-ocean-900">{labels.noDepartures}</p>
                  <p className="mt-2 text-sm font-semibold text-ocean-900/58">{labels.noDeparturesHelp}</p>
                  <form action={submitExpeditionInterestRequestAction} className="mt-5 grid gap-3 rounded-md border border-ocean-900/10 bg-ocean-50 p-4 md:grid-cols-[1fr_1fr_120px_auto]">
                    <input type="hidden" name="next" value={requestNextPath} />
                    <input type="hidden" name="expeditionId" value={expedition.id} />
                    <input type="hidden" name="requestType" value="waitlist" />
                    <input name="contactName" placeholder={labels.name} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                    <input name="contactEmail" type="email" placeholder={labels.email} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                    <input name="participantsCount" type="number" min={1} max={12} defaultValue={1} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                    <Button type="submit" className="rounded-md">
                      {labels.joinWaitlist}
                    </Button>
                  </form>
                </article>
              )}
            </div>

            <form action={submitExpeditionInterestRequestAction} className="mt-8 grid gap-3 rounded-md border border-ocean-900/10 bg-ocean-50 p-4">
              <input type="hidden" name="next" value={requestNextPath} />
              <input type="hidden" name="expeditionId" value={expedition.id} />
              <input type="hidden" name="requestType" value="private_departure" />
              <div>
                <p className="font-bold text-ocean-900">{labels.requestPrivate}</p>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">{labels.privateHelp}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_130px_180px_minmax(0,1fr)]">
                <input name="contactName" placeholder={labels.name} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                <input name="contactEmail" type="email" placeholder={labels.email} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                <input name="participantsCount" type="number" min={1} max={12} defaultValue={6} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                <input name="preferredStartAt" type="date" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" />
                <input name="message" placeholder={labels.privatePlaceholder} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" />
              </div>
              <Button type="submit" tone="secondary" className="w-fit rounded-md">
                {labels.requestPrivate}
              </Button>
            </form>
          </section>

          {hasExperienceDetails ? (
            <>
          <DetailDivider />
          <section id="experience" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader title={labels.experience} learnHref={expedition.galleryImages.length > 0 ? "#photos" : undefined} learnLabel={labels.learnMore} />
            <div className="mt-8 grid gap-12 lg:grid-cols-[0.58fr_0.42fr]">
              <div>
                {expedition.overview.title ? <h3 className="text-2xl font-semibold tracking-normal text-ocean-900">{expedition.overview.title}</h3> : null}
                {expedition.overview.paragraphs.map((paragraph, index) => (
                  <p key={paragraph} className={cn(index === 0 ? "mt-5" : "mt-4", "max-w-2xl text-base leading-8 text-ocean-900/62")}>
                    {paragraph}
                  </p>
                ))}
                <Link href="#ask-question" className="mt-5 inline-flex items-center gap-1 text-base font-bold text-sky-700">
                  {labels.askTeam}
                </Link>
              </div>
              <div className="grid gap-8">
                <div>
                  <p className="text-xl font-bold text-ocean-900">{labels.requirements}</p>
                  <div className="mt-4 grid gap-3">
                    {expedition.requirements.slice(0, 4).map((item) => (
                      <p key={item} className="flex items-start gap-3 text-base leading-7 text-ocean-900/62">
                        <Check size={18} aria-hidden="true" className="mt-1 shrink-0 text-kelp-500" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xl font-bold text-ocean-900">{labels.notIncluded}</p>
                  <p className="mt-4 text-base leading-8 text-ocean-900/62">{expedition.notIncluded.slice(0, 5).join(", ")}</p>
                </div>
              </div>
            </div>
          </section>

            </>
          ) : null}

          {hasTravelPlanning ? (
            <>
          <DetailDivider />
          <section id="travel-planning" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader
              title={labels.planTrip}
              body={labels.planTripBody}
            />
            <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[
                [Plane, labels.nearestArrival, expedition.travelInfo.nearestAirport],
                [MapPin, labels.meetingPoint, expedition.travelInfo.meetingPoint],
                [Clock, labels.localTime, expedition.travelInfo.localTimeZone],
                [Wifi, labels.connectivity, expedition.travelInfo.connectivity],
                [ShieldCheck, labels.travelInsurance, expedition.travelInfo.insuranceGuidance],
                [LifeBuoy, labels.travelerSupport, expedition.travelInfo.supportContact]
              ].filter(([, , value]) => typeof value === "string" && value.trim()).map(([Icon, label, value]) => {
                const TravelIcon = Icon as LucideIcon;
                return (
                  <article key={String(label)} className="rounded-md border border-ocean-900/10 bg-ocean-50 p-5">
                    <TravelIcon size={22} aria-hidden="true" className="text-sky-700" />
                    <p className="mt-4 text-sm font-bold uppercase tracking-[0.12em] text-ocean-900/48">{String(label)}</p>
                    <p className="mt-2 text-base font-semibold leading-7 text-ocean-900">{String(value)}</p>
                  </article>
                );
              })}
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-md border border-ocean-900/10 bg-white p-5">
                <h3 className="text-xl font-bold text-ocean-900">{labels.arrivalTransfer}</h3>
                <p className="mt-4 text-sm leading-7 text-ocean-900/64">{expedition.travelInfo.airportTransfer}</p>
                <p className="mt-3 text-sm leading-7 text-ocean-900/64">{expedition.travelInfo.arrivalGuidance}</p>
                <h4 className="mt-5 font-bold text-ocean-900">{labels.visaGuidance}</h4>
                <p className="mt-2 text-sm leading-7 text-ocean-900/64">{expedition.travelInfo.visaGuidance}</p>
              </div>
              <div className="rounded-md border border-ocean-900/10 bg-white p-5">
                <h3 className="text-xl font-bold text-ocean-900">{labels.packingHighlights}</h3>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-ocean-900/68 sm:grid-cols-2">
                  {expedition.travelInfo.packingHighlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check size={16} aria-hidden="true" className="mt-1 shrink-0 text-kelp-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

            </>
          ) : null}

          {sdgFacts.length > 0 ? (
            <>
          <DetailDivider />
          <section className="py-10 sm:py-14">
            <SectionHeader title={labels.sdgTitle} body={labels.sdgBody} learnHref={hasImpact ? "#impact" : undefined} learnLabel={labels.learnMore} />
            <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {sdgFacts.map((goal) => (
                <div key={goal.code} className="grid grid-cols-[132px_minmax(0,1fr)] gap-7">
                  <div className={cn("flex aspect-square items-start rounded-md p-4 text-white", goal.tone === "kelp" ? "bg-kelp-600" : goal.tone === "sand" ? "bg-rose-700" : "bg-sky-700")}>
                    <span className="text-4xl font-bold leading-none">{goal.code}</span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-ocean-900">{goal.label}</p>
                    <p className="mt-2 text-base leading-7 text-ocean-900/62">{goal.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

            </>
          ) : null}

          {expedition.galleryImages.length > 0 ? (
            <>
          <DetailDivider />
          <section id="photos" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader title={`${labels.photos} (${expedition.galleryImages.length})`} />
            <div className="mt-9 grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
              {expedition.galleryImages.map((image, index) => (
                <figure key={`${image.src}-${image.label}`} className={cn("relative overflow-hidden bg-ocean-100", index === 0 ? "sm:col-span-2 sm:row-span-2" : "")}>
                  <div className={cn("relative", index === 0 ? "h-[360px] lg:h-[520px]" : "h-56 lg:h-64")}>
                    <Image src={image.src} alt={image.caption} fill className="object-cover" sizes={index === 0 ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"} />
                  </div>
                </figure>
              ))}
            </div>
          </section>

            </>
          ) : null}

          {expedition.travelerMedia.length > 0 ? (
            <>
              <DetailDivider />
              <section id="traveler-moments" className="scroll-mt-36 py-10 sm:py-14">
                <SectionHeader
                  title={labels.travelerMoments}
                  body={labels.travelerMomentsBody}
                />
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {expedition.travelerMedia.map((item) => (
                    <article key={item.id} className="overflow-hidden rounded-md border border-ocean-900/10 bg-white">
                      {item.mediaType === "photo" ? (
                        <div className="relative h-64 bg-ocean-50">
                          <Image
                            src={item.mediaUrl}
                            alt={item.caption ?? `${labels.travelerMomentAlt} ${expedition.title}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(min-width: 1024px) 33vw, 50vw"
                          />
                        </div>
                      ) : (
                        <a href={item.mediaUrl} target="_blank" rel="noreferrer" className="flex h-64 items-center justify-center bg-ocean-900 p-6 text-center font-bold text-white">
                          <span>
                            <PlayCircle className="mx-auto mb-3" size={34} aria-hidden="true" />
                            {labels.watchVideo}
                          </span>
                        </a>
                      )}
                      <div className="p-4">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-kelp-700">{labels.verifiedParticipant}</p>
                        <p className="mt-2 font-bold text-ocean-900">{item.travelerName}</p>
                        {item.caption ? <p className="mt-2 text-sm leading-6 text-ocean-900/62">{item.caption}</p> : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          <DetailDivider />
          <section id="host" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader title={labels.aboutHost} />
            <div className="mt-10 grid gap-10 lg:grid-cols-[0.5fr_0.5fr] lg:items-center">
              <div className="grid gap-8 sm:grid-cols-[180px_minmax(0,1fr)]">
                <div>
                  <div className="relative aspect-square overflow-hidden rounded-md bg-ocean-100">
                    {hostImage ? <Image src={hostImage} alt={`${expedition.hostedBy.title} host`} fill className="object-cover" sizes="180px" /> : null}
                  </div>
                  {expedition.hostedBy.verificationLabel ? <p className="mt-4 text-sm font-semibold text-kelp-700">{expedition.hostedBy.verificationLabel}</p> : null}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ocean-900">{expedition.hostedBy.title}</h3>
                  {expedition.partnerDescription ? <p className="mt-5 text-base leading-7 text-ocean-900/62">{expedition.partnerDescription}</p> : null}
                </div>
              </div>
              <div className="overflow-hidden rounded-md bg-sky-700 p-8 text-white">
                <h3 className="text-2xl font-bold tracking-normal">{labels.hostMoreTitle}</h3>
                <p className="mt-4 max-w-xl text-lg leading-8 text-white/82">{labels.hostMoreBody}</p>
                {expedition.hostedBy.profileHref ? (
                  <Link href={expedition.hostedBy.profileHref} className="mt-7 inline-flex min-h-12 items-center rounded-full bg-kelp-500 px-7 text-base font-bold text-white hover:bg-kelp-700">
                    {expedition.hostedBy.profileLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {expedition.relatedExpeditions.length > 0 ? (
            <>
              <DetailDivider />
              <section className="py-10 sm:py-14">
                <SectionHeader title={labels.moreHostExperiences} />
                <div className="mt-9 grid gap-6 md:grid-cols-2">
                  {expedition.relatedExpeditions.map((item) => (
                    <ExpeditionCard key={item.slug} expedition={item} />
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {hasMap ? (
            <>
          <DetailDivider />
          <section id="map" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader title={labels.map} body={expedition.route.privacyNote || undefined} />
            <div className="mt-8 overflow-hidden rounded-md border border-ocean-900/10 bg-ocean-50">
              <iframe title={expedition.route.mapTitle || `${expedition.title} map`} className="h-[420px] w-full border-0 lg:h-[560px]" loading="lazy" src={expedition.route.mapEmbedUrl} />
            </div>
          </section>

            </>
          ) : null}

          {hasImpact ? (
            <>
          <DetailDivider />
          <section id="impact" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader title={labels.impactTitle} body={`${formatCurrency(expedition.impact.conservationContribution, expedition.currency)} ${labels.impactContribution} ${expedition.impact.summary}`} />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {expedition.impact.targets.map((target) => (
                <div key={target.label} className="border-l-2 border-kelp-500 pl-4">
                  <p className="text-3xl font-light text-sky-700">{target.value}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/62">{target.label}</p>
                </div>
              ))}
            </div>
            {expedition.associatedCampaign ? (
              <div className="mt-9 grid gap-5 rounded-md border border-ocean-900/10 bg-ocean-50 p-5 md:grid-cols-[160px_minmax(0,1fr)_auto] md:items-center">
                <div className="relative h-32 overflow-hidden rounded-md bg-ocean-900">
                  {expedition.associatedCampaign.imageUrl ? <Image src={expedition.associatedCampaign.imageUrl} alt={`${expedition.associatedCampaign.title} campaign`} fill className="object-cover" sizes="160px" /> : null}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-kelp-700">{expedition.associatedCampaign.verification}</p>
                  <h3 className="mt-1 text-xl font-bold text-ocean-900">{expedition.associatedCampaign.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/62">{expedition.associatedCampaign.progress}% {labels.funded} &bull; {expedition.associatedCampaign.impact}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={`/campaigns/${expedition.associatedCampaign.slug}`} tone="secondary">{labels.viewCampaign}</ButtonLink>
                  <ButtonLink href={`/checkout/donation?campaign=${expedition.associatedCampaign.slug}`} tone="donation">{labels.donate}</ButtonLink>
                </div>
              </div>
            ) : null}
          </section>

            </>
          ) : null}

          <DetailDivider />
          <section id="ask-question" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader title={labels.messageTeam} body={labels.messageTeamBody} />
            {questionSavedMessage ? <p className="mt-5 rounded-md border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">{questionSavedMessage}</p> : null}
            {questionErrorMessage ? <p className="mt-5 rounded-md border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{questionErrorMessage}</p> : null}
            <form action={submitExpeditionInterestRequestAction} className="mt-8 grid gap-4 rounded-md border border-ocean-900/10 bg-ocean-50 p-4">
              <input type="hidden" name="next" value={questionNextPath} />
              <input type="hidden" name="expeditionId" value={expedition.id} />
              <input type="hidden" name="requestType" value="question" />
              <input type="hidden" name="participantsCount" value="1" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="contactName" placeholder={labels.yourName} className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
                <input name="contactEmail" type="email" placeholder="you@example.com" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500" required />
              </div>
              <select name="departureId" className="min-h-11 rounded-md border border-ocean-900/14 bg-white px-3 text-sm font-semibold outline-none focus:border-kelp-500">
                <option value="">{labels.generalQuestion}</option>
                {expedition.departures.map((departure) => (
                  <option key={departure.id} value={departure.id}>
                    {departure.dateRangeLabel} / {departure.statusLabel}
                  </option>
                ))}
              </select>
              <textarea
                name="message"
                rows={5}
                placeholder={labels.questionPlaceholder}
                className="rounded-md border border-ocean-900/14 bg-white px-3 py-3 text-sm font-semibold leading-6 outline-none focus:border-kelp-500"
                required
              />
              <Button type="submit" tone="secondary" className="w-fit rounded-md">
                <MessageSquareText size={17} aria-hidden="true" />
                {labels.sendQuestion}
              </Button>
            </form>
          </section>

          <DetailDivider />
          <section id="reviews" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader title={labels.reviews} />
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.3fr_0.7fr]">
              <div>
                <p className="text-5xl font-light text-ocean-900">{expedition.reviewCount > 0 ? expedition.rating.toFixed(1) : "-"}</p>
                <p className="mt-2 text-sm font-semibold text-ocean-900/62">
                  {expedition.reviewCount > 0 ? `${expedition.reviewCount} ${labels.reviewCountSuffix}` : labels.reviewsHelp}
                </p>
              </div>
              <div className="grid gap-4">
                {expedition.reviews.length > 0 ? (
                  expedition.reviews.slice(0, 4).map((review) => (
                    <article key={review.id} className="border-b border-ocean-900/10 pb-5 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-ocean-900">{review.name}</p>
                          <p className="mt-1 text-xs font-semibold text-ocean-900/52">{review.joinedAs} &bull; {review.date}</p>
                        </div>
                        <span className="flex items-center gap-1 text-sm font-bold text-kelp-700">
                          <Star size={14} aria-hidden="true" className="fill-kelp-500" />
                          {review.rating}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-ocean-900/68">{review.body}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-md border border-dashed border-ocean-900/14 bg-ocean-50 p-5 font-bold text-ocean-900">{labels.noReviews}</p>
                )}
              </div>
            </div>
          </section>

          {expedition.faqs.length > 0 ? (
            <>
          <DetailDivider />
          <section id="faq" className="scroll-mt-36 py-10 sm:py-14">
            <SectionHeader title={labels.beforeBook} />
            <div className="mt-7 grid gap-3">
              {expedition.faqs.map(([question, answer]) => (
                <details key={question} className="border-b border-ocean-900/10 py-4">
                  <summary className="cursor-pointer text-lg font-bold text-ocean-900">{question}</summary>
                  <p className="mt-3 text-base leading-7 text-ocean-900/62">{answer}</p>
                </details>
              ))}
            </div>
          </section>

            </>
          ) : null}

          {expedition.sustainability.length > 0 ? (
            <>
          <DetailDivider />
          <section className="py-10 sm:py-14">
            <SectionHeader title={labels.responsibleTravel} />
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {expedition.sustainability.map((item) => (
                <p key={item} className="flex items-start gap-2 text-sm font-semibold text-ocean-900/68">
                  <ShieldCheck size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-kelp-500" />
                  {item}
                </p>
              ))}
            </div>
            <Link href="/terms" className="mt-6 inline-flex text-sm font-bold text-sky-700">{labels.codeConduct}</Link>
          </section>

            </>
          ) : null}

          {expedition.tripUpdates.length > 0 ? (
            <>
              <DetailDivider />
              <section className="py-10 sm:py-14">
                <SectionHeader title={labels.tripActivity} />
                <div className="mt-7 grid gap-5 md:grid-cols-2">
                  {expedition.tripUpdates.map((update) => (
                    <article key={update.title} className="border-l-2 border-sky-700 pl-4">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/46">{formatDate(update.date, locale)}</p>
                      <p className="mt-2 font-bold text-ocean-900">{update.title}</p>
                      <p className="mt-2 text-sm leading-6 text-ocean-900/62">{update.body}</p>
                    </article>
                  ))}
                </div>
                {expedition.documentationUrl ? (
                  <a
                    href={expedition.documentationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-ocean-900/10 px-4 text-sm font-bold text-sky-700 hover:border-sky-600"
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                    {labels.viewDocumentation}
                  </a>
                ) : null}
              </section>
            </>
          ) : null}

          <DetailDivider />
          <section className="py-10 sm:py-14">
            <SectionHeader title={expedition.finalCta.title} body={expedition.finalCta.body} />
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="#availability" className="rounded-full">{expedition.finalCta.primaryLabel}</ButtonLink>
              <ButtonLink href="#ask-question" tone="light" className="rounded-full border border-ocean-900/10">{expedition.finalCta.secondaryLabel}</ButtonLink>
            </div>
            <div className="mt-5">
              <ExpeditionShareButtons slug={expedition.slug} title={expedition.title} referralCode={shareReferralCode} locale={locale} />
            </div>
          </section>
        </div>
      </main>

      <ExpeditionMobileBookingBar {...bookingProps} />
    </>
  );
}
