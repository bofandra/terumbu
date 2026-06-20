import { CampaignCard } from "@/components/campaign-card";
import { SectionHeading } from "@/components/section-heading";
import { campaigns } from "@/lib/data";

export const metadata = {
  title: "Campaigns"
};

export default function CampaignsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Donate" title="Verified conservation campaigns">
        Support coral restoration, mangrove protection, ocean cleanup, and community-led coastal programs.
      </SectionHeading>
      <div className="mt-8 flex flex-wrap gap-2">
        {["All", "Coral", "Mangrove", "Cleanup", "Community"].map((filter) => (
          <button key={filter} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ocean-900 shadow-sm ring-1 ring-ocean-900/10">
            {filter}
          </button>
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

