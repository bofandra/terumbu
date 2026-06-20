import { Award, CalendarDays, Heart, MapPinned, Waves } from "lucide-react";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { PassportPreview } from "@/components/passport-preview";
import { requireUser } from "@/lib/auth";
import { getDashboardData, getImpactMapSites } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const metadata = {
  title: "Dashboard"
};

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [data, impactSites] = await Promise.all([getDashboardData(user.id), getImpactMapSites()]);
  const firstName = (user.displayName ?? user.name ?? "Ocean Hero").split(" ")[0];
  const summary = [
    { label: "Total donated", value: formatCurrency(data.summary.totalDonated), icon: Heart },
    { label: "Corals sponsored", value: data.summary.coralFragments.toLocaleString("id-ID"), icon: Waves },
    { label: "Field activities", value: String(data.summary.fieldActivities), icon: MapPinned },
    { label: "Certificates", value: String(data.summary.certificates), icon: Award }
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-ocean-900 p-6 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">Good morning, {firstName}</p>
        <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-normal sm:text-4xl">Your ocean impact continues to grow.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              Donations, sponsored ecosystems, expeditions, courses, certificates, and Impact Passport activity are loaded from PostgreSQL.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-4">
            <p className="text-sm text-white/68">Next expedition</p>
            <p className="mt-1 flex items-center gap-2 font-bold">
              <CalendarDays size={18} aria-hidden="true" />
              {data.bookings[0]?.expeditionTitle ?? "No booking yet"}
            </p>
          </div>
        </div>
      </section>

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

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Donation history</h2>
          <div className="mt-5 grid gap-3">
            {data.donations.map((donation) => (
              <div key={donation.id} className="rounded-xl bg-sand-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ocean-900">{donation.campaignTitle}</p>
                    <p className="mt-1 text-sm text-ocean-900/58">
                      {donation.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <span className="rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">{donation.status}</span>
                </div>
                <p className="mt-3 font-bold text-ocean-900">{formatCurrency(Number(donation.amount))}</p>
                <p className="mt-1 text-sm text-ocean-900/58">{donation.receiptNumber ?? "Receipt pending"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Sponsored ecosystems</h2>
          <div className="mt-5 grid gap-3">
            {data.ecosystems.map((ecosystem) => (
              <div key={ecosystem.code} className="rounded-xl bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{ecosystem.label}</p>
                <p className="mt-1 text-sm text-ocean-900/58">{ecosystem.campaignTitle}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ocean-900/62">
                  <span>{ecosystem.code}</span>
                  <span>{ecosystem.status}</span>
                  <span>{ecosystem.siteName ?? "Site pending"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Expedition bookings</h2>
          <div className="mt-5 grid gap-3">
            {data.bookings.map((booking) => (
              <div key={booking.bookingCode} className="rounded-xl bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{booking.expeditionTitle}</p>
                <p className="mt-1 text-sm text-ocean-900/58">
                  {booking.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })} · {booking.participantsCount} participant
                </p>
                <p className="mt-3 text-sm font-bold text-kelp-700">
                  {booking.bookingCode} · {booking.status}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="text-xl font-bold tracking-normal text-ocean-900">Academy and certificates</h2>
          <div className="mt-5 grid gap-3">
            {data.enrollments.map((enrollment) => (
              <div key={enrollment.courseSlug} className="rounded-xl bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">{enrollment.courseTitle}</p>
                <p className="mt-1 text-sm text-ocean-900/58">{enrollment.status}</p>
              </div>
            ))}
            {data.certificates.map((certificate) => (
              <div key={certificate.certificateNumber} className="rounded-xl border border-kelp-100 bg-kelp-100/40 p-4">
                <p className="font-bold text-ocean-900">{certificate.courseTitle}</p>
                <p className="mt-1 text-sm font-semibold text-kelp-700">{certificate.certificateNumber}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
