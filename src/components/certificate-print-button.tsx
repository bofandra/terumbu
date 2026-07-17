"use client";

import { Printer } from "lucide-react";

import { cn } from "@/lib/utils";

export function CertificatePrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ocean-900 shadow-soft transition hover:bg-sand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500",
        className
      )}
    >
      <Printer size={17} aria-hidden="true" />
      Print Certificate
    </button>
  );
}
