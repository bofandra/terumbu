import { BookmarkX, Download, Heart } from "lucide-react";
import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { requestDonationRefundAction } from "@/lib/billing-actions";
import { getBillingData, getCampaignCards, getDashboardData } from "@/lib/queries";
import { removeSavedCampaignAction } from "@/lib/retention-actions";
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
  const [data, billing, highlightedCampaigns] = await Promise.all([getDashboardData(user.id), getBillingData(user.id), getCampaignCards(3)]);
  const donationError = "Could not complete that donation action.";
  const verificationOperations = billing.operations.filter((operation) => !operation.operationType.includes("refund")).slice(0, 6);

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

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Donate to a project</h2>
            <p className="mt-1 text-sm font-semibold text-ocean-900/58">Choose one of the latest verified campaigns and continue to donation.</p>
          </div>
          <ButtonLink href="/campaigns" tone="secondary">
            Browse all
          </ButtonLink>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {highlightedCampaigns.map((campaign) => (
            <CampaignCard key={campaign.slug} campaign={campaign} />
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <div>
          <h2 className="text-2xl font-bold tracking-normal text-ocean-900">Saved campaigns</h2>
          <p className="mt-1 text-sm font-semibold text-ocean-900/58">
            {data.savedCampaigns.length.toLocaleString("id-ID")} saved campaign{data.savedCampaigns.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {data.savedCampaigns.map((campaign) => (
            <article key={campaign.slug} className="grid gap-3">
              <CampaignCard campaign={campaign} />
              <form action={removeSavedCampaignAction}>
                <input type="hidden" name="campaignSlug" value={campaign.slug} />
                <input type="hidden" name="next" value="/dashboard/donations" />
                <Button type="submit" tone="light" className="w-full">
                  <BookmarkX size={16} aria-hidden="true" />
                  Remove saved campaign
                </Button>
              </form>
            </article>
          ))}
        </div>
        {data.savedCampaigns.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4 text-sm font-semibold text-ocean-900/62">
            Save campaigns from a campaign detail page and they will appear here, even after a campaign expires.
          </p>
        ) : null}
      </section>

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
                <p className="font-bold text-ocean-900">{formatCurrency(Number(donation.amount), donation.currency)}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(donation.status)}`}>{donation.status}</span>
                {donation.status === "paid" ? (
                  <details className="relative mt-3">
                    <summary className="inline-flex min-h-9 cursor-pointer list-none items-center rounded-full border border-coral-500/30 px-3 text-xs font-bold text-coral-700 hover:border-coral-500">
                      Request refund
                    </summary>
                    <form action={requestDonationRefundAction} className="absolute right-0 z-20 mt-2 grid w-72 gap-2 rounded-xl border border-ocean-900/10 bg-white p-3 text-left shadow-soft">
                      <input type="hidden" name="donationId" value={donation.id} />
                      <label className="grid gap-1 text-xs font-bold text-ocean-900">
                        Reason
                        <textarea name="reason" className="min-h-20 rounded-lg border border-ocean-900/14 px-3 py-2 text-sm font-semibold" placeholder="Tell us why you need a refund." required />
                      </label>
                      <Button type="submit" tone="secondary">Submit refund request</Button>
                    </form>
                  </details>
                ) : null}
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
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Payment verification</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Recent verification activity</h2>
        <div className="mt-5 grid gap-3">
          {verificationOperations.map((operation) => (
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
          {verificationOperations.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">No payment verification activity yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
