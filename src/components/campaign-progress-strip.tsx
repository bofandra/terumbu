import { ProgressMeter } from "@/components/ui/progress-meter";
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

export function CampaignProgressStrip({ raised, goal, progress, donors, daysLeft, impactFunded, impactUnit }: CampaignProgressStripProps) {
  const remaining = Math.max(0, goal - raised);

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
        <ProgressMeter
          value={progress}
          label={`Campaign is ${progress} percent funded, with ${formatCurrency(raised)} raised toward ${formatCurrency(goal)}.`}
          className="h-3"
          trackClassName="bg-ocean-50"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-kelp-100/70 px-4 py-3 text-sm font-bold text-kelp-700">
        <span>{formatCurrency(raised)} recorded as paid donations</span>
        <span>{formatCurrency(remaining)} remaining</span>
      </div>
    </section>
  );
}
