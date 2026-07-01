"use client";

import { Camera, CheckCircle2, ImageOff, MapPin, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type CampaignMediaGalleryProps = {
  title: string;
  category: string;
  region: string;
  imageUrl: string | null;
  updatedLabel?: string;
  verificationLabel?: string;
  mediaItems?: Array<{
    src: string;
    caption: string;
    provenance: string;
  }>;
};

export function CampaignMediaGallery({
  title,
  category,
  region,
  imageUrl,
  updatedLabel = "Updated recently",
  verificationLabel = "Verified campaign",
  mediaItems = []
}: CampaignMediaGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const galleryItems = [
    ...(imageUrl ? [{ src: imageUrl, caption: `${title} main campaign image`, provenance: "Campaign media" }] : []),
    ...mediaItems
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.src === item.src) === index);
  const galleryImages = galleryItems.slice(0, 3);

  if (galleryImages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ocean-900/14 bg-white p-8 text-center shadow-soft">
        <ImageOff className="mx-auto text-coral-500" size={30} aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold tracking-normal text-ocean-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-ocean-900/62">
          No campaign, update, or evidence images have been recorded for {category} in {region}.
        </p>
      </div>
    );
  }

  return (
    <div className={galleryImages.length > 1 ? "grid gap-2 md:grid-cols-[1.35fr_0.85fr]" : "grid gap-2"}>
      <div className="relative min-h-[360px] overflow-hidden rounded-2xl bg-ocean-900 shadow-soft">
        <Image
          src={galleryImages[0].src}
          alt={`${title} campaign restoration site`}
          fill
          priority
          unoptimized
          className="object-cover"
          sizes="(min-width: 1024px) 45vw, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/76 via-transparent to-ocean-900/18" />
        <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-kelp-500 px-4 py-2 text-sm font-bold text-white shadow-soft">
          <CheckCircle2 size={17} aria-hidden="true" />
          {verificationLabel}
        </span>
        <div className="absolute bottom-5 left-5 right-5 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-white">
          <span className="inline-flex items-center gap-2">
            <MapPin size={17} aria-hidden="true" />
            {region}
          </span>
          <span>{updatedLabel}</span>
        </div>
      </div>

      {galleryImages.length > 1 ? (
        <div className="grid gap-2">
          {galleryImages.slice(1).map((item) => (
            <div key={item.src} className="relative min-h-44 overflow-hidden rounded-2xl bg-ocean-900">
              <Image
                src={item.src}
                alt={item.caption}
                fill
                unoptimized
                className="object-cover"
                sizes="(min-width: 1024px) 24vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/62 to-transparent" />
              <p className="absolute bottom-4 left-4 right-4 text-sm font-bold text-white">{item.provenance}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-ocean-900 shadow-soft ring-1 ring-ocean-900/10 transition hover:ring-coral-500"
          >
            <Camera size={17} aria-hidden="true" />
            View all {galleryItems.length} images
          </button>
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ocean-900/80 p-4">
          <div className="mx-auto max-w-6xl rounded-2xl bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Campaign gallery</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{title}</h2>
              </div>
              <button type="button" className="flex size-10 items-center justify-center rounded-full hover:bg-ocean-50" aria-label="Close gallery" onClick={() => setIsOpen(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {galleryItems.map((item) => (
                <figure key={item.src} className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-sand-50">
                  <div className="relative h-72">
                    <Image src={item.src} alt={item.caption} fill unoptimized className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
                  </div>
                  <figcaption className="p-4">
                    <p className="font-bold text-ocean-900">{item.caption}</p>
                    <p className="mt-1 text-sm text-ocean-900/58">{item.provenance}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
