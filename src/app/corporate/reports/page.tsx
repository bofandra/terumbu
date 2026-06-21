import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { createCorporateReportExportAction } from "@/lib/corporate-actions";
import { getCorporateDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Corporate Reports"
};

export const dynamic = "force-dynamic";

export default async function CorporateReportsPage() {
  const user = await requireUser("/corporate/reports");
  const data = await getCorporateDashboardData(user.id);

  if (!data) {
    return <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">Corporate program not configured.</main>;
  }

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-ocean-900/10 pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Reports</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">CSR and ESG exports</h1>
        </div>
        <form action={createCorporateReportExportAction}>
          <Button type="submit" tone="secondary">
            <Download size={18} aria-hidden="true" />
            Queue Export
          </Button>
        </form>
      </div>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {data.exports.map((item) => (
          <article key={item.exportCode} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <h2 className="text-xl font-bold tracking-normal text-ocean-900">{item.exportCode}</h2>
            <p className="mt-1 text-sm text-ocean-900/58">{item.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
            <p className="mt-4 text-sm font-bold text-kelp-700">{item.status}</p>
            {item.fileUrl ? <p className="mt-2 text-sm text-coral-700">{item.fileUrl}</p> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
