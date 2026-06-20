import { AlertTriangle, Building2, Download, Leaf, TrendingUp, Users } from "lucide-react";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { Button } from "@/components/ui/button";

const metrics = [
  { label: "Program budget used", value: "68%", icon: TrendingUp },
  { label: "Employees engaged", value: "342", icon: Users },
  { label: "Verified outputs", value: "42", icon: Leaf },
  { label: "At-risk projects", value: "2", icon: AlertTriangle }
];

export const metadata = {
  title: "Corporate Dashboard"
};

export default function CorporateDashboardPage() {
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-5 border-b border-ocean-900/10 pb-6 lg:flex-row lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-coral-700">
            <Building2 size={18} aria-hidden="true" />
            Nusantara Bank
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900 sm:text-4xl">
            Ocean Impact Program 2026
          </h1>
          <p className="mt-2 text-ocean-900/62">January to June 2026 reporting period</p>
        </div>
        <Button type="button" tone="secondary">
          <Download size={18} aria-hidden="true" />
          Export Report
        </Button>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {metrics.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <Icon className="text-coral-500" size={22} aria-hidden="true" />
              <p className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">{item.value}</p>
              <p className="mt-1 text-sm font-semibold text-ocean-900/58">{item.label}</p>
            </div>
          );
        })}
      </section>

      <section className="mt-6">
        <ImpactMapPreview />
      </section>
    </main>
  );
}

