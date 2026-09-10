"use client";

import { Copy, MessageCircle, Send, Share2 } from "lucide-react";

import { PassportCopyButton } from "@/components/passport-copy-button";
import { cn } from "@/lib/utils";

type PassportShareButtonsProps = {
  url: string;
  title: string;
  text?: string;
  tone?: "light" | "onDark";
};

const toneClasses = {
  light: "border-ocean-900/12 bg-white text-ocean-900 hover:border-coral-500",
  onDark: "border-white/18 bg-white text-ocean-900 hover:bg-sand-50"
};

function shareUrls(url: string, title: string, text: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(`${text} ${url}`.trim());

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}`,
    x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    instagram: "https://www.instagram.com/"
  };
}

export function PassportShareButtons({ url, title, text = "View this verified conservation profile on Terumbu.eco.", tone = "light" }: PassportShareButtonsProps) {
  const urls = shareUrls(url, title, text);
  const linkClassName = cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-500",
    toneClasses[tone]
  );

  async function copyForInstagram() {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
    }

    window.open(urls.instagram, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <PassportCopyButton value={url} label="Share link" tone={tone} mode="share" shareTitle={title} shareText={text} />
      <a href={urls.facebook} target="_blank" rel="noreferrer" className={linkClassName}>
        <Share2 size={16} aria-hidden="true" />
        Facebook
      </a>
      <a href={urls.whatsapp} target="_blank" rel="noreferrer" className={linkClassName}>
        <MessageCircle size={16} aria-hidden="true" />
        WhatsApp
      </a>
      <a href={urls.x} target="_blank" rel="noreferrer" className={linkClassName}>
        <Send size={16} aria-hidden="true" />
        X
      </a>
      <button type="button" onClick={() => void copyForInstagram()} className={linkClassName}>
        <Copy size={16} aria-hidden="true" />
        Instagram
      </button>
    </div>
  );
}
