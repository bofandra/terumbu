import { Award, Leaf, MapPinned, Waves } from "lucide-react";
import Link from "next/link";

import { MetricValue } from "@/components/ui/metric-value";
import { ProgressMeter } from "@/components/ui/progress-meter";
import type { PassportPreviewData } from "@/lib/domain";
import type { SupportedLocale } from "@/lib/user-preferences";

const iconByLabel = {
  Donations: Leaf,
  Corals: Waves,
  "Field activities": MapPinned,
  Certificates: Award
};

type PassportPreviewProps = {
  passport: PassportPreviewData;
  locale?: SupportedLocale;
};

export function PassportPreview({ passport, locale = "en" }: PassportPreviewProps) {
  const progress = Math.min(100, Math.round((passport.xp / passport.xpTarget) * 100));
  const numberLocale = locale === "id" ? "id-ID" : "en-US";
  const labels =
    locale === "id"
      ? {
          passport: "Impact Passport",
          xpToChampion: "XP menuju Ocean Champion",
          viewPublic: "Lihat passport publik",
          latest: "Catatan terbaru di passport",
          latestEmpty: "Catatan passport akan muncul setelah donasi, pembelajaran, atau ekspedisi pertama.",
          disclosure: "Impact Passport merangkum aktivitas dan catatan yang memenuhi syarat. Outcome kampanye tetap ditampilkan sebagai outcome kampanye, bukan atribusi personal langsung.",
          progressAria: "progres XP",
          statLabels: {
            Donations: "Donasi",
            Corals: "Restorasi",
            "Field activities": "Aktivitas lapangan",
            Certificates: "Sertifikat"
          } as Record<string, string>
        }
      : {
          passport: "Impact Passport",
          xpToChampion: "XP to Ocean Champion",
          viewPublic: "View public passport",
          latest: "Latest passport record",
          latestEmpty: "Passport records will appear here after the first donation, lesson, or expedition.",
          disclosure: "Impact Passport summarizes eligible activity and records. Campaign outcomes remain campaign outcomes, not direct personal attribution.",
          progressAria: "XP progress",
          statLabels: {} as Record<string, string>
        };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-2xl bg-ocean-900 p-6 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">{labels.passport}</p>
        <div className="mt-8 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-coral-500 text-xl font-bold">
            {passport.initials}
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-normal">{passport.displayName}</h3>
            <p className="mt-1 text-sm text-white/68">{passport.levelLabel}</p>
          </div>
        </div>
        <ProgressMeter value={progress} label={`${passport.displayName} ${labels.progressAria}`} className="mt-8 h-3" trackClassName="bg-white/14" />
        <p className="mt-3 text-sm text-white/72">
          {passport.xp.toLocaleString(numberLocale)} / {passport.xpTarget.toLocaleString(numberLocale)} {labels.xpToChampion}
        </p>
        <Link href={passport.href} className="mt-5 inline-flex text-sm font-bold text-coral-100 hover:text-white">
          {passport.ctaLabel ?? labels.viewPublic}
        </Link>
      </div>

      <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2">
          {passport.stats.map((item) => {
            const Icon = iconByLabel[item.label as keyof typeof iconByLabel] ?? Leaf;

            return (
              <div key={item.label} className="min-w-0 rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <Icon className="text-coral-500" size={22} aria-hidden="true" />
                <MetricValue className="mt-4 text-ocean-900">{item.value}</MetricValue>
                <p className="mt-1 text-sm font-medium text-ocean-900/62">{labels.statLabels[item.label] ?? item.label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-ocean-900/20 p-4">
          <p className="font-bold text-ocean-900">{passport.latestActivity?.title ?? labels.latest}</p>
          <p className="mt-2 text-sm leading-6 text-ocean-900/68">
            {passport.latestActivity?.description ?? labels.latestEmpty}
          </p>
          <p className="mt-3 border-t border-ocean-900/10 pt-3 text-xs leading-5 text-ocean-900/52">{labels.disclosure}</p>
        </div>
      </div>
    </div>
  );
}
