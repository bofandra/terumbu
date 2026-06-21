import { ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button";
import type { CampaignCardData } from "@/lib/domain";
import { formatCurrency } from "@/lib/utils";

type CampaignCardProps = {
  campaign: CampaignCardData;
};

export function CampaignCard({ campaign }: CampaignCardProps) {
  const progress = Math.round((campaign.raised / campaign.goal) * 100);

  return (
    <article className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-white shadow-soft">
      <Link href={`/campaigns/${campaign.slug}`} className="block">
        {campaign.imageUrl ? (
          <Image
            src={campaign.imageUrl}
            alt=""
            width={800}
            height={450}
            className="h-56 w-full object-cover"
            sizes="(min-width: 1024px) 33vw, 100vw"
          />
        ) : (
          <div className="flex h-56 w-full items-end bg-ocean-900 p-5 text-sm font-bold uppercase tracking-[0.14em] text-white/72">
            {campaign.category}
          </div>
        )}
      </Link>
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-700">
            {campaign.category}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-kelp-100 px-3 py-1 text-xs font-bold text-kelp-700">
            <ShieldCheck size={14} aria-hidden="true" />
            {campaign.verification}
          </span>
        </div>
        <h3 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">
          <Link href={`/campaigns/${campaign.slug}`} className="hover:text-coral-700">
            {campaign.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm font-medium text-ocean-900/58">{campaign.region}</p>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-ocean-900/68">{campaign.summary}</p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-ocean-900">{progress}% funded</span>
            <span className="text-ocean-900/60">{campaign.daysLeft} days left</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-ocean-50">
            <div className="h-full rounded-full bg-coral-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-sm text-ocean-900/68">
            <span className="font-bold text-ocean-900">{formatCurrency(campaign.raised)}</span> raised of{" "}
            {formatCurrency(campaign.goal)}
          </p>
          <p className="mt-1 text-sm text-ocean-900/68">{campaign.impact}</p>
        </div>

        <ButtonLink href={`/campaigns/${campaign.slug}`} className="mt-5 w-full">
          Donate
        </ButtonLink>
      </div>
    </article>
  );
}
