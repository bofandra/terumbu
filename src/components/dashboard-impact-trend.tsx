"use client";

import { useMemo, useState } from "react";

import { cn, formatCurrency } from "@/lib/utils";

type TrendPoint = {
  label: string;
  contributions: number;
  corals: number;
  activities: number;
  learning: number;
};

type TrendMetric = "contributions" | "corals" | "activities" | "learning";

const metricLabels: Record<TrendMetric, string> = {
  contributions: "Contributions",
  corals: "Corals",
  activities: "Activities",
  learning: "Learning"
};

const metricDescriptions: Record<TrendMetric, string> = {
  contributions: "Monthly conservation contributions",
  corals: "Sponsored restoration units tracked",
  activities: "Bookings and field activity",
  learning: "Courses and certificates completed"
};

const ranges = ["6 months", "1 year", "All time"];

function formatMetricValue(metric: TrendMetric, value: number) {
  return metric === "contributions" ? formatCurrency(value) : value.toLocaleString("id-ID");
}

export function DashboardImpactTrend({ trend }: { trend: TrendPoint[] }) {
  const [metric, setMetric] = useState<TrendMetric>("contributions");
  const [range, setRange] = useState(ranges[0]);
  const maxValue = useMemo(() => Math.max(1, ...trend.map((point) => point[metric])), [metric, trend]);
  const latest = trend.at(-1)?.[metric] ?? 0;
  const previous = trend.at(-2)?.[metric] ?? 0;
  const delta = latest - previous;

  return (
    <section className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" aria-labelledby="dashboard-trend-title">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Impact trend</p>
          <h2 id="dashboard-trend-title" className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">
            Momentum over time
          </h2>
          <p className="mt-1 text-sm leading-6 text-ocean-900/60">{metricDescriptions[metric]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "min-h-10 rounded-full px-4 text-sm font-bold transition",
                range === item ? "bg-ocean-900 text-white" : "bg-ocean-50 text-ocean-900 hover:bg-ocean-100"
              )}
              onClick={() => setRange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Impact trend metric">
        {(Object.keys(metricLabels) as TrendMetric[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={metric === item}
            className={cn(
              "min-h-10 rounded-full px-4 text-sm font-bold transition",
              metric === item ? "bg-coral-500 text-white" : "bg-sand-50 text-ocean-900 hover:bg-coral-100"
            )}
            onClick={() => setMetric(item)}
          >
            {metricLabels[item]}
          </button>
        ))}
      </div>

      <div className="mt-6" role="img" aria-label={`${metricLabels[metric]} trend for ${range}. Latest value ${formatMetricValue(metric, latest)}.`}>
        <div className="flex h-48 items-end gap-3 border-b border-ocean-900/10 pb-2">
          {trend.map((point) => {
            const value = point[metric];
            const height = Math.max(8, (value / maxValue) * 100);

            return (
              <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-36 w-full items-end">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-ocean-700 to-coral-400"
                    style={{ height: `${height}%` }}
                    title={`${point.label}: ${formatMetricValue(metric, value)}`}
                  />
                </div>
                <span className="text-xs font-bold text-ocean-900/54">{point.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-ocean-900/64">
        {delta >= 0 ? "Up" : "Down"} {formatMetricValue(metric, Math.abs(delta))} from last month.
      </p>
    </section>
  );
}
