import { Waves } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Corals"
};

export const dynamic = "force-dynamic";

export default async function DashboardCoralsPage() {
  const user = await requireUser("/dashboard/corals");
  const data = await getDashboardData(user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Corals</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Sponsored ecosystems</h1>
      </header>

      <section className="mt-6 grid gap-4">
        {data.ecosystems.map((ecosystem) => (
          <article key={ecosystem.code} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                <Waves size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-normal text-ocean-900">{ecosystem.label}</h2>
                <p className="mt-1 text-sm text-ocean-900/62">{ecosystem.campaignTitle}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ocean-900/62">
                  <span className="rounded-full bg-sand-50 px-3 py-1">{ecosystem.code}</span>
                  <span className="rounded-full bg-kelp-100 px-3 py-1 text-kelp-700">{ecosystem.status}</span>
                  <span className="rounded-full bg-ocean-50 px-3 py-1">{ecosystem.siteName ?? "Site pending"}</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
