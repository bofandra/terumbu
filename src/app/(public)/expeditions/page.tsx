import Link from "next/link";

import { ExpeditionCard } from "@/components/expedition-card";
import { SectionHeading } from "@/components/section-heading";
import { getExpeditionCards, getExpeditionRegions } from "@/lib/queries";

export const metadata = {
  title: "Expeditions"
};

export const dynamic = "force-dynamic";

type ExpeditionsPageProps = {
  searchParams?: Promise<{
    region?: string;
  }>;
};

export default async function ExpeditionsPage({ searchParams }: ExpeditionsPageProps) {
  const params = await searchParams;
  const [expeditions, regions] = await Promise.all([getExpeditionCards(undefined, params?.region), getExpeditionRegions()]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Explore" title="Conservation expeditions">
        Book field experiences that combine travel, restoration activity, local guides, and Impact Passport records.
      </SectionHeading>
      <div className="mt-8 flex flex-wrap gap-2">
        {["All", ...regions].map((region) => (
          <Link
            key={region}
            href={region === "All" ? "/expeditions" : `/expeditions?region=${encodeURIComponent(region)}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-900 shadow-sm ring-1 ring-ocean-900/10 hover:ring-coral-500"
          >
            {region}
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        {expeditions.map((expedition) => (
          <ExpeditionCard key={expedition.slug} expedition={expedition} />
        ))}
      </div>
    </section>
  );
}
