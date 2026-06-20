import { notFound } from "next/navigation";
import Image from "next/image";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { campaigns } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

export function generateStaticParams() {
  return campaigns.map((campaign) => ({ slug: campaign.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = campaigns.find((item) => item.slug === slug);

  return {
    title: campaign?.title ?? "Campaign"
  };
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = campaigns.find((item) => item.slug === slug);

  if (!campaign) {
    notFound();
  }

  const progress = Math.round((campaign.raised / campaign.goal) * 100);

  return (
    <>
      <section className="bg-ocean-900 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">{campaign.category}</p>
            <h1 className="mt-4 text-4xl font-bold tracking-normal sm:text-5xl">{campaign.title}</h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-white/76">{campaign.summary}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-white/72">
              <span>{campaign.region}</span>
              <span>{campaign.verification}</span>
              <span>Implemented by {campaign.partner}</span>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/16 bg-white/10 p-3 backdrop-blur">
            <Image
              src={campaign.imageUrl}
              alt=""
              width={900}
              height={520}
              className="h-72 w-full rounded-xl object-cover"
              sizes="(min-width: 1024px) 42vw, 100vw"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="space-y-14">
          <SectionHeading title="Campaign story">
            This campaign funds local restoration teams, field equipment, ecosystem monitoring, and transparent public updates from the project site.
          </SectionHeading>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Impact target", campaign.impact],
              ["Donor community", `${campaign.donors.toLocaleString("id-ID")} supporters`],
              ["Partner", campaign.partner]
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <p className="text-sm font-bold text-ocean-900/56">{label}</p>
                <p className="mt-3 text-xl font-bold tracking-normal text-ocean-900">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <SectionHeading title="Project location and evidence">
              Impact locations will connect campaign funding with before and after photos, field updates, and verification records.
            </SectionHeading>
            <div className="mt-8">
              <ImpactMapPreview />
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft lg:sticky lg:top-28">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Donation progress</p>
          <p className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">{formatCurrency(campaign.raised)}</p>
          <p className="mt-1 text-sm text-ocean-900/62">of {formatCurrency(campaign.goal)} goal</p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-ocean-50">
            <div className="h-full rounded-full bg-coral-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-sand-50 p-3">
              <p className="font-bold text-ocean-900">{progress}%</p>
              <p className="text-ocean-900/58">funded</p>
            </div>
            <div className="rounded-xl bg-sand-50 p-3">
              <p className="font-bold text-ocean-900">{campaign.daysLeft}</p>
              <p className="text-ocean-900/58">days left</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3">
            {[50_000, 100_000, 500_000].map((amount) => (
              <button key={amount} className="rounded-xl border border-ocean-900/10 px-4 py-3 text-left font-bold text-ocean-900 hover:border-coral-500">
                {formatCurrency(amount)}
              </button>
            ))}
          </div>
          <ButtonLink href="/checkout/donation" className="mt-5 w-full">
            Continue Donation
          </ButtonLink>
        </aside>
      </section>
    </>
  );
}
