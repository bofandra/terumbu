"use client";

import { Camera, Play, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type GalleryImage = {
  src: string;
  label: string;
  caption: string;
  provenance: string;
};

type ExpeditionHeroGalleryProps = {
  images: GalleryImage[];
  region: string;
};

export function ExpeditionHeroGallery({ images, region }: ExpeditionHeroGalleryProps) {
  const [open, setOpen] = useState(false);
  const gallery = images.slice(0, 5);
  const main = gallery[0];

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <button type="button" className="group relative min-h-[420px] overflow-hidden rounded-2xl bg-ocean-900 text-left shadow-soft" onClick={() => setOpen(true)}>
          {main ? <Image src={main.src} alt={main.caption} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 42vw, 100vw" priority /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/58 via-transparent to-transparent" />
          <span className="absolute bottom-5 left-5 rounded-full bg-ocean-900/84 px-4 py-2 text-sm font-bold text-white">{region}</span>
        </button>

        <div className="grid min-h-[420px] grid-cols-2 gap-3">
          {gallery.slice(1, 5).map((item, index) => (
            <button key={`${item.src}-${item.label}`} type="button" className="group relative overflow-hidden rounded-2xl bg-ocean-900 text-left shadow-soft" onClick={() => setOpen(true)}>
              <Image src={item.src} alt={item.caption} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(min-width: 1024px) 18vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/60 via-transparent to-transparent" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ocean-900">{item.label}</span>
              {index === 0 ? (
                <span className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-ocean-900/78 text-white">
                  <Play size={20} aria-hidden="true" />
                </span>
              ) : null}
              {index === 3 ? (
                <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-ocean-900/84 px-4 py-2 text-sm font-bold text-white">
                  <Camera size={16} aria-hidden="true" />
                  View all {images.length} photos
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ocean-950/80 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Expedition photo gallery">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Expedition gallery</p>
                <p className="mt-1 text-sm text-ocean-900/62">Promotional and evidence-linked imagery is labeled with provenance.</p>
              </div>
              <button type="button" className="flex size-10 items-center justify-center rounded-full bg-ocean-50" aria-label="Close gallery" onClick={() => setOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {images.map((item) => (
                <figure key={`${item.src}-${item.caption}`} className="overflow-hidden rounded-2xl border border-ocean-900/10 bg-sand-50">
                  <div className="relative h-72">
                    <Image src={item.src} alt={item.caption} fill className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
                  </div>
                  <figcaption className="p-4">
                    <p className="font-bold text-ocean-900">{item.label}</p>
                    <p className="mt-1 text-sm text-ocean-900/62">{item.caption}</p>
                    <p className="mt-2 text-xs font-semibold text-ocean-900/48">{item.provenance}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
