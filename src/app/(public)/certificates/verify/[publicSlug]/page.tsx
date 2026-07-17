import { Award, BookOpen, CalendarDays, CheckCircle2, Download, ExternalLink, FileBadge, GraduationCap, ShieldCheck, Waves } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CertificatePrintButton } from "@/components/certificate-print-button";
import { ButtonLink } from "@/components/ui/button";
import {
  certificateCredentialName,
  certificateHolderName,
  certificateScore,
  certificateStatusLabel,
  certificateVerificationUrl
} from "@/lib/certificate-verification";
import { getCertificateVerification } from "@/lib/queries";

export const dynamic = "force-dynamic";

const heroImage = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&q=80";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://terumbu.eco";

type CertificateVerification = NonNullable<Awaited<ReturnType<typeof getCertificateVerification>>>;

export async function generateMetadata({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const certificate = await getCertificateVerification(publicSlug);

  return {
    title: certificate ? `${certificate.courseTitle} Certificate Verification` : "Certificate Verification",
    description: certificate
      ? `Verify ${certificateHolderName(certificate)}'s Terumbu.eco certificate for ${certificate.courseTitle}.`
      : "Verify a Terumbu.eco learning certificate."
  };
}

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function shortDate(value: Date) {
  return value.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function certificateMetrics(certificate: CertificateVerification) {
  const score = certificateScore(certificate);

  return [
    {
      label: "Verification status",
      value: certificateStatusLabel(certificate),
      support: "Database-backed credential",
      icon: ShieldCheck
    },
    {
      label: "Issued",
      value: shortDate(certificate.issuedAt),
      support: "Terumbu Academy",
      icon: CalendarDays
    },
    {
      label: "Assessment",
      value: score === null ? "Recorded" : `${score}/100`,
      support: "Final course check",
      icon: CheckCircle2
    },
    {
      label: "Credential",
      value: "Course certificate",
      support: "Learning record",
      icon: FileBadge
    }
  ];
}

export default async function CertificateVerificationPage({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const certificate = await getCertificateVerification(publicSlug);

  if (!certificate) {
    notFound();
  }

  const holderName = certificateHolderName(certificate);
  const credentialName = certificateCredentialName(certificate);
  const verificationUrl = certificateVerificationUrl(certificate.publicSlug, appUrl);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verificationUrl)}`;
  const downloadHref = `/certificates/verify/${certificate.publicSlug}/download`;

  return (
    <main className="bg-sand-50">
      <section
        className="bg-ocean-900 text-white print:bg-white print:text-ocean-900"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(1,31,50,0.95), rgba(1,31,50,0.68), rgba(1,31,50,0.26)), url('${heroImage}')`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
          <div>
            <Link href="/academy" className="print:hidden inline-flex items-center gap-2 text-sm font-bold text-white/76 hover:text-white">
              <BookOpen size={17} aria-hidden="true" />
              Academy
            </Link>
            <p className="mt-8 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-kelp-200 print:text-coral-700">
              <ShieldCheck size={18} aria-hidden="true" />
              Verified Terumbu.eco Certificate
            </p>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-normal sm:text-6xl">{holderName}</h1>
            <p className="mt-4 text-2xl font-bold text-kelp-200 print:text-kelp-700">{credentialName}</p>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/76 print:text-ocean-900/72">
              This public record confirms course completion, issued certificate number, assessment record, and verification URL for a Terumbu Academy credential.
            </p>
            <div className="mt-8 flex flex-wrap gap-2 print:hidden">
              <ButtonLink href={downloadHref} tone="primary" download>
                <Download size={17} aria-hidden="true" />
                Download Certificate
              </ButtonLink>
              <CertificatePrintButton />
            </div>
          </div>

          <aside className="rounded-2xl border border-white/16 bg-ocean-900/72 p-5 backdrop-blur print:border-ocean-900/12 print:bg-white">
            <div className="flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-kelp-400 text-ocean-900">
                <CheckCircle2 size={21} aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold">Verified and shareable</p>
                <p className="mt-1 text-sm text-white/62 print:text-ocean-900/62">Public verification is tied to the certificate slug and certificate number.</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl bg-white p-4 print:hidden">
              <Image src={qrSrc} alt={`QR code for ${certificate.certificateNumber}`} width={160} height={160} className="mx-auto size-40" />
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              <div>
                <dt className="text-white/52 print:text-ocean-900/52">Certificate number</dt>
                <dd className="break-all font-bold">{certificate.certificateNumber}</dd>
              </div>
              <div>
                <dt className="text-white/52 print:text-ocean-900/52">Issued</dt>
                <dd className="font-bold">{formatDate(certificate.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-white/52 print:text-ocean-900/52">Course</dt>
                <dd className="font-bold">{certificate.courseTitle}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {certificateMetrics(certificate).map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.label} className="rounded-2xl border border-ocean-900/10 bg-white p-5 shadow-soft">
                <Icon className="text-coral-500" size={24} aria-hidden="true" />
                <p className="mt-4 text-lg font-bold tracking-normal text-ocean-900">{item.value}</p>
                <h2 className="mt-1 text-sm font-bold text-ocean-900">{item.label}</h2>
                <p className="mt-2 text-xs font-semibold text-ocean-900/56">{item.support}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-14 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Credential details</p>
          <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{certificate.courseTitle}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              ["Learner", holderName],
              ["Certificate number", certificate.certificateNumber],
              ["Issued date", formatDate(certificate.issuedAt)],
              ["Course record", certificate.courseSlug]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-ocean-900/10 bg-sand-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral-700">{label}</p>
                <p className="mt-2 break-words font-bold text-ocean-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-kelp-500/20 bg-kelp-100 p-4">
            <p className="flex items-start gap-3 text-sm font-bold leading-6 text-kelp-700">
              <Award size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
              This certificate verifies a Terumbu Academy learning record. It does not represent professional licensing or field competency certification outside Terumbu.eco.
            </p>
          </div>
        </article>

        <aside className="grid gap-6 lg:content-start">
          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Verification URL</p>
            <p className="mt-3 break-all rounded-xl bg-sand-50 p-3 text-xs font-bold text-ocean-900">{verificationUrl}</p>
            <div className="mt-4 grid gap-2 print:hidden">
              <ButtonLink href={verificationUrl} tone="light" target="_blank">
                <ExternalLink size={17} aria-hidden="true" />
                Open Public Record
              </ButtonLink>
              <ButtonLink href={downloadHref} tone="secondary" download>
                <Download size={17} aria-hidden="true" />
                Download HTML
              </ButtonLink>
            </div>
          </article>

          <article className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Terumbu Academy</p>
            <div className="mt-4 flex items-start gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-ocean-900 text-white">
                <GraduationCap size={21} aria-hidden="true" />
              </span>
              <div>
                <p className="font-bold text-ocean-900">Learning credential</p>
                <p className="mt-1 text-sm leading-6 text-ocean-900/62">Course certificates can be added to an Impact Passport and shared as public-safe learning records.</p>
              </div>
            </div>
            <ButtonLink href={`/academy/courses/${certificate.courseSlug}`} tone="ghost" className="mt-4 px-3">
              <Waves size={17} aria-hidden="true" />
              View Course
            </ButtonLink>
          </article>
        </aside>
      </section>
    </main>
  );
}
