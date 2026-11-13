import { ArrowUpRight, CalendarDays, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { secondaryPriceLabel } from "@/lib/currency-display";
import type { ExpeditionCardData } from "@/lib/domain";
import type { DisplayCurrency } from "@/lib/user-preferences";
import { formatCurrency } from "@/lib/utils";
import { localizedSeoPath } from "@/lib/public-locale-routing";

type FeaturedExpeditionRailProps = {
  expeditions: ExpeditionCardData[];
  displayCurrency?: DisplayCurrency;
  locale?: string;
};

export function FeaturedExpeditionRail({ expeditions, displayCurrency = "USD", locale = "en-US" }: FeaturedExpeditionRailProps) {
  const isIndonesian = locale.startsWith("id");

  if (expeditions.length === 0) {
    return (
      <div className="rounded-2xl border border-ocean-900/10 bg-white p-8 text-center shadow-soft">
        <h3 className="text-xl font-bold tracking-normal text-ocean-900">{isIndonesian ? "Keberangkatan ekspedisi sedang disiapkan" : "Expedition departures are being scheduled"}</h3>
        <p className="mt-2 text-sm leading-6 text-ocean-900/64">
          {isIndonesian ? "Ekspedisi konservasi baru akan muncul setelah tanggal dan kapasitas mitra dikonfirmasi." : "New conservation trips will appear here once partner dates and capacities are confirmed."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {expeditions.map((expedition) => {
        const secondaryPrice = secondaryPriceLabel(expedition.price, expedition.currency, displayCurrency, locale);

        return (
          <Link
            key={expedition.slug}
            href={localizedSeoPath(`/expeditions/${expedition.slug}`, isIndonesian ? "id" : "en")}
            className="group flex min-w-0 flex-col overflow-hidden rounded-[1.125rem] border border-[var(--public-rule)] bg-[var(--public-cream)] transition hover:border-[var(--public-blue)] hover:shadow-soft"
          >
            <div className="relative aspect-[5/4] overflow-hidden bg-[var(--public-navy)]">
              {expedition.imageUrl ? (
                <Image
                  src={expedition.imageUrl}
                  alt=""
                  fill
                  className="object-cover transition duration-500 group-hover:scale-105"
                  sizes="(min-width: 1024px) 32vw, (min-width: 640px) 48vw, 100vw"
                />
              ) : null}
              <span className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-[var(--public-lime)] text-[var(--public-navy)]">
                <ArrowUpRight size={18} aria-hidden="true" />
              </span>
            </div>
            <div className="flex flex-1 flex-col p-5 text-[var(--public-ink)]">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--public-blue)]">{expedition.region}</p>
              <h3 className="mt-2 text-2xl leading-tight">{expedition.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ocean-900/75">{expedition.summary}</p>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-5 text-xs font-semibold text-ocean-900/75">
                <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} aria-hidden="true" />{expedition.duration}</span>
                <span className="inline-flex items-center gap-1.5"><Users size={15} aria-hidden="true" />{expedition.availabilityLabel}</span>
              </div>
              <p className="mt-4 border-t border-[var(--public-rule)] pt-4 text-sm">
                {isIndonesian ? "Mulai dari" : "From"} <strong>{formatCurrency(expedition.price, expedition.currency)}</strong>
              </p>
              {secondaryPrice ? <p className="mt-1 text-xs font-bold text-kelp-700">{secondaryPrice} {isIndonesian ? "perkiraan" : "estimated"}</p> : null}
            </div>
          </Link>
        );
      })}

      <Link
        href={localizedSeoPath("/expeditions", isIndonesian ? "id" : "en")}
        className="group flex min-h-44 min-w-0 items-center justify-between gap-5 rounded-[1.125rem] bg-[var(--public-navy)] p-6 text-white transition hover:bg-[var(--public-blue)] focus-visible:outline-offset-[-5px] focus-visible:outline-[var(--public-lime)]"
      >
        <span>
          <span className="block text-xs font-bold uppercase tracking-[0.12em] text-[var(--public-lime)]">{isIndonesian ? "Ekspedisi lainnya" : "More trips"}</span>
          <span className="mt-3 block text-2xl leading-tight [font-family:var(--public-display)]">{isIndonesian ? "Temukan keberangkatan berikutnya." : "Find your next departure."}</span>
        </span>
        <ArrowUpRight className="shrink-0 text-[var(--public-lime)]" size={26} aria-hidden="true" />
      </Link>
    </div>
  );
}
