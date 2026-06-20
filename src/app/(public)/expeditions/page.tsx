import { ExpeditionCard } from "@/components/expedition-card";
import { SectionHeading } from "@/components/section-heading";
import { expeditions } from "@/lib/data";

export const metadata = {
  title: "Expeditions"
};

export default function ExpeditionsPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Explore" title="Conservation expeditions">
        Book field experiences that combine travel, restoration activity, local guides, and Impact Passport records.
      </SectionHeading>
      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        {expeditions.map((expedition) => (
          <ExpeditionCard key={expedition.slug} expedition={expedition} />
        ))}
      </div>
    </section>
  );
}

