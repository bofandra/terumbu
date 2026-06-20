import { Award, Heart, MapPinned, Waves } from "lucide-react";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { PassportPreview } from "@/components/passport-preview";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getImpactMapSites } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "My Impact"
};

export const dynamic = "force-dynamic";

export default async function DashboardImpactPage() {
  const user = await requireUser("/dashboard/impact");
  const [data, impactSites] = await Promise.all([getDashboardData(user.id), getImpactMapSites()]);
  const summary = [
    { label: "Total donated", value: formatCurrency(data.summary.totalDonated), icon: Heart },
    { label: "Corals sponsored", value: data.summary.coralFragments.toLocaleString("id-ID"), icon: Waves },
    { label: "Field activities", value: String(data.summary.fieldActivities), icon: MapPinned },
    { label: "Certificates", value: String(data.summary.certificates), icon: Award }
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">My Impact</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Your conservation footprint</h1>
      </header>

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
        <ImpactMapPreview sites={impactSites} />
        {data.passportPreview ? <PassportPreview passport={data.passportPreview} /> : null}
      </section>
    </main>
  );
}
