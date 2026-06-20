import { Award, CalendarDays, Heart, MapPinned, Waves } from "lucide-react";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { PassportPreview } from "@/components/passport-preview";

const summary = [
  { label: "Total donated", value: "Rp3.2M", icon: Heart },
  { label: "Corals sponsored", value: "25", icon: Waves },
  { label: "Field activities", value: "3", icon: MapPinned },
  { label: "Certificates", value: "4", icon: Award }
];

export const metadata = {
  title: "Dashboard"
};

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-ocean-900 p-6 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Good morning, Raka</p>
        <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">Your ocean impact continues to grow.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              This dashboard will connect donations, sponsored corals, expeditions, courses, and verified evidence from PostgreSQL.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-sm text-white/68">Next expedition</p>
            <p className="mt-1 flex items-center gap-2 font-bold">
              <CalendarDays size={18} aria-hidden="true" />
              Raja Ampat, Oct 2026
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon className="text-coral-500" size={22} aria-hidden="true" />
              <p className="mt-4 text-2xl font-bold tracking-normal text-ocean-900">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ImpactMapPreview />
        <PassportPreview />
      </section>
    </main>
  );
}

