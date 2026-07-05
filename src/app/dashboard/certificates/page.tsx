import Link from "next/link";
import { FileBadge } from "lucide-react";

import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Certificates"
};

export const dynamic = "force-dynamic";

export default async function DashboardCertificatesPage() {
  const user = await requireUser("/dashboard/certificates");
  const data = await getDashboardData(user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Certificates</p>
        <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Learning credentials</h1>
      </header>

      <section className="mt-6 grid gap-4">
        {data.certificates.map((certificate) => (
          <article key={certificate.certificateNumber} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-full bg-kelp-100 text-kelp-700">
                <FileBadge size={22} aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-normal text-ocean-900">{certificate.courseTitle}</h2>
                <p className="mt-1 text-sm font-semibold text-kelp-700">{certificate.certificateNumber}</p>
                <p className="mt-2 text-sm text-ocean-900/58">
                  Issued {certificate.issuedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
                <Link href={`/certificates/verify/${certificate.publicSlug}`} className="mt-4 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
                  Verify certificate
                </Link>
              </div>
            </div>
          </article>
        ))}
        {data.certificates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-6 shadow-soft">
            <FileBadge size={30} aria-hidden="true" className="text-credential-700" />
            <p className="mt-4 text-xl font-bold text-ocean-900">No verified certificates yet.</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-ocean-900/62">
              Complete an eligible Terumbu Academy course to earn a certificate that can appear in your Impact Passport.
            </p>
            <Link href="/academy" className="mt-4 inline-flex text-sm font-bold text-coral-700 hover:text-coral-500">
              Browse certificate courses
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
