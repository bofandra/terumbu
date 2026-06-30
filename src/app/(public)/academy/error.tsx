"use client";

import { RefreshCcw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AcademyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
      <p className="text-sm font-bold uppercase text-coral-700">Academy unavailable</p>
      <h1 className="mt-3 text-3xl font-bold text-ocean-900">We could not load the Academy right now.</h1>
      <p className="mt-4 text-base leading-7 text-ocean-900/62">
        Your course progress is stored safely. Try again or continue from your learning dashboard.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={reset}>
          <RefreshCcw size={18} aria-hidden="true" />
          Try Again
        </Button>
        <Link href="/dashboard/academy" className="inline-flex min-h-11 items-center justify-center rounded-full border border-ocean-900/10 px-5 text-sm font-bold text-ocean-900 hover:bg-ocean-50">
          My Learning
        </Link>
      </div>
    </section>
  );
}
