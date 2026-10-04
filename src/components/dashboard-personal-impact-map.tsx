"use client";

import { Camera, CheckCircle2, ExternalLink, List, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { ProgressMeter } from "@/components/ui/progress-meter";
import type { ImpactSiteData } from "@/lib/domain";
import type { SupportedLocale } from "@/lib/user-preferences";
import { cn, formatCurrency } from "@/lib/utils";

const indonesiaBounds = {
  minLat: -11,
  maxLat: 6,
  minLng: 94,
  maxLng: 142
};

type PersonalImpactSite = ImpactSiteData & {
  campaignSlug: string;
  campaignTitle: string;
  contributed: number;
  supportedUnits: number;
  expeditionVisits: number;
  expeditionTitles: string[];
};

type DashboardPersonalImpactMapProps = {
  sites: PersonalImpactSite[];
  fullMapHref?: string;
  fullMapLabel?: string;
  locale?: SupportedLocale;
};

function pinPosition(site: PersonalImpactSite) {
  const left = ((site.longitude - indonesiaBounds.minLng) / (indonesiaBounds.maxLng - indonesiaBounds.minLng)) * 100;
  const top = ((indonesiaBounds.maxLat - site.latitude) / (indonesiaBounds.maxLat - indonesiaBounds.minLat)) * 100;

  return {
    left: `${Math.min(92, Math.max(8, left))}%`,
    top: `${Math.min(86, Math.max(12, top))}%`
  };
}

function pinTone(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("mangrove")) {
    return "bg-kelp-500 text-white ring-kelp-100";
  }

  if (normalized.includes("cleanup")) {
    return "bg-coral-500 text-white ring-coral-100";
  }

  return "bg-ocean-700 text-white ring-ocean-100";
}

function isImageUrl(value: string | null | undefined) {
  return Boolean(value && (value.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value)));
}

export function DashboardPersonalImpactMap({
  sites,
  fullMapHref = "/dashboard/impact",
  fullMapLabel,
  locale = "en"
}: DashboardPersonalImpactMapProps) {
  const labels =
    locale === "id"
      ? {
          fullMap: "Lihat peta lengkap",
          emptyTitle: "Peta dampakmu belum terisi",
          emptyBody: "Kampanye yang kamu dukung, sponsorship, ekspedisi, dan aktivitas lapangan terverifikasi akan muncul di sini sebagai zona perkiraan.",
          explore: "Jelajahi proyek",
          eyebrow: "Peta dampakmu",
          title: "Lokasi yang terhubung dengan aktivitasmu",
          iframe: "Tampilan OpenStreetMap zona dampak pribadi di Indonesia",
          showImpact: "Tampilkan dampak saya di",
          privacy: "Lokasi ditampilkan secara perkiraan untuk melindungi area restorasi.",
          milestone: "progres milestone",
          records: "catatan aktivitas",
          latestSurvey: "Survei terbaru",
          pendingSurvey: "Survei menunggu",
          verified: "terverifikasi",
          before: "Sebelum",
          after: "Sesudah",
          activityFor: "aktivitas untuk",
          pendingActivity: "Aktivitas menunggu",
          progressAria: "persen melalui milestone saat ini",
          contributed: "dikontribusikan di sini",
          supportedUnits: "unit restorasi didukung",
          visitedThrough: "Dikunjungi melalui",
          completedExpedition: "ekspedisi selesai",
          completedExpeditions: "ekspedisi selesai",
          viewImpact: "Lihat dampak saya di sini",
          latestSource: "Sumber aktivitas terbaru",
          listView: "Tampilan daftar",
          sitesList: "Daftar lokasi dampak"
        }
      : {
          fullMap: "View full map",
          emptyTitle: "Your impact map is waiting",
          emptyBody: "Campaigns you support, sponsored corals, expeditions, and verified field activity will appear here as approximate zones.",
          explore: "Explore projects",
          eyebrow: "Your impact map",
          title: "Places connected to your activity",
          iframe: "OpenStreetMap view of personal Indonesian impact zones",
          showImpact: "Show my impact at",
          privacy: "Locations are shown approximately to protect restoration areas.",
          milestone: "milestone progress",
          records: "activity records",
          latestSurvey: "Latest survey",
          pendingSurvey: "Survey pending",
          verified: "verified",
          before: "Before",
          after: "After",
          activityFor: "activity for",
          pendingActivity: "Activity pending",
          progressAria: "percent through its current milestone",
          contributed: "contributed here",
          supportedUnits: "supported restoration units",
          visitedThrough: "Visited through",
          completedExpedition: "completed expedition",
          completedExpeditions: "completed expeditions",
          viewImpact: "View my impact here",
          latestSource: "Latest activity source",
          listView: "List view",
          sitesList: "Impact sites list view"
        };
  const resolvedFullMapLabel = fullMapLabel ?? labels.fullMap;
  const numberLocale = locale === "id" ? "id-ID" : "en-US";
  const [selectedName, setSelectedName] = useState(sites[0]?.name ?? null);
  const selectedSite = sites.find((site) => site.name === selectedName) ?? sites[0] ?? null;

  if (sites.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-ocean-900/16 bg-white p-8 text-center shadow-soft" aria-labelledby="personal-map-title">
        <MapPin className="mx-auto text-coral-500" size={30} aria-hidden="true" />
        <h2 id="personal-map-title" className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">
          {labels.emptyTitle}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ocean-900/62">
          {labels.emptyBody}
        </p>
        <Link href="/campaigns" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-coral-500 px-5 text-sm font-bold text-white">
          {labels.explore}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" aria-labelledby="personal-map-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
          <h2 id="personal-map-title" className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">
            {labels.title}
          </h2>
        </div>
        <Link href={fullMapHref} className="hidden text-sm font-bold text-coral-700 hover:text-coral-500 sm:inline-flex">
          {resolvedFullMapLabel}
        </Link>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="relative min-h-[320px] overflow-hidden rounded-2xl bg-ocean-900">
          <iframe
            title={labels.iframe}
            className="absolute inset-0 h-full w-full border-0 opacity-70"
            loading="lazy"
            src="https://www.openstreetmap.org/export/embed.html?bbox=94%2C-11%2C142%2C6&layer=mapnik"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(7,52,63,0.68),rgba(24,143,138,0.22))]" />

          {sites.map((site) => (
            <button
              key={site.id}
              type="button"
              aria-label={`${labels.showImpact} ${site.name}`}
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-1 shadow-soft ring-4 transition hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500",
                pinTone(site.type),
                selectedSite?.id === site.id && "scale-110 ring-white"
              )}
              style={pinPosition(site)}
              onClick={() => setSelectedName(site.name)}
            >
              <span className="flex size-10 items-center justify-center rounded-full">
                <MapPin size={20} aria-hidden="true" />
              </span>
            </button>
          ))}

          <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/92 p-4 backdrop-blur">
            <p className="text-sm font-bold text-ocean-900">{labels.privacy}</p>
          </div>
        </div>

        <div>
          {selectedSite ? (
            <div className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ocean-900">{selectedSite.name}</p>
                  <p className="mt-1 text-sm text-ocean-900/62">{selectedSite.region}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-ocean-900">{selectedSite.type}</span>
              </div>
              <p className="mt-4 text-sm leading-6 text-ocean-900/68">{selectedSite.campaignTitle}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 text-kelp-500" size={20} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-ocean-900">{selectedSite.progress}% {labels.milestone}</p>
                    <p className="text-xs text-ocean-900/58">{selectedSite.verification}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Camera className="mt-0.5 text-coral-500" size={20} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-ocean-900">{selectedSite.evidenceCount} {labels.records}</p>
                    <p className="text-xs text-ocean-900/58">
                      {selectedSite.latestSurvey ? `${labels.latestSurvey}: ${selectedSite.latestSurvey}` : labels.pendingSurvey} · {selectedSite.verifiedEvidenceCount} {labels.verified}
                    </p>
                  </div>
                </div>
              </div>
              {selectedSite.beforeAfter ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {[
                    { label: labels.before, evidence: selectedSite.beforeAfter.before },
                    { label: labels.after, evidence: selectedSite.beforeAfter.after }
                  ].map(({ label, evidence }) => (
                    <div key={label} className="overflow-hidden rounded-xl bg-white">
                      {evidence && isImageUrl(evidence.fileUrl) ? (
                        <Image
                          src={evidence.fileUrl}
                          alt={`${label} ${labels.activityFor} ${selectedSite.name}`}
                          width={420}
                          height={240}
                          unoptimized
                          className="h-24 w-full object-cover"
                          sizes="(min-width: 1280px) 260px, 50vw"
                        />
                      ) : null}
                      <div className="p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{label}</p>
                        <p className="mt-1 text-xs font-semibold text-ocean-900/62">
                          {evidence ? evidence.title : labels.pendingActivity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <ProgressMeter
                value={selectedSite.progress}
                label={`${selectedSite.name} ${selectedSite.progress} ${labels.progressAria}.`}
                className="mt-5 h-2"
                indicatorClassName="bg-kelp-500"
                trackClassName="bg-white"
              />
              <div className="mt-5 grid gap-2 text-sm font-semibold text-ocean-900/68">
                {selectedSite.contributed > 0 ? <span className="min-w-0 break-words [overflow-wrap:anywhere]">{formatCurrency(selectedSite.contributed)} {labels.contributed}</span> : null}
                {selectedSite.supportedUnits > 0 ? <span>{selectedSite.supportedUnits.toLocaleString(numberLocale)} {labels.supportedUnits}</span> : null}
                {selectedSite.expeditionVisits > 0 ? (
                  <span>
                    {labels.visitedThrough} {selectedSite.expeditionVisits.toLocaleString(numberLocale)} {selectedSite.expeditionVisits === 1 ? labels.completedExpedition : labels.completedExpeditions}
                    {selectedSite.expeditionTitles.length > 0 ? ` · ${selectedSite.expeditionTitles.join(", ")}` : ""}
                  </span>
                ) : null}
              </div>
              <Link href={`/campaigns/${selectedSite.campaignSlug}`} className="mt-5 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
                {labels.viewImpact}
              </Link>
              {selectedSite.latestEvidence ? (
                <Link href={selectedSite.latestEvidence.sourceHref} className="mt-3 flex items-center gap-1 text-sm font-bold text-ocean-900/62 hover:text-coral-500">
                  {labels.latestSource}
                  <ExternalLink size={14} aria-hidden="true" />
                </Link>
              ) : null}
              {selectedSite.monitoringHistory.length > 0 ? (
                <ol className="mt-5 space-y-3">
                  {selectedSite.monitoringHistory.slice(0, 3).map((event) => (
                    <li key={event.id} className="border-l-2 border-ocean-100 pl-3">
                      <Link href={event.evidenceHref} className="text-xs font-bold text-ocean-900 hover:text-coral-700">
                        {event.label} / {event.date}
                      </Link>
                      <p className="mt-1 text-xs leading-5 text-ocean-900/58">{event.summary}</p>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 grid gap-2" aria-label={labels.sitesList}>
            <p className="flex items-center gap-2 text-sm font-bold text-ocean-900">
              <List size={16} aria-hidden="true" />
              {labels.listView}
            </p>
            {sites.map((site) => (
              <button
                key={`${site.id}-list`}
                type="button"
                className={cn(
                  "w-full rounded-xl border px-4 py-3 text-left text-sm transition hover:border-coral-500",
                  selectedSite?.name === site.name ? "border-coral-500 bg-coral-100/35" : "border-ocean-900/10 bg-white"
                )}
                onClick={() => setSelectedName(site.name)}
              >
                <span className="block font-bold text-ocean-900">{site.name}</span>
                <span className="mt-1 block text-ocean-900/58">{site.region}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
