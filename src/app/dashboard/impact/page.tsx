import { Award, Heart, MapPinned, ShieldCheck, Waves } from "lucide-react";
import Link from "next/link";

import { DashboardImpactTrend } from "@/components/dashboard-impact-trend";
import { DashboardPersonalImpactMap } from "@/components/dashboard-personal-impact-map";
import { ImpactShareCard } from "@/components/impact-share-card";
import { PassportShareButtons } from "@/components/passport-share-buttons";
import { PassportPreview } from "@/components/passport-preview";
import { MetricValue } from "@/components/ui/metric-value";
import { requireUser } from "@/lib/auth";
import { publicPassportShareUrl } from "@/lib/passport-sharing";
import { getDashboardData } from "@/lib/queries";
import { getPreferredLocale, type SupportedLocale } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "My Impact"
};

export const dynamic = "force-dynamic";

function formatShortDate(value: Date, locale: SupportedLocale) {
  return value.toLocaleDateString(locale === "id" ? "id-ID" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function localizeTimelineItem<T extends { category: string; title: string; description: string }>(
  item: T,
  locale: SupportedLocale
): T {
  if (locale !== "id") {
    return item;
  }

  let title = item.title;
  let description = item.description;

  if (item.category === "Contribution") {
    title = title.replace(/^Contribution verified/, "Kontribusi terverifikasi");
  } else if (item.category === "Sponsorship") {
    title = title.replace(/^Sponsored /, "Mensponsori ");
  } else if (item.category === "Monitoring") {
    title = "Monitoring sponsorship diperbarui";
  } else if (item.category === "Booking") {
    title = title.replace(/^Booked /, "Booking ");
    const parts = description.split(" booking · ");
    if (parts.length === 2) {
      description = `${parts[0]} · ${parts[1]}`;
    }
  } else if (item.category === "Expedition") {
    title = title.replace(/^Completed /, "Selesai: ");
    if (description === "Participation confirmed by the expedition partner.") {
      description = "Partisipasi dikonfirmasi oleh mitra ekspedisi.";
    }
  } else if (item.category === "Learning") {
    title = "Kursus selesai";
  } else if (item.category === "Certificate") {
    title = "Sertifikat diberikan";
  } else if (item.category === "Field activity") {
    description = description.replace(" · campaign-level activity", " · aktivitas tingkat kampanye");
  } else if (item.category === "Verified campaign evidence") {
    description = description.replace(" · verified campaign-level field evidence", " · bukti lapangan tingkat kampanye yang terverifikasi");
  } else if (item.category === "Impact Passport") {
    description = description.replace("Verified activity added to your Impact Passport.", "Aktivitas terverifikasi ditambahkan ke Impact Passport-mu.");
  }

  return { ...item, title, description };
}

function timelineCategoryLabel(category: string, locale: SupportedLocale) {
  if (locale !== "id") {
    return category;
  }

  const labels: Record<string, string> = {
    Contribution: "Kontribusi",
    Sponsorship: "Sponsorship",
    Monitoring: "Monitoring",
    Booking: "Booking",
    Expedition: "Ekspedisi",
    Learning: "Pembelajaran",
    Certificate: "Sertifikat",
    "Field activity": "Aktivitas lapangan",
    "Verified campaign evidence": "Bukti kampanye terverifikasi",
    "Impact Passport": "Impact Passport"
  };

  return labels[category] ?? category;
}

const verifiedOutcomeCategories = new Set(["Monitoring", "Field activity", "Verified campaign evidence"]);

export default async function DashboardImpactPage() {
  const user = await requireUser("/dashboard/impact");
  const [data, locale] = await Promise.all([
    getDashboardData(user.id),
    getPreferredLocale()
  ]);
  const isIndonesian = locale === "id";
  const numberLocale = isIndonesian ? "id-ID" : "en-US";
  const labels =
    isIndonesian
      ? {
          eyebrow: "Dampak Saya",
          title: "Aksi saya dan outcome konservasi yang terverifikasi",
          subtitle: "Terumbu memisahkan catatan yang benar-benar merupakan aksimu dari outcome kampanye atau lokasi yang terhubung dengan aktivitasmu.",
          passportId: "ID Passport",
          passportTitle: "Impact Passport Terumbu.eco",
          myActions: "Aksi Saya",
          myActionsTitle: "Catatan yang benar-benar milikmu",
          myActionsBody: "Donasi, sponsorship, booking atau partisipasi ekspedisi, pembelajaran, dan sertifikat dicatat sebagai aktivitas personalmu.",
          verifiedOutcomes: "Outcome Konservasi Terverifikasi",
          verifiedOutcomesTitle: "Bukti dari kampanye dan lokasi yang terhubung",
          verifiedOutcomesBody: "Monitoring dan bukti lapangan berasal dari kampanye atau lokasi yang kamu dukung atau kunjungi. Outcome ini tidak diklaim sebagai hasil eksklusif dari tindakan individualmu.",
          totalDonated: "Total donasi",
          restorationUnits: "Unit restorasi sponsorship",
          expeditionsCompleted: "Ekspedisi selesai",
          certificates: "Sertifikat",
          linkedSites: "Lokasi terhubung",
          verifiedEvidence: "Bukti terverifikasi",
          carbonEstimate: "Estimasi karbon terkait",
          carbonPending: "Menunggu",
          outcomeNote: "Metrik outcome di bawah berasal dari catatan kampanye/lokasi yang terhubung, bukan atribusi sebab-akibat personal.",
          sponsoredRecords: "Catatan sponsorship saya",
          sponsoredRecordsTitle: "Coral dan mangrove yang tercatat atas kontribusimu",
          records: "catatan",
          planted: "Ditanam",
          updated: "Diperbarui",
          verifiedActivity: "aktivitas terverifikasi",
          sponsoredEmpty: "Catatan sponsorship coral atau mangrove akan muncul setelah kontribusi yang memenuhi syarat.",
          actionsTrend: "Aktivitas personal dari waktu ke waktu",
          actionsTimeline: "Timeline Aksi Saya",
          actionsTimelineTitle: "Kontribusi, perjalanan, dan pembelajaran",
          actionsTimelineBody: "Hanya record personal dan item passport yang ditampilkan di sini.",
          outcomesTimeline: "Timeline Outcome Terverifikasi",
          outcomesTimelineTitle: "Monitoring dan bukti lapangan yang terhubung",
          outcomesTimelineBody: "Ini adalah outcome kampanye/lokasi yang terhubung dengan aktivitasmu, bukan outcome individual eksklusif.",
          noActions: "Belum ada aktivitas personal untuk ditampilkan.",
          noOutcomes: "Belum ada outcome kampanye atau lokasi terverifikasi yang terhubung.",
          passportSection: "Impact Passport",
          passportSectionTitle: "Ringkasan aktivitas yang bisa dibagikan",
          passportSectionBody: "Passport merangkum aktivitas dan record yang memenuhi syarat. Gunakan bagian ini untuk berbagi profil tanpa menyamakan outcome kampanye dengan atribusi personal.",
          shareCard: "Kartu berbagi"
        }
      : {
          eyebrow: "My Impact",
          title: "My actions and connected verified conservation outcomes",
          subtitle: "Terumbu separates records that are directly yours from campaign or site outcomes connected to your activity.",
          passportId: "Passport ID",
          passportTitle: "Terumbu.eco Impact Passport",
          myActions: "My Actions",
          myActionsTitle: "Records that are directly yours",
          myActionsBody: "Donations, sponsorships, expedition bookings or participation, learning, and certificates are recorded as your personal activity.",
          verifiedOutcomes: "Verified Conservation Outcomes",
          verifiedOutcomesTitle: "Evidence from connected campaigns and sites",
          verifiedOutcomesBody: "Monitoring and field evidence come from campaigns or places you supported or visited. These outcomes are not claimed as exclusively caused by your individual actions.",
          totalDonated: "Total donated",
          restorationUnits: "Sponsored restoration units",
          expeditionsCompleted: "Expeditions completed",
          certificates: "Certificates",
          linkedSites: "Connected sites",
          verifiedEvidence: "Verified evidence",
          carbonEstimate: "Connected carbon estimate",
          carbonPending: "Pending",
          outcomeNote: "Outcome metrics below come from connected campaign/site records, not direct individual causal attribution.",
          sponsoredRecords: "My sponsorship records",
          sponsoredRecordsTitle: "Coral and mangrove records tied to your contribution",
          records: "records",
          planted: "Planted",
          updated: "Updated",
          verifiedActivity: "verified activity",
          sponsoredEmpty: "Sponsored coral or mangrove records will appear here after a qualifying contribution.",
          actionsTrend: "Personal activity over time",
          actionsTimeline: "My Actions Timeline",
          actionsTimelineTitle: "Contributions, journeys, and learning",
          actionsTimelineBody: "Only personal records and passport items are shown here.",
          outcomesTimeline: "Verified Outcomes Timeline",
          outcomesTimelineTitle: "Connected monitoring and field evidence",
          outcomesTimelineBody: "These are campaign/site outcomes connected to your activity, not exclusive individual outcomes.",
          noActions: "No personal activity to show yet.",
          noOutcomes: "No connected verified campaign or site outcomes yet.",
          passportSection: "Impact Passport",
          passportSectionTitle: "Your shareable activity summary",
          passportSectionBody: "Passport summarizes eligible activity and records. Use this section to share your profile without equating campaign outcomes with personal attribution.",
          shareCard: "Share card"
        };

  const passportUrl =
    data.profile?.publicSlug
      ? publicPassportShareUrl({
          origin: process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco",
          publicSlug: data.profile.publicSlug,
          visibility: data.profile.passportVisibility ?? "private",
          shareToken: data.profile.passportShareToken
        })
      : null;

  const actionSummary = [
    { label: labels.totalDonated, value: formatCurrency(data.summary.totalDonated), icon: Heart },
    { label: labels.restorationUnits, value: data.summary.coralFragments.toLocaleString(numberLocale), icon: Waves },
    { label: labels.expeditionsCompleted, value: data.summary.fieldActivities.toLocaleString(numberLocale), icon: MapPinned },
    { label: labels.certificates, value: data.summary.certificates.toLocaleString(numberLocale), icon: Award }
  ];

  const verifiedEvidenceCount = data.personalMapSites.reduce((total, site) => total + site.verifiedEvidenceCount, 0);
  const outcomeSummary = [
    { label: labels.linkedSites, value: data.personalMapSites.length.toLocaleString(numberLocale) },
    { label: labels.verifiedEvidence, value: verifiedEvidenceCount.toLocaleString(numberLocale) },
    {
      label: labels.carbonEstimate,
      value: data.summary.carbonKg > 0
        ? `${data.summary.carbonKg.toLocaleString(numberLocale, { maximumFractionDigits: 1 })} kg CO2e`
        : labels.carbonPending
    }
  ];

  const personalTimeline = data.timelineItems.filter((item) => !verifiedOutcomeCategories.has(item.category));
  const outcomeTimeline = data.timelineItems.filter((item) => verifiedOutcomeCategories.has(item.category));

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-normal text-ocean-900">{labels.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/62">{labels.subtitle}</p>
          {data.profile?.passportNumber ? (
            <p className="mt-3 text-sm font-bold text-ocean-900">{labels.passportId}: {data.profile.passportNumber}</p>
          ) : null}
        </div>
        {passportUrl ? (
          <PassportShareButtons
            url={passportUrl}
            title={`${data.profile?.displayName ?? "My"} ${labels.passportTitle}`}
            locale={locale}
          />
        ) : null}
      </header>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-kelp-500/20 bg-kelp-100/55 p-5">
          <div className="flex items-start gap-3">
            <Heart className="mt-0.5 text-kelp-700" size={22} aria-hidden="true" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-kelp-700">{labels.myActions}</p>
              <h2 className="mt-2 text-xl font-bold text-ocean-900">{labels.myActionsTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-ocean-900/64">{labels.myActionsBody}</p>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-ocean-900/10 bg-ocean-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 text-ocean-700" size={22} aria-hidden="true" />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-ocean-700">{labels.verifiedOutcomes}</p>
              <h2 className="mt-2 text-xl font-bold text-ocean-900">{labels.verifiedOutcomesTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-ocean-900/64">{labels.verifiedOutcomesBody}</p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.myActions}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.myActionsTitle}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {actionSummary.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="min-w-0 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <Icon className="text-coral-500" size={22} aria-hidden="true" />
                <MetricValue className="mt-4 text-ocean-900">{item.value}</MetricValue>
                <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="corals" className="mt-6 scroll-mt-24 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.sponsoredRecords}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.sponsoredRecordsTitle}</h2>
          </div>
          {data.coralCards.length > 0 ? (
            <span className="text-sm font-semibold text-ocean-900/54">
              {data.coralCards.length.toLocaleString(numberLocale)} {labels.records}
            </span>
          ) : null}
        </div>

        {data.coralCards.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {data.coralCards.map((ecosystem) => (
              <Link
                key={ecosystem.code}
                href={`/dashboard/corals/${ecosystem.code}`}
                className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4 transition hover:border-coral-500"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-ocean-900">{ecosystem.label}</p>
                    <p className="mt-1 text-sm font-semibold text-ocean-900/56">{ecosystem.code}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-ocean-900">
                    {ecosystem.quantity.toLocaleString(numberLocale)} {ecosystem.unit}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-ocean-900/56">
                  {ecosystem.location ? <span>{ecosystem.location}</span> : null}
                  {ecosystem.plantedAt ? <span>{labels.planted} {formatShortDate(ecosystem.plantedAt, locale)}</span> : null}
                  {ecosystem.lastUpdatedAt ? <span>{labels.updated} {formatShortDate(ecosystem.lastUpdatedAt, locale)}</span> : null}
                  <span>{ecosystem.verifiedEvidenceCount.toLocaleString(numberLocale)} {labels.verifiedActivity}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/58">
            {labels.sponsoredEmpty}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-ocean-700">{labels.verifiedOutcomes}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.verifiedOutcomesTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/58">{labels.outcomeNote}</p>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            {outcomeSummary.map((item) => (
              <div key={item.label} className="rounded-xl bg-ocean-50 p-3">
                <p className="text-lg font-bold text-ocean-900">{item.value}</p>
                <p className="mt-1 text-xs font-semibold text-ocean-900/54">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <DashboardPersonalImpactMap sites={data.personalMapSites} fullMapHref="/impact-map" locale={locale} />
      </section>

      <section className="mt-6">
        <DashboardImpactTrend trend={data.trend} locale={locale} mode="activity" />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.actionsTimeline}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.actionsTimelineTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/58">{labels.actionsTimelineBody}</p>
          {personalTimeline.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {personalTimeline.slice(0, 10).map((rawItem) => {
                const item = localizeTimelineItem(rawItem, locale);
                return (
                  <li key={item.id} className="grid grid-cols-[84px_1fr] gap-3">
                    <time className="text-xs font-bold text-ocean-900/52">{formatShortDate(item.occurredAt, locale)}</time>
                    <Link href={item.href} className="border-l-2 border-coral-100 pl-4">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{timelineCategoryLabel(item.category, locale)}</span>
                      <span className="mt-1 block font-bold text-ocean-900">{item.title}</span>
                      <span className="mt-1 block text-sm text-ocean-900/58">{item.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">{labels.noActions}</p>
          )}
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-ocean-700">{labels.outcomesTimeline}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.outcomesTimelineTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/58">{labels.outcomesTimelineBody}</p>
          {outcomeTimeline.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {outcomeTimeline.slice(0, 10).map((rawItem) => {
                const item = localizeTimelineItem(rawItem, locale);
                return (
                  <li key={item.id} className="grid grid-cols-[84px_1fr] gap-3">
                    <time className="text-xs font-bold text-ocean-900/52">{formatShortDate(item.occurredAt, locale)}</time>
                    <Link href={item.href} className="border-l-2 border-ocean-100 pl-4">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-ocean-700">{timelineCategoryLabel(item.category, locale)}</span>
                      <span className="mt-1 block font-bold text-ocean-900">{item.title}</span>
                      <span className="mt-1 block text-sm text-ocean-900/58">{item.description}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/58">{labels.noOutcomes}</p>
          )}
        </article>
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.passportSection}</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{labels.passportSectionTitle}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ocean-900/58">{labels.passportSectionBody}</p>
        </div>
        {data.passportPreview ? <PassportPreview passport={data.passportPreview} locale={locale} /> : null}
      </section>

      <section className="mt-6">
        <div className="mb-4">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.shareCard}</p>
        </div>
        <ImpactShareCard
          displayName={data.profile?.displayName ?? user.displayName ?? user.name ?? user.email}
          passportNumber={data.profile?.passportNumber}
          totalDonated={formatCurrency(data.summary.totalDonated)}
          coralCount={data.summary.coralFragments}
          fieldActivities={data.summary.fieldActivities}
          certificates={data.summary.certificates}
          publicUrl={passportUrl}
          locale={locale}
        />
      </section>
    </main>
  );
}
