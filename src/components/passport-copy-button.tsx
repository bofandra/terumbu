"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type PassportCopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function PassportCopyButton({ value, label = "Copy link", copiedLabel = "Copied", className }: PassportCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ocean-900/12 bg-white px-4 py-2 text-sm font-bold text-ocean-900 transition hover:border-coral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500",
        className
      )}
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      {copied ? copiedLabel : label}
    </button>
  );
}
