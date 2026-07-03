import Link from "next/link";
import { notFound } from "next/navigation";

import { ImpactMapPreview } from "@/components/impact-map-preview";
import { requireUser } from "@/lib/auth";
import { getSponsoredEcosystemDetail } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SponsoredEcosystemDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const user = await requireUser("/dashboard/corals");
  const { code } = await params;
  const ecosystem = await getSponsoredEcosystemDetail(user.id, code);

  if (!ecosystem) {
    notFound();
  }

  const sites =
    ecosystem.latitude !== null && ecosystem.longitude !== null && ecosystem.siteName
      ? [
          {
            id: ecosystem.code,
            name: ecosystem.siteName,
            type: ecosystem.siteType ?? "Ecosystem",
            region: ecosystem.siteRegion ?? "Region pending",
            campaignSlug: null,
            campaignTitle: ecosystem.campaignTitle,
            progress: ecosystem.progress,
            latitude: ecosystem.latitude,
            longitude: ecosystem.longitude,
            verification: "Linked site",
            evidenceCount: 0,
            verifiedEvidenceCount: 0,
            pendingEvidenceCount: 0,
            latestEvidence: null,
            beforeAfter: null,
            monitoringHistory: [],
            evidence: [],
            latestSurvey: ecosystem.latestSurvey
          }
        ]
      : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/corals" className="text-sm font-bold text-coral-700 hover:text-coral-500">
        Back to corals
      </Link>
      <header className="mt-4 rounded-2xl bg-ocean-900 p-6 text-white shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-300">{ecosystem.code}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl">{ecosystem.label}</h1>
        <p className="mt-3 text-white/70">{ecosystem.campaignTitle}</p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        {[
          ["Status", ecosystem.status],
          ["Fragments", ecosystem.fragments.toLocaleString("id-ID")],
          ["Seedlings", ecosystem.seedlings.toLocaleString("id-ID")],
          ["Progress", `${ecosystem.progress}%`]
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <p className="text-sm font-bold text-ocean-900/56">{label}</p>
            <p className="mt-3 text-2xl font-bold tracking-normal text-ocean-900">{value}</p>
          </div>
        ))}
      </section>

      {sites.length > 0 ? (
        <section className="mt-6">
          <ImpactMapPreview sites={sites} />
        </section>
      ) : null}
    </main>
  );
}
