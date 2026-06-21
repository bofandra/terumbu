import Link from "next/link";

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
    return <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">Corporate program not configured.</main>;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Evidence center</p>
      <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">{data.metrics.verifiedOutputs} verified outputs</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {data.evidence.map((item) => (
          <Link key={`${item.title}-${item.fileUrl}`} href={item.fileUrl} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft hover:border-coral-500">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ocean-900/52">{item.evidenceType}</p>
            <h2 className="mt-3 font-bold text-ocean-900">{item.title}</h2>
            <p className="mt-3 text-sm font-bold text-kelp-700">{item.verificationStatus}</p>
            <p className="mt-2 text-xs text-ocean-900/52">{item.addedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
