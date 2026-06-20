import { CalendarDays, MapPin, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { expeditions } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export function generateStaticParams() {
  return expeditions.map((expedition) => ({ slug: expedition.slug }));
}

export default async function ExpeditionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const expedition = expeditions.find((item) => item.slug === slug);

  if (!expedition) {
    notFound();
  }

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <Image
            src={expedition.imageUrl}
            alt=""
            width={980}
            height={720}
            className="h-[460px] w-full rounded-2xl object-cover shadow-soft"
            sizes="(min-width: 1024px) 55vw, 100vw"
            priority
          />
          <div className="flex flex-col justify-center">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Conservation expedition</p>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-ocean-900 sm:text-5xl">{expedition.title}</h1>
            <p className="mt-4 text-lg leading-8 text-ocean-900/68">{expedition.summary}</p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                [MapPin, expedition.region],
                [CalendarDays, expedition.duration],
                [Users, "Small field group"],
                [ShieldCheck, "Verified partner"]
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
              <ButtonLink href="/checkout/expedition" className="mt-5 w-full">
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
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["Coral planting", "Reef monitoring", "Community briefing"].map((item) => (
            <div key={item} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <h2 className="font-bold text-ocean-900">{item}</h2>
              <p className="mt-2 text-sm leading-6 text-ocean-900/68">
                Field teams provide guidance, safety checks, and evidence records connected to Terumbu impact data.
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
