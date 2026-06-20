import { CalendarDays, MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import type { ExpeditionCardData } from "@/lib/domain";
import { formatCurrency } from "@/lib/utils";

type ExpeditionCardProps = {
  expedition: ExpeditionCardData;
};

export function ExpeditionCard({ expedition }: ExpeditionCardProps) {
  return (
    <article className="grid overflow-hidden rounded-2xl border border-ocean-900/10 bg-white shadow-soft md:grid-cols-[0.95fr_1.05fr]">
      <Link href={`/expeditions/${expedition.slug}`} className="block min-h-72">
        <Image
          src={expedition.imageUrl}
          alt=""
          width={820}
          height={620}
          className="h-full min-h-72 w-full object-cover"
          sizes="(min-width: 1280px) 45vw, 100vw"
        />
      </Link>
      <div className="flex flex-col p-6">
        <div className="flex flex-wrap gap-3 text-sm font-semibold text-ocean-900/68">
          <span className="inline-flex items-center gap-1">
            <MapPin size={16} aria-hidden="true" />
            {expedition.region}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={16} aria-hidden="true" />
            {expedition.duration}
          </span>
          <span className="inline-flex items-center gap-1 text-coral-700">
            <Star size={16} aria-hidden="true" />
            {expedition.rating}
          </span>
        </div>
        <h3 className="mt-5 text-2xl font-bold tracking-normal text-ocean-900">
          <Link href={`/expeditions/${expedition.slug}`} className="hover:text-coral-700">
            {expedition.title}
          </Link>
        </h3>
        <p className="mt-3 text-sm leading-6 text-ocean-900/68">{expedition.summary}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6">
          <p className="text-sm text-ocean-900/62">
            From <span className="text-lg font-bold text-ocean-900">{formatCurrency(expedition.price)}</span>
          </p>
          <ButtonLink href={`/expeditions/${expedition.slug}`} tone="secondary">
            View Trip
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
