"use client";

import Image from "next/image";
import { useState } from "react";

type CampaignBeforeAfterSliderProps = {
  beforeImage: string;
  afterImage: string;
  beforeLabel: string;
  afterLabel: string;
};

export function CampaignBeforeAfterSlider({ beforeImage, afterImage, beforeLabel, afterLabel }: CampaignBeforeAfterSliderProps) {
  const [position, setPosition] = useState(52);

  return (
    <div className="rounded-2xl border border-ocean-900/10 bg-white p-6 shadow-soft">
      <div className="relative h-[360px] overflow-hidden rounded-2xl bg-ocean-900">
        <Image src={afterImage} alt={afterLabel} fill className="object-cover" sizes="(min-width: 1024px) 760px, 100vw" />
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
          <div className="relative h-full" style={{ width: `${10000 / position}%` }}>
            <Image src={beforeImage} alt={beforeLabel} fill className="object-cover grayscale" sizes="(min-width: 1024px) 760px, 100vw" />
          </div>
        </div>
        <div className="absolute inset-y-0 bg-white shadow-soft" style={{ left: `${position}%`, width: 3 }} />
        <div className="absolute left-4 top-4 rounded-full bg-ocean-900/78 px-4 py-2 text-sm font-bold text-white backdrop-blur">
          {beforeLabel}
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-ocean-900 backdrop-blur">
          {afterLabel}
        </div>
      </div>
      <label className="mt-5 grid gap-2 text-sm font-bold text-ocean-900">
        Compare restoration projection
        <input
          type="range"
          min={5}
          max={95}
          value={position}
          className="accent-coral-500"
          onChange={(event) => setPosition(Number(event.target.value))}
        />
      </label>
      <p className="mt-3 text-sm leading-6 text-ocean-900/62">
        Illustrative recovery projection based on the project plan. Completed phases should use actual dated field evidence.
      </p>
    </div>
  );
}
