import { Award, Leaf, MapPinned, Waves } from "lucide-react";
import Link from "next/link";

import type { PassportPreviewData } from "@/lib/domain";

const iconByLabel = {
  Donations: Leaf,
  Corals: Waves,
  "Field activities": MapPinned,
  Certificates: Award
};

type PassportPreviewProps = {
  passport: PassportPreviewData;
};

export function PassportPreview({ passport }: PassportPreviewProps) {
  const progress = Math.min(100, Math.round((passport.xp / passport.xpTarget) * 100));

  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <div className="rounded-2xl bg-ocean-900 p-6 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Impact Passport</p>
        <div className="mt-8 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-coral-500 text-xl font-bold">
            {passport.initials}
          </div>
          <div>
            <h3 className="text-2xl font-bold tracking-normal">{passport.displayName}</h3>
            <p className="mt-1 text-sm text-white/68">{passport.levelLabel}</p>
          </div>
        </div>
        <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/14">
          <div className="h-full rounded-full bg-coral-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm text-white/72">
          {passport.xp.toLocaleString("id-ID")} / {passport.xpTarget.toLocaleString("id-ID")} XP to Ocean Champion
        </p>
        <Link href={passport.href} className="mt-5 inline-flex text-sm font-bold text-coral-100 hover:text-white">
          {passport.ctaLabel ?? "View public passport"}
        </Link>
      </div>

      <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2">
          {passport.stats.map((item) => {
            const Icon = iconByLabel[item.label as keyof typeof iconByLabel] ?? Leaf;

            return (
              <div key={item.label} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <Icon className="text-coral-500" size={22} aria-hidden="true" />
                <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
                <p className="mt-1 text-sm font-medium text-ocean-900/62">{item.label}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-ocean-900/20 p-4">
          <p className="font-bold text-ocean-900">{passport.latestActivity?.title ?? "Latest verified activity"}</p>
          <p className="mt-2 text-sm leading-6 text-ocean-900/68">
            {passport.latestActivity?.description ?? "Verified activity will appear here after the first donation, lesson, or expedition."}
          </p>
        </div>
      </div>
    </div>
  );
}
