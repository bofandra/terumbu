import { ProgressMeter } from "@/components/ui/progress-meter";
import { MetricValue } from "@/components/ui/metric-value";
import type { SupportedLocale } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";

type CampaignProgressStripProps = {
  raised: number;
  goal: number;
  progress: number;
  donors: number;
  daysLeft: number;
  impactFunded: number;
  impactUnit: string;
  currency: string;
  locale?: SupportedLocale;
};

export function CampaignProgressStrip({ raised, goal, progress, donors, daysLeft, impactFunded, impactUnit, currency, locale = "en" }: CampaignProgressStripProps) {
  const remaining = Math.max(0, goal - raised);
  const numberLocale = locale === "id" ? "id-ID" : "en-US";
  const labels =
    locale === "id"
      ? {
          aria: `Kampanye terdanai ${progress} persen`,
          raisedOf: "terkumpul dari target",
          funded: "terdanai",
          donors: "donatur",
          daysLeft: "hari lagi",
          impactFunded: `${impactUnit} terdanai`,
          progress: `Kampanye terdanai ${progress} persen, dengan ${formatCurrency(raised, currency)} terkumpul dari target ${formatCurrency(goal, currency)}.`,
          recorded: "tercatat sebagai donasi berbayar",
          remaining: "tersisa"
        }
      : {
          aria: `Campaign is ${progress} percent funded`,
          raisedOf: "raised of",
          funded: "funded",
          donors: "donors",
          daysLeft: "days left",
          impactFunded: `${impactUnit} funded`,
          progress: `Campaign is ${progress} percent funded, with ${formatCurrency(raised, currency)} raised toward ${formatCurrency(goal, currency)}.`,
          recorded: "recorded as paid donations",
          remaining: "remaining"
        };

  return (
    <section className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" aria-label={labels.aria}>
      <div className="grid gap-5 md:grid-cols-5">
        <div className="min-w-0">
          <MetricValue className="text-coral-700">{formatCurrency(raised, currency)}</MetricValue>
          <p className="mt-1 text-sm text-ocean-900/62">{labels.raisedOf} {formatCurrency(goal, currency)}</p>
        </div>
        {[
          [`${progress}%`, labels.funded],
          [donors.toLocaleString(numberLocale), labels.donors],
          [String(daysLeft), labels.daysLeft],
          [impactFunded.toLocaleString(numberLocale), labels.impactFunded]
        ].map(([value, label]) => (
          <div key={label} className="min-w-0 md:border-l md:border-ocean-900/10 md:pl-5">
            <MetricValue className="text-ocean-900">{value}</MetricValue>
            <p className="mt-1 text-sm text-ocean-900/62">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <ProgressMeter
          value={progress}
          label={labels.progress}
          className="h-3"
          trackClassName="bg-ocean-50"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-kelp-100/70 px-4 py-3 text-sm font-bold text-kelp-700">
        <span>{formatCurrency(raised, currency)} {labels.recorded}</span>
        <span>{formatCurrency(remaining, currency)} {labels.remaining}</span>
      </div>
    </section>
  );
}
