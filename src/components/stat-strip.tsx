import { CircleDollarSign, Sprout, Users, Waves } from "lucide-react";

import { MetricValue } from "@/components/ui/metric-value";
import type { ImpactStatData } from "@/lib/domain";
import { cn } from "@/lib/utils";

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
  editorial?: boolean;
};

export function StatStrip({ stats, editorial = false }: StatStripProps) {
  return (
    <section className="relative z-10 mx-auto -mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className={cn(
        "grid gap-3 rounded-2xl border border-white/70 p-3 shadow-soft backdrop-blur",
        editorial ? "grid-cols-2 bg-white/95 md:grid-cols-3 xl:grid-cols-6" : "bg-white/92 md:grid-cols-2 lg:grid-cols-3"
      )}>
        {stats.map((stat) => {
          const Icon = toneIcon[stat.tone];

          return (
            <div key={stat.label} className={cn(
              "flex min-w-0 rounded-xl border",
              toneClass[stat.tone],
              editorial ? "flex-col gap-2 p-2.5 sm:flex-row sm:items-center" : "items-center gap-4 px-4 py-5"
            )}>
              <span className={cn("flex shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm", editorial ? "size-8" : "size-12")}>
                <Icon size={editorial ? 17 : 24} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <MetricValue className={editorial ? "text-xl leading-tight [font-family:var(--public-display)]" : undefined}>{stat.value}</MetricValue>
                <p className={cn("mt-1 font-medium opacity-80", editorial ? "text-xs leading-tight" : "text-sm")}>{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
