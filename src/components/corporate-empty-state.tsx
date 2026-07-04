import { Building2, Handshake } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

export function CorporateEmptyState() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-dashed border-ocean-900/18 bg-white p-8 shadow-soft">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-ocean-50 text-ocean-700">
          <Building2 size={24} aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-coral-700">Corporate workspace</p>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-ocean-900">Welcome to your corporate impact workspace</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ocean-900/62">
          Create your first conservation program or speak with the Terumbu partnership team to design a verified ESG portfolio.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href="/campaigns">Browse Verified Projects</ButtonLink>
          <ButtonLink href="mailto:partnerships@terumbu.eco" tone="secondary">
            <Handshake size={17} aria-hidden="true" />
            Contact Partnership Team
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
