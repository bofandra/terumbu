"use client";

import { Copy, MessageCircle, Send, Share2, Users } from "lucide-react";
import { useMemo, useState } from "react";

type ExpeditionShareButtonsProps = {
  slug: string;
  title: string;
  referralCode?: string | null;
  compact?: boolean;
};

function buildShareUrl(slug: string, referralCode?: string | null) {
  if (typeof window === "undefined") {
    return `/expeditions/${slug}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""}`;
  }

  const url = new URL(`/expeditions/${slug}`, window.location.origin);

  if (referralCode) {
    url.searchParams.set("ref", referralCode);
  }

  return url.toString();
}

export function ExpeditionShareButtons({ slug, title, referralCode, compact = false }: ExpeditionShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const relativeUrl = useMemo(
    () => `/expeditions/${slug}${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""}`,
    [referralCode, slug]
  );

  async function share() {
    const url = buildShareUrl(slug, referralCode);
    const text = `Join me on ${title} with Terumbu.eco — travel with a verified conservation purpose.`;

    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  async function copyLink() {
    const url = buildShareUrl(slug, referralCode);

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  function whatsappHref() {
    const url = buildShareUrl(slug, referralCode);
    const text = encodeURIComponent(`Join me on ${title} with Terumbu.eco — ${url}`);

    return `https://wa.me/?text=${text}`;
  }

  const buttonClass = compact
    ? "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-ocean-900/12 px-3 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:bg-coral-100"
    : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ocean-900/12 px-4 text-sm font-bold text-ocean-900 hover:border-coral-500 hover:bg-coral-100";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => void share()} className={buttonClass}>
        <Share2 size={16} aria-hidden="true" />
        Share trip
      </button>
      <a href={whatsappHref()} target="_blank" rel="noreferrer" className={buttonClass}>
        <MessageCircle size={16} aria-hidden="true" />
        WhatsApp
      </a>
      <button type="button" onClick={() => void copyLink()} className={buttonClass}>
        {copied ? <Send size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {copied ? "Copied" : "Copy invite link"}
      </button>
      {referralCode ? (
        <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-kelp-100 px-3 text-xs font-bold text-kelp-700" title={relativeUrl}>
          <Users size={14} aria-hidden="true" />
          Referral tracking on
        </span>
      ) : null}
    </div>
  );
}
