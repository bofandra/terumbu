import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SectionHeading } from "@/components/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { getCampaignUpdateDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; updateId: string }> }) {
  const { slug, updateId } = await params;
  const update = await getCampaignUpdateDetail(slug, updateId);

  return {
    title: update?.title ?? "Project Update"
  };
}

export default async function CampaignUpdatePage({ params }: { params: Promise<{ slug: string; updateId: string }> }) {
  const { slug, updateId } = await params;
  const update = await getCampaignUpdateDetail(slug, updateId);

  if (!update) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <Link href={`/campaigns/${update.campaignSlug}`} className="text-sm font-bold text-coral-700 hover:text-coral-500">
        Back to campaign
      </Link>
      <SectionHeading eyebrow={update.publishedAt?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "Draft"} title={update.title}>
        {update.campaignTitle} · {update.verification} by {update.partner}
      </SectionHeading>

      {update.imageUrl ? (
        <Image
          src={update.imageUrl}
          alt=""
          width={1100}
          height={620}
          unoptimized
          className="mt-8 h-[420px] w-full rounded-2xl object-cover shadow-soft"
          sizes="(min-width: 1024px) 900px, 100vw"
        />
      ) : null}

      <div className="mt-8 rounded-2xl border border-ocean-900/10 bg-white p-6 text-base leading-8 text-ocean-900/72 shadow-soft">
        {update.body}
      </div>

      <ButtonLink href={`/campaigns/${slug}`} tone="secondary" className="mt-8">
        View Campaign Evidence
      </ButtonLink>
    </article>
  );
}
