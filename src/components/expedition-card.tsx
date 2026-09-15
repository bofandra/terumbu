import { Clock, Home, Leaf, MapPin, Star, Utensils, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import type { ExpeditionCardData } from "@/lib/domain";
import { formatCurrency } from "@/lib/utils";

type ExpeditionCardProps = {
  expedition: ExpeditionCardData;
};

export function ExpeditionCard({ expedition }: ExpeditionCardProps) {
  const marketplace = expedition.marketplace;
  const helpActivities = marketplace.helpActivities.slice(0, 4);
  const badges = marketplace.badges.slice(0, 3);
  const accommodation = marketplace.accommodations[0] ?? "Stay details pending";
  const feeLabel = marketplace.additionalFee
    ? `+ ${formatCurrency(marketplace.additionalFee.amount, marketplace.additionalFee.currency)} ${marketplace.additionalFee.period}`
    : "No additional host fee";

  return (
    <article className="grid overflow-hidden rounded-xl border border-ocean-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-kelp-500/35 hover:shadow-soft md:grid-cols-[260px_minmax(0,1fr)]">
      <Link href={`/expeditions/${expedition.slug}`} className="relative block min-h-64 bg-ocean-900">
        {expedition.imageUrl ? (
          <Image
            src={expedition.imageUrl}
            alt=""
            width={820}
            height={620}
            className="h-full min-h-64 w-full object-cover"
            sizes="(min-width: 1280px) 260px, 100vw"
          />
        ) : (
          <div className="flex h-full min-h-64 w-full items-end bg-ocean-900 p-6 text-sm font-bold uppercase tracking-[0.14em] text-white/72">
            {expedition.region}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-kelp-700 shadow-sm">
          {marketplace.typeLabel}
        </span>
      </Link>
      <div className="flex min-w-0 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ocean-900/62">
          <span className="inline-flex items-center gap-1 rounded-full bg-ocean-50 px-2.5 py-1">
            <MapPin size={16} aria-hidden="true" />
            {expedition.region}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-kelp-100 px-2.5 py-1 text-kelp-700">
            <Clock size={16} aria-hidden="true" />
            {marketplace.collaborationHoursPerWeek}h/week
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-ocean-50 px-2.5 py-1">
            <Users size={16} aria-hidden="true" />
            {expedition.availabilityLabel}
          </span>
        </div>
        <h3 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">
          <Link href={`/expeditions/${expedition.slug}`} className="hover:text-coral-700">
            {expedition.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ocean-900/64">{expedition.summary}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {helpActivities.map((activity) => (
            <span key={activity} className="rounded-full border border-ocean-900/10 px-2.5 py-1 text-xs font-bold text-ocean-900/62">
              {activity}
            </span>
          ))}
        </div>

        <div className="mt-4 grid gap-2 text-sm font-semibold text-ocean-900/66 sm:grid-cols-3">
          <span className="inline-flex min-w-0 items-center gap-2">
            <Home size={16} aria-hidden="true" className="shrink-0 text-kelp-500" />
            <span className="truncate">{accommodation}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-2">
            <Utensils size={16} aria-hidden="true" className="shrink-0 text-kelp-500" />
            <span className="truncate">{marketplace.mealsIncluded}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-2">
            <Leaf size={16} aria-hidden="true" className="shrink-0 text-kelp-500" />
            <span className="truncate">{marketplace.travelLengthLabel}</span>
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-bold text-ocean-900">
            <Star size={13} aria-hidden="true" className="fill-sand-300 text-sand-300" />
            Verified trip
          </span>
          {badges.map((badge) => (
            <span key={badge} className="rounded-full bg-kelp-100 px-2.5 py-1 text-xs font-bold text-kelp-700">
              {badge}
            </span>
          ))}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
          <div>
            <p className="min-w-0 break-words text-sm text-ocean-900/58 [overflow-wrap:anywhere]">
              From <span className="text-lg font-bold text-ocean-900">{formatCurrency(expedition.price, expedition.currency)}</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-ocean-900/48">{feeLabel}</p>
          </div>
          <ButtonLink href={`/expeditions/${expedition.slug}`} tone="secondary">
            View Opportunity
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
