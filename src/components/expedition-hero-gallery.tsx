"use client";

import { Camera, X } from "lucide-react";
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
  const main = images[0];

  return (
    <>
      <button
        type="button"
        className="group relative h-[340px] w-full overflow-hidden rounded-md bg-ocean-900 text-left disabled:cursor-default sm:h-[430px] lg:h-[480px]"
        onClick={() => main && setOpen(true)}
        disabled={!main}
      >
        {main ? <Image src={main.src} alt={main.caption} fill className="object-cover transition duration-500 group-hover:scale-[1.03]" sizes="(min-width: 1024px) 48vw, 100vw" priority /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/18 via-transparent to-transparent" />
        <span className="absolute bottom-5 right-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-ocean-900 shadow-soft">
          <Camera size={16} aria-hidden="true" />
          {main ? `View all ${images.length} photos` : "Photos not added yet"}
        </span>
        <span className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-ocean-900 shadow-sm">{region}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ocean-950/80 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Expedition photo gallery">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Expedition gallery</p>
                <p className="mt-1 text-sm text-ocean-900/62">Promotional and activity-linked imagery is labeled with provenance.</p>
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
