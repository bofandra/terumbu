"use client";

import { Download, Share2 } from "lucide-react";
import { useMemo } from "react";

type ImpactShareCardProps = {
  displayName: string;
  passportNumber?: string | null;
  totalDonated: string;
  coralCount: number;
  fieldActivities: number;
  certificates: number;
  publicUrl?: string | null;
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
  publicUrl
}: ImpactShareCardProps) {
  const shareText = useMemo(
    () => `${displayName}'s verified conservation impact on Terumbu.eco — ${coralCount} sponsored coral units, ${fieldActivities} field activities, ${certificates} certificates.`,
    [certificates, coralCount, displayName, fieldActivities]
  );

  function svgMarkup() {
    const name = escapeXml(displayName);
    const passport = escapeXml(passportNumber ?? "Impact Passport");
    const donated = escapeXml(totalDonated);

    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <rect width="1080" height="1350" rx="64" fill="#073642"/>
      <circle cx="905" cy="190" r="220" fill="#1f9d84" opacity="0.22"/>
      <circle cx="160" cy="1180" r="260" fill="#f47a5a" opacity="0.18"/>
      <text x="84" y="110" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#a9e5d7">TERUMBU.ECO • VERIFIED IMPACT</text>
      <text x="84" y="235" font-family="Arial, sans-serif" font-size="68" font-weight="700" fill="#ffffff">${name}</text>
      <text x="84" y="292" font-family="Arial, sans-serif" font-size="30" fill="#c8d8dc">${passport}</text>
      <text x="84" y="425" font-family="Arial, sans-serif" font-size="28" fill="#c8d8dc">TOTAL DONATED</text>
      <text x="84" y="492" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${donated}</text>
      <text x="84" y="650" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${coralCount}</text>
      <text x="84" y="695" font-family="Arial, sans-serif" font-size="27" fill="#c8d8dc">SPONSORED CORAL UNITS</text>
      <text x="580" y="650" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${fieldActivities}</text>
      <text x="580" y="695" font-family="Arial, sans-serif" font-size="27" fill="#c8d8dc">FIELD ACTIVITIES</text>
      <text x="84" y="845" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#ffffff">${certificates}</text>
      <text x="84" y="890" font-family="Arial, sans-serif" font-size="27" fill="#c8d8dc">CERTIFICATES</text>
      <text x="84" y="1080" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff">Travel. Restore. Leave an Impact.</text>
      <text x="84" y="1140" font-family="Arial, sans-serif" font-size="27" fill="#a9e5d7">terumbu.eco</text>
      <text x="84" y="1260" font-family="Arial, sans-serif" font-size="21" fill="#8ea5aa">Impact shown from verified Terumbu records.</text>
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
        await navigator.share({ title: "My Terumbu.eco Impact", text: shareText, url, files: [file] });
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
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-kelp-200">Shareable impact card</p>
      <h2 className="mt-2 text-2xl font-bold tracking-normal">{displayName}</h2>
      <p className="mt-1 text-sm text-white/58">{passportNumber ?? "Impact Passport"}</p>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Donated", totalDonated],
          ["Coral units", coralCount.toLocaleString("en-US")],
          ["Field activity", String(fieldActivities)],
          ["Certificates", String(certificates)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white/8 p-3">
            <p className="text-lg font-bold">{value}</p>
            <p className="mt-1 text-xs font-semibold text-white/54">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-lg font-bold">Travel. Restore. Leave an Impact.</p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => void shareCard()} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-kelp-500 px-4 text-sm font-bold text-white hover:bg-kelp-700">
          <Share2 size={16} aria-hidden="true" /> Share card
        </button>
        <button type="button" onClick={downloadCard} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/18 px-4 text-sm font-bold text-white hover:bg-white/10">
          <Download size={16} aria-hidden="true" /> Save SVG
        </button>
      </div>
    </section>
  );
}
