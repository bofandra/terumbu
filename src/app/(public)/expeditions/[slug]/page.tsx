import { CalendarDays, MapPin, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { getExpeditionDetail } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExpeditionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const expedition = await getExpeditionDetail(slug);

  if (!expedition) {
    notFound();
  }

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          {expedition.imageUrl ? (
            <Image
              src={expedition.imageUrl}
              alt=""
              width={980}
              height={720}
              className="h-[460px] w-full rounded-2xl object-cover shadow-soft"
              sizes="(min-width: 1024px) 55vw, 100vw"
              priority
            />
          ) : (
            <div className="flex h-[460px] w-full items-end rounded-2xl bg-ocean-900 p-6 text-sm font-bold uppercase tracking-[0.14em] text-white/72 shadow-soft">
              {expedition.region}
            </div>
          )}
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Conservation expedition</p>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">{expedition.title}</h1>
            <p className="mt-4 text-lg leading-8 text-ocean-900/68">{expedition.summary}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                [MapPin, expedition.region],
                [CalendarDays, expedition.duration],
                [Users, expedition.groupSizeLabel],
                [ShieldCheck, expedition.partner ? `${expedition.verification}: ${expedition.partner}` : expedition.verification]
              ].map(([Icon, label]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-xl bg-sand-50 p-4 font-semibold text-ocean-900">
                  <Icon size={20} aria-hidden="true" />
                  {label as string}
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <p className="text-sm text-ocean-900/62">From</p>
              <p className="text-3xl font-bold tracking-normal text-ocean-900">{formatCurrency(expedition.price)}</p>
              <ButtonLink href={`/checkout/expedition?expedition=${expedition.slug}`} className="mt-5 w-full">
                Check Availability
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading title="Program overview">
          Participants learn restoration basics, join field monitoring, document evidence, and receive a verified activity record after completion.
        </SectionHeading>
        {expedition.programActivities.length > 0 ? (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {expedition.programActivities.map((item) => (
              <div key={item.title} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <h2 className="font-bold text-ocean-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ocean-900/68">{item.description}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Upcoming departures">
            Availability is backed by expedition departure and booking records.
          </SectionHeading>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {expedition.departures.map((departure) => (
              <article key={departure.id} className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5">
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">
                  {departure.startsAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
                <h2 className="mt-3 text-xl font-bold tracking-normal text-ocean-900">
                  {departure.availableSeats} of {departure.capacity} seats available
                </h2>
                <p className="mt-2 text-sm text-ocean-900/62">
                  Meeting point: {departure.meetingPoint ?? expedition.region}
                </p>
                <ButtonLink href={`/checkout/expedition?departure=${departure.id}`} tone="secondary" className="mt-5">
                  Reserve Seats
                </ButtonLink>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
