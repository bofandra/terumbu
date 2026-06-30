import { CircleDollarSign, Sprout, Users, Waves } from "lucide-react";

import type { ImpactStatData } from "@/lib/domain";

const toneClass: Record<ImpactStatData["tone"], string> = {
  coral: "border-coral-300 bg-coral-100/70 text-coral-700",
  kelp: "border-kelp-100 bg-kelp-100/80 text-kelp-700",
  ocean: "border-ocean-100 bg-ocean-50 text-ocean-700",
  sand: "border-sand-100 bg-sand-100 text-ocean-900"
};

const toneIcon = {
  coral: Waves,
  kelp: Sprout,
  ocean: Users,
  sand: CircleDollarSign
};

type StatStripProps = {
  stats: ImpactStatData[];
};

export function StatStrip({ stats }: StatStripProps) {
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/92 p-3 shadow-soft backdrop-blur md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = toneIcon[stat.tone];

          return (
            <div key={stat.label} className={`flex items-center gap-4 rounded-xl border px-4 py-5 ${toneClass[stat.tone]}`}>
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm">
                <Icon size={24} aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-bold tracking-normal">{stat.value}</p>
                <p className="mt-1 text-sm font-medium opacity-80">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
