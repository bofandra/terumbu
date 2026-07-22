import { Download, Heart, RotateCcw } from "lucide-react";
import Link from "next/link";

import { requestDonationRefundAction } from "@/lib/billing-actions";
import { requireUser } from "@/lib/auth";
import { getBillingData, getDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Donations"
};

export const dynamic = "force-dynamic";

type DashboardDonationsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

function statusClass(status: string) {
  if (status === "paid" || status === "active") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "failed" || status === "refunded" || status === "cancelled" || status === "expired") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-sand-100 text-ocean-900/70";
}

export default async function DashboardDonationsPage({ searchParams }: DashboardDonationsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard/donations");
  const [data, billing] = await Promise.all([getDashboardData(user.id), getBillingData(user.id)]);
  const donationError = "Could not complete that donation action.";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Donations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Contributions and manual payment verification</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Payments are made outside the website. Receipts and impact records appear after an admin verifies your uploaded payment proof.
        </p>
      </header>

      {params?.saved ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Donation request saved.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">{donationError}</p>
      ) : null}

      <section className="mt-6 grid gap-4">
        <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Donation history</h2>
        {data.donations.map((donation) => (
          <article key={donation.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="flex gap-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                  <Heart size={22} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-normal text-ocean-900">{donation.campaignTitle}</h2>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {donation.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </p>
                  {donation.receiptNumber ? (
                    <Link href={`/dashboard/donations/${donation.id}/receipt`} download className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-coral-700 hover:text-coral-500">
                      <Download size={14} aria-hidden="true" />
                      {donation.receiptNumber}
                    </Link>
                  ) : (
                    <p className="mt-3 text-sm text-ocean-900/62">
                      {donation.status === "pending" ? "Receipt pending admin verification" : "Receipt pending"}
                    </p>
                  )}
                </div>
              </div>
              <div className="md:text-right">
                <p className="font-bold text-ocean-900">{formatCurrency(Number(donation.amount))}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(donation.status)}`}>{donation.status}</span>
                {billing.pendingRefundDonationIds.has(donation.id) ? (
                  <p className="mt-3 rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ocean-900/70">Refund requested</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
                  {donation.status === "paid" && !billing.pendingRefundDonationIds.has(donation.id) ? (
                    <form action={requestDonationRefundAction}>
                      <input type="hidden" name="donationId" value={donation.id} />
                      <input type="hidden" name="reason" value="Requested from donation history" />
                      <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500" type="submit">
                        <RotateCcw size={14} aria-hidden="true" />
                        Request refund
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        ))}
        {data.donations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 shadow-soft">
            <Heart size={30} aria-hidden="true" className="text-coral-500" />
            <p className="mt-4 text-xl font-bold text-ocean-900">No donation records yet.</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ocean-900/62">
              Support a verified project and upload your payment proof to start your first manual verification record.
            </p>
            <Link href="/campaigns" className="mt-4 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
              Browse verified campaigns
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Payment operations</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Recent verification and refund requests</h2>
        <div className="mt-5 grid gap-3">
          {billing.operations.slice(0, 6).map((operation) => (
            <div key={operation.id} className="flex flex-col justify-between gap-2 rounded-xl border border-ocean-900/10 bg-sand-50 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold capitalize text-ocean-900">{operation.operationType.replaceAll("_", " ")}</p>
                <p className="mt-1 text-xs font-semibold text-ocean-900/56">
                  {operation.operationCode} · {operation.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass(operation.status)}`}>{operation.status}</span>
            </div>
          ))}
          {billing.operations.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">No payment operations yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
