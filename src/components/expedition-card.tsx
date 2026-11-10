import { Clock, MapPin, Users, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import type { ExpeditionCardData } from "@/lib/domain";
import { secondaryPriceLabel } from "@/lib/currency-display";
import type { DisplayCurrency } from "@/lib/user-preferences";
import { cn, formatCurrency } from "@/lib/utils";

type ExpeditionCardProps = {
  expedition: ExpeditionCardData;
  displayCurrency?: DisplayCurrency;
  locale?: string;
  /** Editorial card treatment for the main marketplace, list layout elsewhere. */
  tile?: boolean;
};

export function ExpeditionCard({ expedition, displayCurrency = "USD", locale = "en-US", tile = false }: ExpeditionCardProps) {
  const marketplace = expedition.marketplace;
  const helpActivities = marketplace.helpActivities.slice(0, 2);
  const remainingActivities = Math.max(marketplace.helpActivities.length - helpActivities.length, 0);
  const displayedPrice = formatCurrency(expedition.price, expedition.currency);
  const secondaryPrice = secondaryPriceLabel(expedition.price, expedition.currency, displayCurrency, locale);
  const isIndonesian = locale.toLowerCase().startsWith("id");
  const query = new URLSearchParams();
  if (expedition.matchingDepartureId) query.set("departure", expedition.matchingDepartureId);
  if (expedition.requestedParticipants) query.set("participants", String(expedition.requestedParticipants));
  const tripHref = `/expeditions/${expedition.slug}${query.size ? `?${query}` : ""}`;

  return (
    <article className={cn(
      "group overflow-hidden rounded-3xl border border-ocean-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#0757e5]/40 hover:shadow-soft",
      tile ? "flex h-full flex-col" : "grid md:grid-cols-[240px_minmax(0,1fr)]"
    )}>
      <Link href={tripHref} className={cn("relative block overflow-hidden bg-ocean-900", tile ? "h-56 sm:h-64" : "min-h-56")}>
        {expedition.imageUrl ? (
          <Image
            src={expedition.imageUrl}
            alt={`${expedition.title} in ${expedition.region}`}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes={tile ? "(min-width: 1280px) 36vw, (min-width: 768px) 50vw, 100vw" : "(min-width: 1280px) 240px, 100vw"}
          />
        ) : (
          <div className="flex h-full w-full items-end bg-[#062d7f] p-6 text-sm font-bold uppercase tracking-[0.14em] text-white/80">{expedition.region}</div>
        )}
        {marketplace.typeLabel ? (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#062d7f] shadow-sm">{marketplace.typeLabel}</span>
        ) : null}
        <span className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-[#c9f341] text-[#062d7f] shadow-sm">
          <ArrowUpRight size={19} aria-hidden="true" />
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col p-6">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-ocean-900/64">
          <span className="inline-flex items-center gap-1.5"><MapPin size={15} aria-hidden="true" />{expedition.region}</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={15} aria-hidden="true" />{expedition.duration}</span>
          <span className="inline-flex items-center gap-1.5"><Users size={15} aria-hidden="true" />{expedition.availabilityLabel}</span>
        </p>

        <h3 className="mt-3 text-xl font-black leading-tight tracking-[-0.02em] text-ocean-900 sm:text-2xl">
          <Link href={tripHref} className="hover:text-[#0757e5]">{expedition.title}</Link>
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-ocean-900/70">{expedition.summary}</p>

        {helpActivities.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {helpActivities.map((activity) => <span key={activity} className="rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-bold text-[#063b9a]">{activity}</span>)}
            {remainingActivities > 0 ? <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-900/60">+{remainingActivities} {isIndonesian ? "lainnya" : "more"}</span> : null}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
          <div>
            <p className="text-xs font-medium text-ocean-900/60">{isIndonesian ? "Mulai dari" : "From"}</p>
            <p className="mt-1 text-xl font-black text-ocean-900">{displayedPrice}</p>
            {secondaryPrice ? <p className="mt-1 text-xs font-bold text-kelp-700">{secondaryPrice} {isIndonesian ? "estimasi" : "estimated"}</p> : null}
          </div>
          <ButtonLink href={tripHref} tone="secondary">{isIndonesian ? "Lihat detail" : "View details"}</ButtonLink>
        </div>
      </div>
    </article>
  );
}
