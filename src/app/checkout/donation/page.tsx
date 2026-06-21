import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { createDonationAction } from "@/lib/checkout-actions";
import { suggestedDonationAmounts } from "@/lib/domain";
import { getDonationCheckoutOptions } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Donation Checkout"
};

export const dynamic = "force-dynamic";

type DonationCheckoutPageProps = {
  searchParams?: Promise<{
    campaign?: string;
    amount?: string;
    error?: string;
  }>;
};

export default async function DonationCheckoutPage({ searchParams }: DonationCheckoutPageProps) {
  const params = await searchParams;
  const [campaigns, user] = await Promise.all([getDonationCheckoutOptions(), getSessionUser()]);
  const selectedCampaign = params?.campaign ?? campaigns[0]?.slug;
  const selectedCampaignData = campaigns.find((campaign) => campaign.slug === selectedCampaign) ?? campaigns[0];
  const donationAmounts = selectedCampaignData ? suggestedDonationAmounts(selectedCampaignData.goal) : [];
  const requestedAmount = Number(params?.amount ?? "");
  const selectedAmount = donationAmounts.includes(requestedAmount) ? requestedAmount : donationAmounts[0];

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Checkout</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Complete your donation</h1>
        <p className="mt-3 text-ocean-900/68">
          Demo gateway checkout creates donation, payment, receipt, email log, and dashboard records.
        </p>
        {params?.error ? (
          <p className="mt-4 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            Check the campaign, amount, name, and email before continuing.
          </p>
        ) : null}
        <form action={createDonationAction} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Campaign
            <select name="campaignSlug" defaultValue={selectedCampaign} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500">
              {campaigns.map((campaign) => (
                <option key={campaign.slug} value={campaign.slug}>
                  {campaign.title}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Donation amount
            <select name="amount" defaultValue={selectedAmount} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500">
              {donationAmounts.map((amount) => (
                <option key={amount} value={amount}>
                  {formatCurrency(amount)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Custom amount
            <input
              name="customAmount"
              inputMode="numeric"
              placeholder="Leave blank to use selected amount"
              className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Name
            <input name="donorName" defaultValue={user?.displayName ?? user?.name ?? ""} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Email
            <input name="donorEmail" type="email" defaultValue={user?.email ?? ""} className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Message
            <textarea name="message" className="min-h-24 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ocean-900">
            Demo payment result
            <select name="paymentState" defaultValue="paid" className="rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500">
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <Button type="submit">Continue to Payment</Button>
        </form>
      </section>
    </main>
  );
}
