"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin route error", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl rounded-lg border border-coral-700/20 bg-white p-5 shadow-soft" role="alert">
      <div className="flex gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-coral-100 text-coral-700">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral-700">Admin portal</p>
          <h2 className="mt-1 text-xl font-bold tracking-normal text-ocean-900">This admin view could not be loaded</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-ocean-900/62">
            Retry the current view. If the problem continues, return to the admin overview and use the audit trail or application logs to investigate.
          </p>
          {error.digest ? <p className="mt-2 text-xs font-bold text-ocean-900/48">Reference: {error.digest}</p> : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-ocean-900 px-4 text-sm font-bold text-white transition hover:bg-ocean-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/admin"
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-ocean-900/10 bg-white px-4 text-sm font-bold text-ocean-900 transition hover:border-coral-500 hover:text-coral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kelp-500 focus-visible:ring-offset-2"
        >
          Admin overview
        </Link>
      </div>
    </div>
  );
}
