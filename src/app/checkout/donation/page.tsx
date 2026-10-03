import { randomBytes } from "node:crypto";

import { DonationAmountFields } from "@/components/donation-amount-fields";
import { Button, ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { createDonationAction } from "@/lib/checkout-actions";
import { normalizeDonationContributionIntent, parseDonationAmount } from "@/lib/checkout";
import { suggestedDonationAmounts } from "@/lib/domain";
import { getDonationPaymentInstructions } from "@/lib/donation-payment-instructions";
import { getDonationCheckoutOptions } from "@/lib/queries";

export const metadata = {
  title: "Donation Checkout"
};

export const dynamic = "force-dynamic";

type DonationCheckoutPageProps = {
  searchParams?: Promise<{
    campaign?: string;
    amount?: string;
    intent?: string;
    error?: string;
  }>;
};

export default async function DonationCheckoutPage({ searchParams }: DonationCheckoutPageProps) {
  const params = await searchParams;
  const [campaigns, user, paymentInstructions] = await Promise.all([
    getDonationCheckoutOptions(),
    getSessionUser(),
    getDonationPaymentInstructions()
  ]);
  const selectedCampaign = params?.campaign ?? campaigns[0]?.slug;
  const selectedCampaignData = campaigns.find((campaign) => campaign.slug === selectedCampaign) ?? campaigns[0];
  const selectedCurrency = selectedCampaignData?.currency ?? "USD";
  const donationAmounts = selectedCampaignData ? suggestedDonationAmounts(selectedCampaignData.goal, selectedCurrency) : [];
  const requestedAmount = parseDonationAmount(params?.amount);
  const hasRequestedPresetAmount = donationAmounts.includes(requestedAmount);
  const selectedAmount = hasRequestedPresetAmount ? requestedAmount : donationAmounts[0] ?? 0;
  const customAmount = requestedAmount > 0 && !hasRequestedPresetAmount ? requestedAmount : "";
  const contributionIntent = normalizeDonationContributionIntent(params?.intent);
  const idempotencyKey = `donation-${randomBytes(12).toString("hex")}`;
  const errorMessage =
    params?.error === "payment_proof"
      ? "Upload bukti pembayaran berupa JPG, PNG, WebP, atau GIF dengan ukuran maksimal 1.5 MB."
      : params?.error === "campaign"
        ? "Choose an active campaign before continuing."
        : "Check the campaign, amount, name, email, and payment proof before continuing.";

  if (campaigns.length === 0) {
    return (
      <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Checkout unavailable</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">No active campaigns are ready for donation.</h1>
          <p className="mt-3 text-sm leading-6 text-ocean-900/62">
            Published campaigns will appear here after partner details, impact targets, and verification records are ready.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/campaigns">View campaigns</ButtonLink>
            <ButtonLink href="/impact-map" tone="secondary">Explore impact map</ButtonLink>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Checkout</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Complete your donation</h1>
        <p className="mt-3 text-ocean-900/68">
          Lakukan pembayaran melalui kanal resmi Terumbu.eco di luar website, lalu unggah bukti pembayaran untuk diverifikasi admin.
        </p>
        {params?.error ? (
          <p className="mt-4 rounded-xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-semibold text-coral-700">
            {errorMessage}
          </p>
        ) : null}
        <form action={createDonationAction} className="mt-6 grid min-w-0 gap-4">
          <input type="hidden" name="intent" value={contributionIntent} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
          {contributionIntent !== "one-time" ? (
            <p className="rounded-xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-semibold text-kelp-700">
              Coral sponsorship creates a sponsored ecosystem record after admin verifies your payment proof.
            </p>
          ) : null}
          <input type="hidden" name="campaignSlug" value={selectedCampaignData?.slug ?? selectedCampaign ?? ""} />
          <div className="grid gap-2 text-sm font-semibold text-ocean-900">
            <span>Campaign</span>
            <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-ocean-900/14 bg-sand-50 px-4 py-3">
              <span className="min-w-0 break-words font-bold text-ocean-900 [overflow-wrap:anywhere]">
                {selectedCampaignData?.title ?? "Selected campaign"}
              </span>
              <ButtonLink href="/campaigns" tone="ghost" className="min-h-9 shrink-0 px-3 py-1.5 text-xs">
                Change
              </ButtonLink>
            </div>
          </div>
          <DonationAmountFields amounts={donationAmounts} defaultAmount={selectedAmount} currency={selectedCurrency} defaultCustomAmount={customAmount} />
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Name
            <input name="donorName" defaultValue={user?.displayName ?? user?.name ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Email
            <input name="donorEmail" type="email" defaultValue={user?.email ?? ""} className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" required />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Message
            <textarea name="message" className="min-h-24 w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500" />
          </label>
          {paymentInstructions.enabled ? (
            <div className="grid gap-3 rounded-xl border border-kelp-500/20 bg-kelp-100 p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-kelp-700">Manual payment instructions</p>
                <p className="mt-1 font-bold text-ocean-900">{paymentInstructions.methodLabel}</p>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="font-semibold text-ocean-900/52">Bank / provider</dt><dd className="mt-1 font-bold text-ocean-900">{paymentInstructions.providerName}</dd></div>
                <div><dt className="font-semibold text-ocean-900/52">Recipient</dt><dd className="mt-1 font-bold text-ocean-900">{paymentInstructions.accountName}</dd></div>
                <div><dt className="font-semibold text-ocean-900/52">Account / reference</dt><dd className="mt-1 font-bold text-ocean-900">{paymentInstructions.accountNumber}</dd></div>
                {paymentInstructions.swiftCode ? <div><dt className="font-semibold text-ocean-900/52">SWIFT / international code</dt><dd className="mt-1 font-bold text-ocean-900">{paymentInstructions.swiftCode}</dd></div> : null}
              </dl>
              {paymentInstructions.notes ? <p className="text-sm leading-6 text-ocean-900/68">{paymentInstructions.notes}</p> : null}
              <p className="text-xs leading-5 text-ocean-900/52">After paying, upload your payment proof below. Receipt and impact records are issued only after platform verification.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-coral-500/20 bg-coral-100 p-4">
              <p className="font-bold text-coral-700">Manual payment is temporarily unavailable</p>
              <p className="mt-1 text-sm leading-6 text-ocean-900/62">Terumbu has not published an active payment destination yet. Please return later rather than sending funds to an unverified destination.</p>
            </div>
          )}
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Payment reference
            <input
              name="paymentReference"
              placeholder="Optional transfer reference, account name, or note"
              className="w-full min-w-0 rounded-xl border border-ocean-900/14 px-4 py-3 outline-none focus:border-coral-500"
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-semibold text-ocean-900">
            Payment proof
            <input
              name="paymentProofFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="w-full min-w-0 rounded-xl border border-ocean-900/14 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-ocean-900 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white focus:border-coral-500"
              required
            />
          </label>
          <Button type="submit" disabled={!paymentInstructions.enabled}>Submit Payment Proof</Button>
        </form>
      </section>
    </main>
  );
}
