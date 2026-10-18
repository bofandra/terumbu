"use client";

import { useEffect, useRef, useState } from "react";

import { travelerDraftInputChecks, type TravelerDraftCheck } from "@/lib/traveler-draft-input-checks";

export function PartnerExpeditionLiveDraftCheck() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [checks, setChecks] = useState<TravelerDraftCheck[]>([]);
  const [isReviewRequested, setIsReviewRequested] = useState(false);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;

    const update = () => {
      const input = new FormData(form);
      setChecks(travelerDraftInputChecks(input));
      setIsReviewRequested(input.get("status") === "review");
    };

    update();
    form.addEventListener("input", update);
    form.addEventListener("change", update);

    return () => {
      form.removeEventListener("input", update);
      form.removeEventListener("change", update);
    };
  }, []);

  const missing = checks.filter((check) => !check.ready);

  return (
    <div ref={containerRef} aria-live="polite" className="rounded-lg border border-ocean-900/10 bg-sand-50 p-4 text-sm">
      <p className="font-bold text-ocean-900">
        Live traveler-content check · {checks.length - missing.length} / {checks.length || 9}
      </p>
      <p className="mt-1 leading-5 text-ocean-900/65">
        Updates as you edit. This is a draft-input hint, not approval: the final readiness gate also verifies saved media, destination, campaign and bookable dates.
      </p>
      {missing.length > 0 ? (
        <details open={isReviewRequested} className="mt-3">
          <summary className="cursor-pointer font-semibold text-coral-700">
            {missing.length} traveler information {missing.length === 1 ? "section needs" : "sections need"} attention
          </summary>
          <ul className="mt-2 grid list-disc gap-1 pl-5 text-ocean-900/72 sm:grid-cols-2">
            {missing.map((check) => <li key={check.id}>{check.label}</li>)}
          </ul>
        </details>
      ) : checks.length > 0 ? (
        <p className="mt-2 font-semibold text-kelp-700">Traveler input fields look complete. Save and check the full publication panel above.</p>
      ) : null}
    </div>
  );
}
