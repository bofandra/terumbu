"use client";

import { Calculator, Info } from "lucide-react";
import { useMemo, useState } from "react";

import { formatCurrency } from "@/lib/utils";

type CampaignImpactCalculatorProps = {
  goal: number;
  impactTarget: number;
  impactUnit: string;
};

export function CampaignImpactCalculator({ goal, impactTarget, impactUnit }: CampaignImpactCalculatorProps) {
  const defaultAmount = Math.max(50_000, Math.round(Math.max(1, goal) * 0.001 / 50_000) * 50_000);
  const [amount, setAmount] = useState(defaultAmount);
  const costPerUnit = goal > 0 && impactTarget > 0 ? goal / impactTarget : 50_000;
  const outputs = useMemo(() => {
    const units = Math.max(1, Math.round(amount / costPerUnit));
    const goalShare = goal > 0 ? Math.min(100, (amount / goal) * 100) : 0;

    return [
      [`${units.toLocaleString("id-ID")} ${impactUnit}`, "Estimated direct restoration output"],
      [formatCurrency(costPerUnit), `Recorded campaign cost per ${impactUnit}`],
      [`${goalShare.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`, "Share of campaign funding goal"]
    ];
  }, [amount, costPerUnit, goal, impactUnit]);

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
        Contribution amount: <span className="text-2xl text-coral-700">{formatCurrency(amount)}</span>
        <input
          type="range"
          min={50_000}
          max={5_000_000}
          step={50_000}
          value={amount}
          className="accent-coral-500"
          onChange={(event) => setAmount(Number(event.target.value))}
        />
      </label>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {outputs.map(([value, label]) => (
          <div key={value} className="rounded-xl bg-sand-50 p-4">
            <p className="text-xl font-bold tracking-normal text-ocean-900">{value}</p>
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
