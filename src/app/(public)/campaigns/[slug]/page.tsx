import { notFound } from "next/navigation";
import Image from "next/image";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { suggestedDonationAmounts } from "@/lib/domain";
import { getCampaignDetail } from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaignDetail(slug);

  return {
    title: campaign?.title ?? "Campaign"
  };
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const campaign = await getCampaignDetail(slug);

  if (!campaign) {
    notFound();
  }

  const progress = Math.round((campaign.raised / campaign.goal) * 100);
  const donationAmounts = suggestedDonationAmounts(campaign.goal);

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
            {campaign.imageUrl ? (
              <Image
                src={campaign.imageUrl}
                alt=""
                width={900}
                height={520}
                className="h-72 w-full rounded-xl object-cover"
                sizes="(min-width: 1024px) 42vw, 100vw"
              />
            ) : (
              <div className="flex h-72 w-full items-end rounded-xl bg-white/10 p-5 text-sm font-bold uppercase tracking-[0.14em] text-white/72">
                {campaign.category}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8">
        <div className="space-y-14">
          <SectionHeading title="Campaign story">
            {campaign.story ?? "No campaign story has been published yet."}
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
              <ImpactMapPreview sites={campaign.sites} />
            </div>
          </div>

          <div>
            <SectionHeading title="Field updates">
              Partner teams publish updates as milestones, evidence uploads, and verification reviews are completed.
            </SectionHeading>
            <div className="mt-6 grid gap-4">
              {campaign.updates.map((update) => (
                <article key={update.title} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">
                    {update.publishedAt?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "Draft"}
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-normal text-ocean-900">{update.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-ocean-900/68">{update.body}</p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <SectionHeading title="Evidence records">
              Evidence files are stored with verification status so donors and partners can reconcile claims.
            </SectionHeading>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {campaign.evidence.map((item) => (
                <article key={item.title} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/52">{item.evidenceType}</p>
                  <h2 className="mt-3 font-bold text-ocean-900">{item.title}</h2>
                  <p className="mt-3 text-sm font-semibold text-kelp-700">{item.verificationStatus}</p>
                </article>
              ))}
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
            {donationAmounts.map((amount) => (
              <button key={amount} className="rounded-xl border border-ocean-900/10 px-4 py-3 text-left font-bold text-ocean-900 hover:border-coral-500">
                {formatCurrency(amount)}
              </button>
            ))}
          </div>
          <ButtonLink href={`/checkout/donation?campaign=${campaign.slug}`} className="mt-5 w-full">
            Continue Donation
          </ButtonLink>
        </aside>
      </section>
    </>
  );
}
