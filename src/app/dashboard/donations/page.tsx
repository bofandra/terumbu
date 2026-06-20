import { Heart } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Donations"
};

export const dynamic = "force-dynamic";

export default async function DashboardDonationsPage() {
  const user = await requireUser("/dashboard/donations");
  const data = await getDashboardData(user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Donations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Donation history</h1>
      </header>

      <section className="mt-6 grid gap-4">
        {data.donations.map((donation) => (
          <article key={donation.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                  <Heart size={22} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-normal text-ocean-900">{donation.campaignTitle}</h2>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {donation.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                  <p className="mt-3 text-sm text-ocean-900/62">{donation.receiptNumber ?? "Receipt pending"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-ocean-900">{formatCurrency(Number(donation.amount))}</p>
                <span className="mt-2 inline-flex rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">{donation.status}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
