import Link from "next/link";

import { CampaignCard } from "@/components/campaign-card";
import { SectionHeading } from "@/components/section-heading";
import { getCampaignCards, getCampaignCategories } from "@/lib/queries";

export const metadata = {
  title: "Campaigns"
};

export const dynamic = "force-dynamic";

type CampaignsPageProps = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const params = await searchParams;
  const selectedCategory = params?.category;
  const [campaigns, categories] = await Promise.all([getCampaignCards(undefined, selectedCategory), getCampaignCategories()]);
  const filters = ["All", ...categories];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Donate" title="Verified conservation campaigns">
        Support coral restoration, mangrove protection, ocean cleanup, and community-led coastal programs.
      </SectionHeading>
      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter}
            href={filter === "All" ? "/campaigns" : `/campaigns?category=${encodeURIComponent(filter)}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-900 shadow-sm ring-1 ring-ocean-900/10 hover:ring-coral-500"
          >
            {filter}
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard key={campaign.slug} campaign={campaign} />
        ))}
      </div>
    </section>
  );
}
