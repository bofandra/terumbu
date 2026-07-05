import Link from "next/link";
import { Award, BookOpen } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";

export const metadata = {
  title: "Academy"
};

export const dynamic = "force-dynamic";

export default async function DashboardAcademyPage() {
  const user = await requireUser("/dashboard/academy");
  const data = await getDashboardData(user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Academy</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ocean-900">Courses and certificates</h1>
        </div>
        <ButtonLink href="/academy">Browse academy</ButtonLink>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
            <BookOpen size={22} aria-hidden="true" className="text-coral-500" />
            Enrollments
          </h2>
          <div className="mt-5 grid gap-3">
            {data.enrollments.map((enrollment) => (
              <article key={enrollment.courseSlug} className="rounded-xl bg-sand-50 p-4">
                <h3 className="font-bold text-ocean-900">{enrollment.courseTitle}</h3>
                <p className="mt-1 text-sm text-ocean-900/58">{enrollment.status}</p>
                <Link href={`/dashboard/academy/courses/${enrollment.courseSlug}`} className="mt-3 inline-flex text-sm font-bold text-coral-700">
                  Continue course
                </Link>
              </article>
            ))}
            {data.enrollments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">No active courses yet.</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">Start a course to build field-ready conservation knowledge and add learning records to your Impact Passport.</p>
                <Link href="/academy" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                  Browse recommended courses
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-normal text-ocean-900">
            <Award size={22} aria-hidden="true" className="text-coral-500" />
            Certificates
          </h2>
          <div className="mt-5 grid gap-3">
            {data.certificates.map((certificate) => (
              <article key={certificate.certificateNumber} className="rounded-xl border border-kelp-100 bg-kelp-100/40 p-4">
                <h3 className="font-bold text-ocean-900">{certificate.courseTitle}</h3>
                <p className="mt-1 text-sm font-semibold text-kelp-700">{certificate.certificateNumber}</p>
                <p className="mt-1 text-sm text-ocean-900/58">
                  Issued {certificate.issuedAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
              </article>
            ))}
            {data.certificates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ocean-900/14 bg-sand-50 p-4">
                <p className="font-bold text-ocean-900">No verified certificates yet.</p>
                <p className="mt-2 text-sm leading-6 text-ocean-900/62">Complete an eligible Academy course to earn your first credential.</p>
                <Link href="/academy" className="mt-3 inline-flex text-sm font-bold text-coral-700">
                  Find certificate courses
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
