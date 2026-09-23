"use client";

import { Calculator, Info } from "lucide-react";
import { useMemo, useState } from "react";

import { MetricValue } from "@/components/ui/metric-value";
import { calculateDonationImpact, currencyMinorStep, formatImpactQuantity, minimumDonationAmount, type CampaignImpactLineInput } from "@/lib/impact-calculations";
import { formatCurrency } from "@/lib/utils";

type CampaignImpactCalculatorProps = {
  goal: number;
  impactTarget: number;
  impactUnit: string;
  impactUnitCost?: string | number | null;
  impactTargets?: CampaignImpactLineInput[] | null;
  currency: string;
  carbonKgPerUsd?: number | null;
};

export function CampaignImpactCalculator({ goal, impactTarget, impactUnit, impactUnitCost, impactTargets = null, currency, carbonKgPerUsd = null }: CampaignImpactCalculatorProps) {
  const step = currencyMinorStep(currency);
  const minimumAmount = minimumDonationAmount(currency);
  const defaultAmount = Math.max(minimumAmount, Math.round((Math.max(1, goal) * 0.001) / step) * step);
  const [amount, setAmount] = useState(defaultAmount);
  const outputs = useMemo(() => {
    const impact = calculateDonationImpact({
      amount,
      currency,
      campaign: {
        goalAmount: goal,
        impactTarget,
        impactUnit,
        impactUnitCost,
        impactTargets
      },
      carbonKgPerUsd
    });
    const goalShare = goal > 0 ? Math.min(100, (amount / goal) * 100) : 0;
    const directOutputs = impact.impactBreakdown
      .filter((line) => line.unitCount > 0)
      .slice(0, 4)
      .map((line) => [`${formatImpactQuantity(line.unitCount)} ${line.unit}`, line.label]);
    const hasCarbonLine = impact.impactBreakdown.some((line) => line.impactType === "carbon" && line.unitCount > 0);

    return [
      ...(directOutputs.length > 0 ? directOutputs : [[`${formatImpactQuantity(impact.impactUnitCount)} ${impact.impactUnit}`, "Estimated direct restoration output"]]),
      ...(hasCarbonLine ? [] : [[impact.carbonKg == null ? "Pending" : `${formatImpactQuantity(impact.carbonKg)} kg CO2e`, "Carbon calculation from global USD formula"]]),
      [`${goalShare.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`, "Share of campaign funding goal"]
    ];
  }, [amount, carbonKgPerUsd, currency, goal, impactTarget, impactTargets, impactUnit, impactUnitCost]);

  return (
    <section id="impact-calculator" className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-coral-100 text-coral-700">
          <Calculator size={23} aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact calculator</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">See What Your Contribution Can Do</h2>
          <p className="mt-2 text-sm leading-6 text-ocean-900/64">
            Estimate outputs using campaign goal and target assumptions. Final impact depends on field conditions and verified reports.
          </p>
        </div>
      </div>

      <label className="mt-6 grid gap-3 text-sm font-bold text-ocean-900">
        Contribution amount: <span className="min-w-0 break-words text-2xl text-coral-700 [overflow-wrap:anywhere]">{formatCurrency(amount, currency)}</span>
        <input
          type="range"
          min={minimumAmount}
          max={Math.max(minimumAmount * 5, Math.round(Math.max(goal * 0.01, minimumAmount) / step) * step)}
          step={step}
          value={amount}
          className="accent-coral-500"
          onChange={(event) => setAmount(Number(event.target.value))}
        />
      </label>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {outputs.map(([value, label]) => (
          <div key={value} className="min-w-0 rounded-xl bg-sand-50 p-4">
            <MetricValue className="text-ocean-900">{value}</MetricValue>
            <p className="mt-2 text-sm leading-6 text-ocean-900/62">{label}</p>
          </div>
        ))}
      </div>

      <details className="mt-5 rounded-xl border border-ocean-900/10 bg-ocean-50 p-4">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ocean-900">
          <Info size={17} aria-hidden="true" />
          How we calculate impact
        </summary>
        <p className="mt-3 text-sm leading-6 text-ocean-900/66">
          Estimates divide the campaign funding goal by the public impact target, then apply conservative planning ratios for monitoring and restoration area.
          Methodology should be reviewed with field teams whenever project budgets or survival assumptions change.
        </p>
      </details>
    </section>
  );
}
