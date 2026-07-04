import Link from "next/link";

import { SectionHeading } from "@/components/section-heading";
import { StatStrip } from "@/components/stat-strip";
import { ButtonLink } from "@/components/ui/button";
import { getImpactStats, getPartnerDirectory } from "@/lib/queries";

export const metadata = {
  title: "About"
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [stats, partners] = await Promise.all([getImpactStats(), getPartnerDirectory(8)]);

  return (
    <>
      <section className="bg-ocean-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">About Terumbu.eco</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-normal sm:text-6xl">
            A trusted operating layer for coastal conservation action.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/74">
            Terumbu connects public funding, field expeditions, academy learning, partner evidence, and impact records so every claim can be traced back to real project data.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/campaigns">Fund a Campaign</ButtonLink>
            <ButtonLink href="/impact-map" tone="light">View Impact Map</ButtonLink>
          </div>
        </div>
      </section>

      <StatStrip stats={stats} />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Trust model" title="Evidence, partners, and records move together">
          Campaign progress, site updates, evidence files, donations, expedition bookings, course certificates, and Impact Passport entries stay connected across the platform.
        </SectionHeading>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Partner verification", "Organizations carry verification levels that are shown beside campaign and evidence claims."],
            ["Project evidence", "Evidence records attach to campaigns and impact sites so updates can be reviewed before they become public trust signals."],
            ["Personal records", "User donations, sponsored ecosystems, expeditions, and certificates can become private or public Impact Passport milestones."]
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-ocean-900/68">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {partners.length > 0 ? (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Partner directory" title="Organizations behind the work" />
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {partners.map((partner) => (
                <Link
                  key={partner.slug}
                  href={`/partners/${partner.slug}`}
                  className="rounded-2xl border border-ocean-900/10 bg-sand-50 p-5 shadow-sm transition hover:border-coral-500"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{partner.verification}</p>
                  <h2 className="mt-3 text-lg font-bold tracking-normal text-ocean-900">{partner.name}</h2>
                  <p className="mt-2 text-sm text-ocean-900/60">{partner.type}</p>
                  <p className="mt-4 text-sm font-semibold text-ocean-900">{partner.campaignCount} linked campaigns</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
