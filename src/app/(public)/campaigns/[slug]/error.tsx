"use client";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";

export default function CampaignDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center px-4 py-16 text-center sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-ocean-900/10 bg-white p-8 shadow-soft">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Campaign unavailable</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">We could not load this campaign</h1>
        <p className="mt-3 text-ocean-900/68">
          Core campaign information may be temporarily unavailable. Try again, or return to verified campaigns.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={reset}>
            Retry
          </Button>
          <ButtonLink href="/campaigns" tone="secondary">
            View Campaigns
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
