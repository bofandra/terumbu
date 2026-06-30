import { Heart, Star, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ExpeditionCardData } from "@/lib/domain";
import { formatCurrency } from "@/lib/utils";

type FeaturedExpeditionRailProps = {
  expeditions: ExpeditionCardData[];
};

const ratingByIndex = ["4.9", "4.8", "4.7", "4.9"];

function activityLabel(summary: string) {
  if (summary.toLowerCase().includes("survey")) {
    return "Reef survey + community guides";
  }

  if (summary.toLowerCase().includes("coral")) {
    return "Plant corals + diving";
  }

  return "Field learning + conservation";
}

export function FeaturedExpeditionRail({ expeditions }: FeaturedExpeditionRailProps) {
  if (expeditions.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-900/10 bg-white p-8 text-center shadow-soft">
        <h3 className="text-xl font-bold tracking-normal text-ocean-900">Expedition departures are being scheduled</h3>
        <p className="mt-2 text-sm leading-6 text-ocean-900/64">
          New conservation trips will appear here once partner dates and capacities are confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="flex snap-x gap-5 overflow-x-auto pb-3">
      {expeditions.map((expedition, index) => (
        <Link
          key={expedition.slug}
          href={`/expeditions/${expedition.slug}`}
          className="group relative min-h-[360px] min-w-[290px] snap-start overflow-hidden rounded-2xl bg-ocean-900 shadow-soft ring-1 ring-ocean-900/10 transition hover:-translate-y-1 hover:ring-coral-500 sm:min-w-[340px] lg:min-w-[31%]"
        >
          {expedition.imageUrl ? (
            <Image
              src={expedition.imageUrl}
              alt=""
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
              sizes="(min-width: 1024px) 31vw, 85vw"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-900 via-ocean-900/25 to-ocean-900/10" />
          <span className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/16 text-white backdrop-blur">
            <Heart size={18} aria-hidden="true" />
          </span>

          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-coral-100">{expedition.region}</p>
            <h3 className="mt-3 text-2xl font-bold tracking-normal">{expedition.title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/76">{activityLabel(expedition.summary)}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm font-semibold">
              <span className="inline-flex items-center gap-1 text-coral-100">
                <Star size={16} fill="currentColor" aria-hidden="true" />
                {ratingByIndex[index % ratingByIndex.length]}
              </span>
              <span className="inline-flex items-center gap-1 text-white/74">
                <Users size={16} aria-hidden="true" />
                {expedition.availabilityLabel}
              </span>
            </div>
            <p className="mt-3 text-sm text-white/74">
              From <span className="text-base font-bold text-white">{formatCurrency(expedition.price)}</span>
            </p>
          </div>
        </Link>
      ))}

      <Link
        href="/expeditions"
        className="flex min-h-[360px] min-w-[260px] snap-start flex-col justify-between rounded-2xl border border-dashed border-ocean-900/18 bg-white p-6 text-ocean-900 transition hover:border-coral-500 hover:text-coral-700"
      >
        <span className="text-sm font-bold uppercase tracking-[0.16em] text-ocean-900/50">More trips</span>
        <span>
          <span className="block text-2xl font-bold tracking-normal">See every conservation departure</span>
          <span className="mt-3 block text-sm leading-6 text-ocean-900/64">
            Browse dates, regions, seats, and field activities linked to real restoration work.
          </span>
        </span>
      </Link>
    </div>
  );
}
