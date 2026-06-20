import { ImpactMapPreview } from "@/components/impact-map-preview";
import { SectionHeading } from "@/components/section-heading";

export const metadata = {
  title: "Impact Map"
};

export default function ImpactMapPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="Impact Map" title="A national view of verified conservation work">
        This first version uses local product data. The next step is replacing it with PostgreSQL-backed impact sites, evidence, and campaign updates.
      </SectionHeading>
      <div className="mt-10">
        <ImpactMapPreview />
      </div>
    </section>
  );
}

