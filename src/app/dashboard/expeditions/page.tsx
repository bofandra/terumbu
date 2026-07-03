import Link from "next/link";
import { CalendarDays, RefreshCw, RotateCcw } from "lucide-react";

import { requestExpeditionRefundAction, retryExpeditionPaymentAction } from "@/lib/billing-actions";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getBillingData, getDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Expeditions"
};

export const dynamic = "force-dynamic";

type DashboardExpeditionsPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
  }>;
};

function statusClass(status: string) {
  if (status === "paid" || status === "confirmed" || status === "completed") {
    return "bg-kelp-100 text-kelp-700";
  }

  if (status === "failed" || status === "refunded" || status === "cancelled") {
    return "bg-coral-100 text-coral-700";
  }

  return "bg-ocean-50 text-ocean-700";
}

export default async function DashboardExpeditionsPage({ searchParams }: DashboardExpeditionsPageProps) {
  const params = await searchParams;
  const user = await requireUser("/dashboard/expeditions");
  const [data, billing] = await Promise.all([getDashboardData(user.id), getBillingData(user.id)]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Expeditions</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Field activity bookings</h1>
        </div>
        <ButtonLink href="/expeditions">Browse expeditions</ButtonLink>
      </header>

      {params?.saved ? (
        <p className="mt-5 rounded-2xl border border-kelp-500/20 bg-kelp-100 px-4 py-3 text-sm font-bold text-kelp-700">Booking billing changes saved.</p>
      ) : null}
      {params?.error ? (
        <p className="mt-5 rounded-2xl border border-coral-500/20 bg-coral-100 px-4 py-3 text-sm font-bold text-coral-700">Could not complete that booking billing action.</p>
      ) : null}

      <section className="mt-6 grid gap-4">
        {data.bookings.map((booking) => (
          <article key={booking.bookingCode} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="flex items-start gap-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-coral-100 text-coral-700">
                  <CalendarDays size={22} aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-normal text-ocean-900">{booking.expeditionTitle}</h2>
                  <p className="mt-1 text-sm text-ocean-900/58">
                    {booking.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} · {booking.participantsCount} participant
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-ocean-900/62">
                    <span className="rounded-full bg-sand-50 px-3 py-1">{booking.bookingCode}</span>
                    <span className={`rounded-full px-3 py-1 ${statusClass(booking.status)}`}>{booking.status}</span>
                    <span className={`rounded-full px-3 py-1 ${statusClass(booking.paymentStatus)}`}>{booking.paymentStatus}</span>
                    <span className="rounded-full bg-ocean-50 px-3 py-1">{formatCurrency(Number(booking.totalAmount))}</span>
                  </div>
                  {billing.pendingRefundBookingIds.has(booking.id) ? (
                    <p className="mt-3 inline-flex rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-ocean-900/70">Refund requested</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 md:justify-end">
                {["created", "pending", "failed", "expired"].includes(booking.paymentStatus) ? (
                  <form action={retryExpeditionPaymentAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-ocean-900 hover:border-coral-500" type="submit">
                      <RefreshCw size={14} aria-hidden="true" />
                      Retry
                    </button>
                  </form>
                ) : null}
                {booking.paymentStatus === "paid" && !billing.pendingRefundBookingIds.has(booking.id) ? (
                  <form action={requestExpeditionRefundAction}>
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <input type="hidden" name="reason" value="Requested from expedition booking history" />
                    <button className="inline-flex min-h-9 items-center gap-2 rounded-full border border-ocean-900/10 px-3 text-xs font-bold text-coral-700 hover:border-coral-500" type="submit">
                      <RotateCcw size={14} aria-hidden="true" />
                      Request refund
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {data.bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6">
            <p className="font-bold text-ocean-900">No expedition bookings yet.</p>
            <Link href="/expeditions" className="mt-2 inline-flex text-sm font-bold text-coral-700">
              Find your first conservation trip
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
