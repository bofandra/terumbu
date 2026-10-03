import { Clock, MapPin, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import type { ExpeditionCardData } from "@/lib/domain";
import { secondaryPriceLabel } from "@/lib/currency-display";
import type { DisplayCurrency } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";

type ExpeditionCardProps = {
  expedition: ExpeditionCardData;
  displayCurrency?: DisplayCurrency;
  locale?: string;
};

export function ExpeditionCard({ expedition, displayCurrency = "USD", locale = "en-US" }: ExpeditionCardProps) {
  const marketplace = expedition.marketplace;
  const helpActivities = marketplace.helpActivities.slice(0, 2);
  const remainingActivities = Math.max(marketplace.helpActivities.length - helpActivities.length, 0);
  const secondaryPrice = secondaryPriceLabel(expedition.price, expedition.currency, displayCurrency, locale);
  const isIndonesian = locale.toLowerCase().startsWith("id");

  return (
    <article className="grid overflow-hidden rounded-xl border border-ocean-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-kelp-500/35 hover:shadow-soft md:grid-cols-[240px_minmax(0,1fr)]">
      <Link href={`/expeditions/${expedition.slug}`} className="relative block min-h-56 bg-ocean-900">
        {expedition.imageUrl ? (
          <Image
            src={expedition.imageUrl}
            alt={`${expedition.title} in ${expedition.region}`}
            width={820}
            height={620}
            className="h-full min-h-56 w-full object-cover"
            sizes="(min-width: 1280px) 240px, 100vw"
          />
        ) : (
          <div className="flex h-full min-h-56 w-full items-end bg-ocean-900 p-6 text-sm font-bold uppercase tracking-[0.14em] text-white/72">
            {expedition.region}
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-kelp-700 shadow-sm">
          {marketplace.typeLabel}
        </span>
      </Link>

      <div className="flex min-w-0 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-ocean-900/62">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={16} aria-hidden="true" />
            {expedition.region}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={16} aria-hidden="true" />
            {expedition.durationDays} {isIndonesian ? "hari" : "days"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={16} aria-hidden="true" />
            {expedition.availabilityLabel}
          </span>
        </div>

        <h3 className="mt-3 text-xl font-bold tracking-normal text-ocean-900">
          <Link href={`/expeditions/${expedition.slug}`} className="hover:text-coral-700">
            {expedition.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ocean-900/64">{expedition.summary}</p>

        {helpActivities.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {helpActivities.map((activity) => (
              <span key={activity} className="rounded-full border border-ocean-900/10 px-2.5 py-1 text-xs font-bold text-ocean-900/62">
                {activity}
              </span>
            ))}
            {remainingActivities > 0 ? (
              <span className="rounded-full bg-ocean-50 px-2.5 py-1 text-xs font-bold text-ocean-900/54">
                +{remainingActivities} {isIndonesian ? "lainnya" : "more"}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-kelp-100 px-2.5 py-1 text-xs font-bold text-kelp-700">
          <ShieldCheck size={14} aria-hidden="true" />
          {isIndonesian ? "Perjalanan terverifikasi" : "Verified trip"}
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-5">
          <div>
            <p className="min-w-0 break-words text-sm text-ocean-900/58 [overflow-wrap:anywhere]">
              {isIndonesian ? "Mulai dari" : "From"}{" "}
              <span className="text-lg font-bold text-ocean-900">{formatCurrency(expedition.price, expedition.currency)}</span>
            </p>
            {secondaryPrice ? (
              <p className="mt-0.5 text-xs font-bold text-kelp-700">
                {secondaryPrice} {isIndonesian ? "estimasi" : "estimated"}
              </p>
            ) : null}
          </div>
          <ButtonLink href={`/expeditions/${expedition.slug}`} tone="secondary">
            {isIndonesian ? "Lihat detail" : "View details"}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
