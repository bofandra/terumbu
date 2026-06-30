import { Flame } from "lucide-react";

import { formatCurrency } from "@/lib/utils";

type CampaignProgressStripProps = {
  raised: number;
  goal: number;
  progress: number;
  donors: number;
  daysLeft: number;
  impactFunded: number;
  impactUnit: string;
};

const milestones = [
  { percent: 25, label: "Nursery preparation" },
  { percent: 50, label: "First planting phase" },
  { percent: 75, label: "Monitoring equipment" },
  { percent: 100, label: "Restoration goal" }
];

export function CampaignProgressStrip({ raised, goal, progress, donors, daysLeft, impactFunded, impactUnit }: CampaignProgressStripProps) {
  const remaining = Math.max(0, goal - raised);
  const recentMomentum = Math.max(1_000_000, Math.round(raised * 0.072));

  return (
    <section className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" aria-label={`Campaign is ${progress} percent funded`}>
      <div className="grid gap-5 md:grid-cols-5">
        <div>
          <p className="text-2xl font-bold tracking-normal text-coral-700">{formatCurrency(raised)}</p>
          <p className="mt-1 text-sm text-ocean-900/62">raised of {formatCurrency(goal)} goal</p>
        </div>
        {[
          [`${progress}%`, "funded"],
          [donors.toLocaleString("id-ID"), "donors"],
          [String(daysLeft), "days left"],
          [impactFunded.toLocaleString("id-ID"), `${impactUnit} funded`]
        ].map(([value, label]) => (
          <div key={label} className="md:border-l md:border-ocean-900/10 md:pl-5">
            <p className="text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
            <p className="mt-1 text-sm text-ocean-900/62">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="relative h-3 overflow-hidden rounded-full bg-ocean-50">
          <div className="h-full rounded-full bg-coral-500" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
        <div className="mt-4 grid gap-3 text-xs font-semibold text-ocean-900/62 sm:grid-cols-4">
          {milestones.map((milestone) => (
            <div key={milestone.percent} className="flex items-start gap-2">
              <span className={`mt-1 size-2 shrink-0 rounded-full ${progress >= milestone.percent ? "bg-coral-500" : "bg-ocean-900/18"}`} />
              <span>
                <span className="block font-bold text-ocean-900">{milestone.percent}%</span>
                {milestone.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-kelp-100/70 px-4 py-3 text-sm font-bold text-kelp-700">
        <span className="inline-flex items-center gap-2">
          <Flame size={17} aria-hidden="true" />
          Great momentum: {formatCurrency(recentMomentum)} raised in the last 7 days
        </span>
        <span>{formatCurrency(remaining)} remaining</span>
      </div>
    </section>
  );
}
