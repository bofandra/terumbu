import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { CorporateEmptyState } from "@/components/corporate-empty-state";
import { requireUser } from "@/lib/auth";
import { getCorporateDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Corporate Evidence"
};

export const dynamic = "force-dynamic";

export default async function CorporateEvidencePage() {
  const user = await requireUser("/corporate/evidence");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <CorporateEmptyState />;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Evidence center</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.metrics.verifiedOutputs} verified outputs</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {data.evidence.map((item) => (
          <article key={item.id} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/52">{item.evidenceType}</p>
              <span className="rounded-full bg-ocean-50 px-2 py-1 text-xs font-bold text-ocean-900">{item.stageLabel}</span>
            </div>
            <h2 className="mt-3 font-bold text-ocean-900">{item.title}</h2>
            <p className="mt-3 text-sm font-bold text-kelp-700">{item.verificationStatus}</p>
            <p className="mt-2 text-xs text-ocean-900/52">
              {item.campaignTitle} · {item.siteName ?? item.siteRegion ?? "Program evidence"}
            </p>
            {item.observation ? <p className="mt-3 text-sm leading-6 text-ocean-900/62">{item.observation}</p> : null}
            {item.metricLabel && item.metricValue ? (
              <p className="mt-3 rounded-xl bg-sand-50 px-3 py-2 text-xs font-bold text-ocean-900">
                {item.metricLabel}: {item.metricValue}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={item.sourceHref} className="inline-flex items-center gap-1 text-sm font-bold text-coral-700 hover:text-coral-500">
                Source record
              </Link>
              <Link href={item.fileUrl} className="inline-flex items-center gap-1 text-sm font-bold text-ocean-900/62 hover:text-coral-500">
                File
                <ExternalLink size={14} aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-ocean-900/42">
              {item.evidenceCode} / {item.addedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
