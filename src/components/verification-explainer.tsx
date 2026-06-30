"use client";

import { ShieldCheck, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type VerificationExplainerProps = {
  verificationLabel: string;
};

const definitions = [
  ["Organization verification", "Legal profile, responsible contacts, and partner operating details are reviewed before campaign publication."],
  ["Field verification", "Project sites, evidence obligations, and field reporting plans are checked against partner submissions."],
  ["Financial validation", "Funding goals and budget categories are reviewed for campaign-level transparency before checkout."],
  ["Reporting obligations", "Partners are expected to publish milestone updates, evidence records, and completion reporting."]
];

export function VerificationExplainer({ verificationLabel }: VerificationExplainerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button type="button" tone="ghost" className="px-0 text-kelp-700 hover:bg-transparent hover:text-kelp-500" onClick={() => setIsOpen(true)}>
        <ShieldCheck size={17} aria-hidden="true" />
        {verificationLabel}
      </Button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ocean-900/58 p-4">
          <button type="button" className="absolute inset-0 h-full w-full cursor-default" aria-label="Close verification explainer" onClick={() => setIsOpen(false)} />
          <section className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Verification model</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal text-ocean-900">{verificationLabel}</h2>
              </div>
              <button type="button" className="flex size-10 items-center justify-center rounded-full hover:bg-ocean-50" aria-label="Close" onClick={() => setIsOpen(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              {definitions.map(([title, body]) => (
                <div key={title} className="rounded-xl bg-sand-50 p-4">
                  <p className="font-bold text-ocean-900">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-ocean-900/66">{body}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
