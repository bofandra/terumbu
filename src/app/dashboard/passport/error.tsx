"use client";

import { RotateCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function DashboardPassportError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-coral-500/20 bg-white p-8 text-center shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Passport unavailable</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">We could not load your Impact Passport.</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ocean-900/62">
          Verified records remain safe. Try reloading, or manage visibility while the passport data catches up.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            <RotateCcw size={17} aria-hidden="true" />
            Retry
          </Button>
          <Link href="/dashboard/settings" className="inline-flex min-h-11 items-center rounded-full bg-ocean-900 px-5 text-sm font-semibold text-white">
            Account settings
          </Link>
        </div>
      </section>
    </main>
  );
}
