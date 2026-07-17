"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function CertificateVerificationError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="bg-sand-50 px-4 py-16 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-2xl border border-ocean-900/10 bg-white p-8 text-center shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Certificate Verification</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">We could not load this certificate right now.</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ocean-900/62">
          Retry the verification request or return to Terumbu Academy while the certificate record is checked.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ocean-900 px-5 text-sm font-semibold text-white hover:bg-ocean-700"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Retry
          </button>
          <Link href="/academy" className="inline-flex min-h-11 items-center rounded-full bg-coral-500 px-5 text-sm font-semibold text-white">
            Browse Academy
          </Link>
        </div>
      </section>
    </main>
  );
}
