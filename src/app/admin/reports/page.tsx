import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getAdminOperationsData } from "@/lib/queries";

export const metadata = {
  title: "Admin Reports"
};

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireRole(["admin"], "/admin/reports");
  const data = await getAdminOperationsData();

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-bold text-coral-700 hover:text-coral-500">Admin overview</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-normal text-ocean-900">Report exports</h1>
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {data.reports.map((report) => (
            <article key={report.exportCode} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
              <h2 className="text-xl font-bold tracking-normal text-ocean-900">{report.exportCode}</h2>
              <p className="mt-1 text-sm text-ocean-900/58">{report.accountName} · {report.programName}</p>
              <p className="mt-4 text-sm font-bold text-kelp-700">{report.status}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
