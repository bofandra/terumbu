import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Expeditions"
};

export const dynamic = "force-dynamic";

export default async function DashboardExpeditionsPage() {
  const user = await requireUser("/dashboard/expeditions");
  const data = await getDashboardData(user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Expeditions</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Field activity bookings</h1>
        </div>
        <ButtonLink href="/expeditions">Browse expeditions</ButtonLink>
      </header>

      <section className="mt-6 grid gap-4">
        {data.bookings.map((booking) => (
          <article key={booking.bookingCode} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
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
                  <span className="rounded-full bg-kelp-100 px-3 py-1 text-kelp-700">{booking.status}</span>
                  <span className="rounded-full bg-ocean-50 px-3 py-1">{booking.paymentStatus}</span>
                  <span className="rounded-full bg-ocean-50 px-3 py-1">{formatCurrency(Number(booking.totalAmount))}</span>
                </div>
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
