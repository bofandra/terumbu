"use client";

import { Download, Share2 } from "lucide-react";
import type { SupportedLocale } from "@/lib/user-preferences";

type ImpactShareCardProps = {
  displayName: string;
  passportNumber?: string | null;
  totalDonated: string;
  coralCount: number;
  fieldActivities: number;
  certificates: number;
  publicUrl?: string | null;
  locale?: SupportedLocale;
};

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    '"': "&quot;"
  }[character] ?? character));
}

export function ImpactShareCard({
  displayName,
  passportNumber,
  totalDonated,
  coralCount,
  fieldActivities,
  certificates,
  publicUrl,
  locale = "en"
}: ImpactShareCardProps) {
  const numberLocale = locale === "id" ? "id-ID" : "en-US";
  const labels =
    locale === "id"
      ? {
          shareText: `Lihat catatan aktivitas konservasi ${displayName} di Terumbu.eco — ${coralCount.toLocaleString(numberLocale)} unit restorasi sponsorship, ${fieldActivities.toLocaleString(numberLocale)} partisipasi lapangan, dan ${certificates.toLocaleString(numberLocale)} sertifikat.`,
          verifiedRecord: "TERUMBU.ECO • CATATAN AKTIVITAS",
          totalDonated: "TOTAL DONASI",
          restorationUnits: "UNIT RESTORASI SPONSORSHIP",
          fieldParticipation: "PARTISIPASI LAPANGAN",
          certificates: "SERTIFIKAT",
          tagline: "Travel. Restore. Leave an Impact.",
          disclosure: "Kartu ini merangkum aktivitas user dan catatan Terumbu; outcome kampanye tidak diklaim sebagai atribusi individual.",
          shareable: "Kartu aktivitas yang dapat dibagikan",
          passport: "Impact Passport",
          donated: "Donasi",
          restoration: "Restorasi",
          field: "Lapangan",
          share: "Bagikan kartu",
          save: "Simpan SVG",
          shareTitle: "Aktivitas Terumbu.eco Saya"
        }
      : {
          shareText: `See ${displayName}'s conservation activity record on Terumbu.eco — ${coralCount.toLocaleString(numberLocale)} sponsored restoration units, ${fieldActivities.toLocaleString(numberLocale)} field participations, and ${certificates.toLocaleString(numberLocale)} certificates.`,
          verifiedRecord: "TERUMBU.ECO • ACTIVITY RECORD",
          totalDonated: "TOTAL DONATED",
          restorationUnits: "SPONSORED RESTORATION UNITS",
          fieldParticipation: "FIELD PARTICIPATION",
          certificates: "CERTIFICATES",
          tagline: "Travel. Restore. Leave an Impact.",
          disclosure: "This card summarizes user activity and Terumbu records; campaign outcomes are not claimed as individually attributable.",
          shareable: "Shareable activity card",
          passport: "Impact Passport",
          donated: "Donated",
          restoration: "Restoration",
          field: "Field",
          share: "Share card",
          save: "Save SVG",
          shareTitle: "My Terumbu.eco Activity"
        };
  const shareText = labels.shareText;

  function svgMarkup() {
    const name = escapeXml(displayName);
    const passport = escapeXml(passportNumber ?? labels.passport);
    const donated = escapeXml(totalDonated);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <rect width="1080" height="1350" rx="64" fill="#073642"/>
      <circle cx="905" cy="190" r="220" fill="#1f9d84" opacity="0.22"/>
      <circle cx="160" cy="1180" r="260" fill="#f47a5a" opacity="0.18"/>
      <text x="84" y="110" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#a9e5d7">${escapeXml(labels.verifiedRecord)}</text>
      <text x="84" y="235" font-family="Arial, sans-serif" font-size="68" font-weight="700" fill="#ffffff">${name}</text>
      <text x="84" y="292" font-family="Arial, sans-serif" font-size="30" fill="#c8d8dc">${passport}</text>
      <text x="84" y="425" font-family="Arial, sans-serif" font-size="28" fill="#c8d8dc">${escapeXml(labels.totalDonated)}</text>
      <text x="84" y="492" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${donated}</text>
      <text x="84" y="650" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${coralCount}</text>
      <text x="84" y="695" font-family="Arial, sans-serif" font-size="27" fill="#c8d8dc">${escapeXml(labels.restorationUnits)}</text>
      <text x="580" y="650" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${fieldActivities}</text>
      <text x="580" y="695" font-family="Arial, sans-serif" font-size="27" fill="#c8d8dc">${escapeXml(labels.fieldParticipation)}</text>
      <text x="84" y="845" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${certificates}</text>
      <text x="84" y="890" font-family="Arial, sans-serif" font-size="27" fill="#c8d8dc">${escapeXml(labels.certificates)}</text>
      <text x="84" y="1080" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${escapeXml(labels.tagline)}</text>
      <text x="84" y="1140" font-family="Arial, sans-serif" font-size="27" fill="#a9e5d7">terumbu.eco</text>
      <text x="84" y="1260" font-family="Arial, sans-serif" font-size="21" fill="#8ea5aa">${escapeXml(labels.disclosure)}</text>
    </svg>`;
  }

  function downloadCard() {
    const blob = new Blob([svgMarkup()], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "terumbu-impact-card.svg";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function shareCard() {
    const url = publicUrl ?? window.location.href;

    if (navigator.share) {
      const blob = new Blob([svgMarkup()], { type: "image/svg+xml" });
      const file = new File([blob], "terumbu-impact-card.svg", { type: "image/svg+xml" });
      try {
        await navigator.share({ title: labels.shareTitle, text: shareText, url, files: [file] });
        return;
      } catch {
        // Fall back to text/link sharing below.
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
    }
  }

  return (
    <section className="rounded-2xl border border-ocean-900/10 bg-ocean-900 p-5 text-white shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-kelp-200">{labels.shareable}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-normal">{displayName}</h2>
      <p className="mt-1 text-sm text-white/58">{passportNumber ?? labels.passport}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [labels.donated, totalDonated],
          [labels.restoration, coralCount.toLocaleString(numberLocale)],
          [labels.field, fieldActivities.toLocaleString(numberLocale)],
          [labels.certificates, certificates.toLocaleString(numberLocale)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/8 p-3">
            <p className="text-lg font-bold">{value}</p>
            <p className="mt-1 text-xs font-semibold text-white/54">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-lg font-bold">{labels.tagline}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => void shareCard()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-kelp-500 px-4 text-sm font-bold text-white hover:bg-kelp-700">
          <Share2 size={16} aria-hidden="true" /> {labels.share}
        </button>
        <button type="button" onClick={downloadCard} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 px-4 text-sm font-bold text-white hover:bg-white/10">
          <Download size={16} aria-hidden="true" /> {labels.save}
        </button>
      </div>
    </section>
  );
}
