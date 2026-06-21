import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { CampaignCard } from "@/components/campaign-card";
import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { getPartnerProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const partner = await getPartnerProfile(slug);

  return {
    title: partner?.name ?? "Partner"
  };
}

export default async function PartnerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const partner = await getPartnerProfile(slug);

  if (!partner) {
    notFound();
  }

  return (
    <>
      <section className="bg-ocean-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-coral-300">
            <ShieldCheck size={18} aria-hidden="true" />
            {partner.verification}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-normal sm:text-6xl">{partner.name}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-white/74">
            {partner.description ?? `${partner.name} is connected to Terumbu campaigns, evidence records, and public impact reporting.`}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/campaigns">View Campaigns</ButtonLink>
            {partner.websiteUrl ? (
              <ButtonLink href={partner.websiteUrl} tone="light" target="_blank" rel="noreferrer">
                Website
                <ExternalLink size={17} aria-hidden="true" />
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={partner.type} title="Campaigns managed with this partner" />
        {partner.campaigns.length > 0 ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {partner.campaigns.map((campaign) => (
              <CampaignCard key={campaign.slug} campaign={campaign} />
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-2xl border border-ocean-900/10 bg-white p-5 text-sm font-semibold text-ocean-900/62 shadow-soft">
            No campaigns are currently linked to this partner.
          </p>
        )}
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Evidence linked to this partner">
            Evidence records are attached through campaigns so donors and reviewers can trace project claims.
          </SectionHeading>
          {partner.evidence.length > 0 ? (
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {partner.evidence.map((item) => (
                <Link
                  key={`${item.campaignTitle}-${item.title}`}
                  href={item.fileUrl}
                  className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5 transition hover:border-coral-500"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/52">{item.evidenceType}</p>
                  <h2 className="mt-3 font-bold text-ocean-900">{item.title}</h2>
                  <p className="mt-2 text-sm text-ocean-900/58">{item.campaignTitle}</p>
                  <p className="mt-4 text-sm font-bold text-kelp-700">{item.verificationStatus}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-ocean-900/10 bg-sand-50 p-5 text-sm font-semibold text-ocean-900/62">
              No evidence records are currently linked to this partner.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
