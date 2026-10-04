"use client";

import { useMemo, useState } from "react";

import type { SupportedLocale } from "@/lib/user-preferences";
import { cn, formatCurrency } from "@/lib/utils";

type TrendPoint = {
  label: string;
  contributions: number;
  corals: number;
  activities: number;
  learning: number;
};

type TrendMetric = "contributions" | "corals" | "activities" | "learning";

function formatMetricValue(metric: TrendMetric, value: number, locale: SupportedLocale) {
  return metric === "contributions" ? formatCurrency(value) : value.toLocaleString(locale === "id" ? "id-ID" : "en-US");
}

export function DashboardImpactTrend({ trend, locale = "en" }: { trend: TrendPoint[]; locale?: SupportedLocale }) {
  const labels =
    locale === "id"
      ? {
          metrics: {
            contributions: "Kontribusi",
            corals: "Restorasi",
            activities: "Aktivitas",
            learning: "Pembelajaran"
          } as Record<TrendMetric, string>,
          descriptions: {
            contributions: "Kontribusi konservasi per bulan",
            corals: "Unit restorasi sponsorship yang terlacak",
            activities: "Booking dan aktivitas lapangan",
            learning: "Kursus dan sertifikat yang selesai"
          } as Record<TrendMetric, string>,
          ranges: [
            { value: "6m", label: "6 bulan" },
            { value: "1y", label: "1 tahun" },
            { value: "all", label: "Semua" }
          ],
          eyebrow: "Tren dampak",
          title: "Perkembangan dari waktu ke waktu",
          metricAria: "Metrik tren dampak",
          trend: "tren",
          latest: "Nilai terbaru",
          up: "Naik",
          down: "Turun",
          fromLastMonth: "dari bulan lalu"
        }
      : {
          metrics: {
            contributions: "Contributions",
            corals: "Restoration",
            activities: "Activities",
            learning: "Learning"
          } as Record<TrendMetric, string>,
          descriptions: {
            contributions: "Monthly conservation contributions",
            corals: "Sponsored restoration units tracked",
            activities: "Bookings and field activity",
            learning: "Courses and certificates completed"
          } as Record<TrendMetric, string>,
          ranges: [
            { value: "6m", label: "6 months" },
            { value: "1y", label: "1 year" },
            { value: "all", label: "All time" }
          ],
          eyebrow: "Impact trend",
          title: "Momentum over time",
          metricAria: "Impact trend metric",
          trend: "trend",
          latest: "Latest value",
          up: "Up",
          down: "Down",
          fromLastMonth: "from last month"
        };
  const [metric, setMetric] = useState<TrendMetric>("contributions");
  const [range, setRange] = useState(labels.ranges[0].value);
  const maxValue = useMemo(() => Math.max(1, ...trend.map((point) => point[metric])), [metric, trend]);
  const latest = trend.at(-1)?.[metric] ?? 0;
  const previous = trend.at(-2)?.[metric] ?? 0;
  const delta = latest - previous;

  return (
    <section className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft" aria-labelledby="dashboard-trend-title">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">{labels.eyebrow}</p>
          <h2 id="dashboard-trend-title" className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">
            {labels.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-ocean-900/60">{labels.descriptions[metric]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {labels.ranges.map((item) => (
            <button
              key={item.value}
              type="button"
              className={cn(
                "min-h-10 rounded-full px-4 text-sm font-bold transition",
                range === item.value ? "bg-ocean-900 text-white" : "bg-ocean-50 text-ocean-900 hover:bg-ocean-100"
              )}
              onClick={() => setRange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label={labels.metricAria}>
        {(Object.keys(labels.metrics) as TrendMetric[]).map((item) => (
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
            {labels.metrics[item]}
          </button>
        ))}
      </div>

      <div className="mt-6" role="img" aria-label={`${labels.metrics[metric]} ${labels.trend}. ${labels.latest} ${formatMetricValue(metric, latest, locale)}.`}>
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
                    title={`${point.label}: ${formatMetricValue(metric, value, locale)}`}
                  />
                </div>
                <span className="text-xs font-bold text-ocean-900/54">{point.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold text-ocean-900/64">
        {delta >= 0 ? labels.up : labels.down} {formatMetricValue(metric, Math.abs(delta), locale)} {labels.fromLastMonth}.
      </p>
    </section>
  );
}
