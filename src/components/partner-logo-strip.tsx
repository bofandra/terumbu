import Image from "next/image";
import Link from "next/link";

import type { PartnerLogoData } from "@/lib/domain";

type PartnerLogoStripProps = {
  partners: PartnerLogoData[];
};

function initialsForPartner(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TE";
}

function PartnerLogo({ partner }: { partner: PartnerLogoData }) {
  const content = (
    <>
      <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-sm font-black text-ocean-900 ring-1 ring-ocean-900/10">
        {partner.logoUrl ? (
          <Image
            src={partner.logoUrl}
            alt={`${partner.name} logo`}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          initialsForPartner(partner.name)
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-ocean-900">{partner.name}</span>
        <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.12em] text-ocean-900/48">{partner.type}</span>
      </span>
    </>
  );

  const className =
    "flex min-w-64 items-center gap-3 rounded-xl border border-ocean-900/10 bg-sand-50 px-4 py-3 transition hover:border-coral-500 hover:bg-white";

  return partner.href ? (
    <Link href={partner.href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function PartnerLogoStrip({ partners }: PartnerLogoStripProps) {
  if (partners.length === 0) {
    return null;
  }

  return (
    <section className="border-y border-ocean-900/10 bg-white py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-ocean-900/58">Trusted partner ecosystem</p>
            <h2 className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">NGOs, community groups, and corporate supporters</h2>
          </div>
          <Link href="/about" className="text-sm font-bold text-coral-700 hover:text-coral-500">
            View partner model
          </Link>
        </div>
        <div className="mt-7 flex gap-3 overflow-x-auto pb-2">
          {partners.map((partner) => (
            <PartnerLogo key={`${partner.type}-${partner.slug}`} partner={partner} />
          ))}
        </div>
      </div>
    </section>
  );
}
