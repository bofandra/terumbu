"use client";

import { AlertCircle, Check, Copy, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type PassportCopyButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  sharedLabel?: string;
  errorLabel?: string;
  className?: string;
  tone?: "light" | "dark" | "onDark";
  mode?: "copy" | "share";
  shareTitle?: string;
  shareText?: string;
};

const toneClasses = {
  light: "border-ocean-900/12 bg-white text-ocean-900 hover:border-coral-500",
  dark: "border-transparent bg-ocean-900 text-white hover:bg-ocean-700",
  onDark: "border-white/18 bg-white text-ocean-900 hover:bg-sand-50"
};

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function writeToClipboard(value: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "-9999px";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!copied) {
    throw new Error("Copy command was rejected.");
  }
}

export function PassportCopyButton({
  value,
  label = "Copy link",
  copiedLabel = "Copied",
  sharedLabel = "Shared",
  errorLabel = "Try again",
  className,
  tone = "light",
  mode = "copy",
  shareTitle = "Terumbu.eco Impact Passport",
  shareText = "View this verified conservation profile on Terumbu.eco."
}: PassportCopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "error">("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  function resetStatusSoon() {
    if (resetTimer.current) {
      window.clearTimeout(resetTimer.current);
    }

    resetTimer.current = window.setTimeout(() => setStatus("idle"), 1800);
  }

  async function copyValue() {
    try {
      if (mode === "share" && navigator.share) {
        const shareData = {
          title: shareTitle,
          text: shareText,
          url: value
        };

        try {
          if (!navigator.canShare || navigator.canShare(shareData)) {
            await navigator.share(shareData);
            setStatus("shared");
            resetStatusSoon();
            return;
          }
        } catch (error) {
          if (isAbortError(error)) {
            return;
          }
        }
      }

      await writeToClipboard(value);
      setStatus("copied");
      resetStatusSoon();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      setStatus("error");
      resetStatusSoon();
    }
  }

  const Icon = status === "error" ? AlertCircle : status === "idle" && mode === "share" ? Share2 : status === "idle" ? Copy : Check;
  const statusLabel = status === "copied" ? copiedLabel : status === "shared" ? sharedLabel : status === "error" ? errorLabel : label;

  return (
    <button
      type="button"
      onClick={copyValue}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500",
        toneClasses[tone],
        className
      )}
    >
      <Icon size={16} aria-hidden="true" />
      <span aria-live="polite">{statusLabel}</span>
    </button>
  );
}
