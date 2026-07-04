import { CreditCard, Heart, RefreshCw, RotateCcw, XCircle } from "lucide-react";
import Link from "next/link";

import {
  archivePaymentMethodAction,
  cancelSubscriptionAction,
  createPaymentMethodAction,
  requestDonationRefundAction,
  retryDonationPaymentAction,
  setDefaultPaymentMethodAction
} from "@/lib/billing-actions";
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

  if (status === "failed" || status === "refunded" || status === "cancelled") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-sand-100 text-ocean-900/70";
}

function shortDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("id-ID", { dateStyle: "medium" }) : "Not scheduled";
}

export default async function DashboardDonationsPage({ searchParams }: DashboardDonationsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard/donations");
  const [data, billing] = await Promise.all([getDashboardData(user.id), getBillingData(user.id)]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Donations & billing</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Contributions, monthly giving, and payment methods</h1>
      </header>

      {params?.saved ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Billing changes saved.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Could not complete that billing action.</p>
      ) : null}

      <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Payment methods</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Saved payment methods</h2>
              <p className="mt-2 text-sm leading-6 text-ocean-900/62">Saved methods support monthly giving, retries, and default payment selection.</p>
            </div>
            <CreditCard size={24} aria-hidden="true" className="text-coral-500" />
          </div>

          <div className="mt-5 grid gap-3">
            {billing.paymentMethods.map((method) => (
              <div key={method.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-bold text-ocean-900">{method.label}</p>
                    <p className="mt-1 text-sm text-ocean-900/58">
                      {method.brand} ending {method.last4} · expires {method.expMonth ?? "--"}/{method.expYear ?? "----"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(method.status)}`}>{method.status}</span>
                      {method.isDefault ? <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">Default</span> : null}
                    </div>
                  </div>
                  {method.status === "active" ? (
                    <div className="flex flex-wrap gap-2">
                      {!method.isDefault ? (
                        <form action={setDefaultPaymentMethodAction}>
                          <input type="hidden" name="paymentMethodId" value={method.id} />
                          <button className="min-h-9 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-coral-500" type="submit">
                            Make default
                          </button>
                        </form>
                      ) : null}
                      <form action={archivePaymentMethodAction}>
                        <input type="hidden" name="paymentMethodId" value={method.id} />
                        <button className="min-h-9 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500" type="submit">
                          Archive
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {billing.paymentMethods.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">No saved payment methods yet.</p> : null}
          </div>

          <form action={createPaymentMethodAction} className="mt-5 grid gap-3 rounded-xl border border-ocean-900/10 bg-ocean-50 p-4">
            <p className="font-bold text-ocean-900">Add payment method</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-2 text-sm font-semibold text-ocean-900 sm:col-span-1">
                Label
                <input name="label" defaultValue="Ocean Hero card" className="rounded-xl border border-ocean-900/14 bg-white px-3 py-2 outline-none focus:border-coral-500" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ocean-900">
                Brand
                <input name="brand" defaultValue="Payment Card" className="rounded-xl border border-ocean-900/14 bg-white px-3 py-2 outline-none focus:border-coral-500" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-ocean-900">
                Last 4
                <input name="last4" inputMode="numeric" maxLength={4} defaultValue="4242" className="rounded-xl border border-ocean-900/14 bg-white px-3 py-2 outline-none focus:border-coral-500" />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-ocean-900">
              <input type="checkbox" name="makeDefault" className="size-4 rounded border-ocean-900/20" />
              Make default
            </label>
            <button className="inline-flex min-h-10 w-fit items-center justify-center rounded-full bg-ocean-900 px-4 text-sm font-bold text-white hover:bg-ocean-700" type="submit">
              Save method
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Monthly giving</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Subscription records</h2>
          <div className="mt-5 grid gap-3">
            {billing.subscriptions.map((subscription) => (
              <div key={subscription.id} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-bold text-ocean-900">{subscription.campaignTitle}</p>
                    <p className="mt-1 text-sm text-ocean-900/58">
                      {formatCurrency(Number(subscription.amount))}/{subscription.interval} · next billing {shortDate(subscription.nextBillingAt)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-ocean-900/52">
                      {subscription.paymentMethodLabel ? `${subscription.paymentMethodLabel} ending ${subscription.paymentMethodLast4}` : "No active payment method"}
                    </p>
                    <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(subscription.status)}`}>{subscription.status}</span>
                  </div>
                  {subscription.status === "active" || subscription.status === "past_due" ? (
                    <form action={cancelSubscriptionAction}>
                      <input type="hidden" name="subscriptionId" value={subscription.id} />
                      <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500" type="submit">
                        <XCircle size={14} aria-hidden="true" />
                        Cancel
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
            {billing.subscriptions.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">Monthly giving records will appear here after your first monthly checkout.</p> : null}
          </div>
        </article>
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
                  <p className="mt-3 text-sm text-ocean-900/62">{donation.receiptNumber ?? "Receipt pending"}</p>
                </div>
              </div>
              <div className="md:text-right">
                <p className="font-bold text-ocean-900">{formatCurrency(Number(donation.amount))}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusClass(donation.status)}`}>{donation.status}</span>
                {billing.pendingRefundDonationIds.has(donation.id) ? (
                  <p className="mt-3 rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ocean-900/70">Refund requested</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
                  {["created", "pending", "failed", "expired"].includes(donation.status) ? (
                    <form action={retryDonationPaymentAction}>
                      <input type="hidden" name="donationId" value={donation.id} />
                      <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-coral-500" type="submit">
                        <RefreshCw size={14} aria-hidden="true" />
                        Retry
                      </button>
                    </form>
                  ) : null}
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
              Support a verified project to create your first receipt, dashboard record, and Impact Passport milestone.
            </p>
            <Link href="/campaigns" className="mt-4 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
              Browse verified campaigns
            </Link>
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Billing operations</p>
        <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">Recent requests and retries</h2>
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
          {billing.operations.length === 0 ? <p className="rounded-xl border border-dashed border-ocean-900/14 p-4 text-sm font-semibold text-ocean-900/62">No billing operations yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
